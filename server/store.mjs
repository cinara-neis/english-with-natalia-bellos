import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID, createSign } from "node:crypto";
const locks = new Map();
export async function acquireFileLock(file) {
  const before = locks.get(file) || Promise.resolve();
  let release;
  const next = new Promise((r) => {
    release = r;
  });
  const chain = before.then(() => next);
  locks.set(file, chain);
  await before;
  return () => {
    release();
    if (locks.get(file) === chain) locks.delete(file);
  };
}
export function fileStore(root) {
  const filename = path.resolve(root, "public/content/manifest.json");
  async function safeDirectories() {
    const publicRoot = path.resolve(root, "public");
    if ((await fs.lstat(publicRoot)).isSymbolicLink())
      throw Error("The public directory must not be a symbolic link.");
    if (
      (await fs.realpath(path.join(publicRoot, "content"))) !==
      path.join(await fs.realpath(publicRoot), "content")
    )
      throw Error("Content directory must not be a symbolic link.");
  }
  async function read() {
    return JSON.parse(await fs.readFile(filename, "utf8"));
  }
  return {
    read,
    async saveAppearance(id, appearance) {
      const unlock = await acquireFileLock(filename);
      const temp = filename + "." + randomUUID() + ".tmp";
      try {
        await safeDirectories();
        if ((await fs.lstat(filename)).isSymbolicLink())
          throw Error("The manifest must not be a symbolic link.");
        const m = await read();
        const student = m.students.find((s) => s.id === id);
        if (!student) throw Error("Student not found.");
        student.appearance = appearance;
        await fs.writeFile(temp, JSON.stringify(m, null, 2) + "\n", {
          flag: "wx",
        });
        await fs.rename(temp, filename);
        return appearance;
      } finally {
        await fs.unlink(temp).catch(() => {});
        unlock();
      }
    },
  };
}
export function githubStore(env) {
  let cached;
  const repository = `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}`;
  const branch = env.GITHUB_BRANCH || "main";
  async function installationToken() {
    if (cached && cached.expires > Date.now() + 60000) return cached.token;
    if (
      !env.GITHUB_APP_ID ||
      !env.GITHUB_INSTALLATION_ID ||
      !env.GITHUB_PRIVATE_KEY
    )
      throw Error("GitHub sync is not configured on the community service.");
    const now = Math.floor(Date.now() / 1000),
      head = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
        "base64url",
      ),
      payload = Buffer.from(
        JSON.stringify({
          iat: now - 60,
          exp: now + 540,
          iss: env.GITHUB_APP_ID,
        }),
      ).toString("base64url");
    const data = head + "." + payload;
    const signer = createSign("RSA-SHA256");
    signer.update(data);
    signer.end();
    const jwt =
      data +
      "." +
      signer.sign(env.GITHUB_PRIVATE_KEY.replaceAll("\\n", "\n"), "base64url");
    const r = await fetch(
      `https://api.github.com/app/installations/${encodeURIComponent(env.GITHUB_INSTALLATION_ID)}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + jwt,
          Accept: "application/vnd.github+json",
          "User-Agent": "natalia-student-community",
        },
      },
    );
    if (!r.ok) throw Error("GitHub App access could not be established.");
    const result = await r.json();
    cached = { token: result.token, expires: Date.parse(result.expires_at) };
    return cached.token;
  }
  async function api(method, url, body) {
    const r = await fetch("https://api.github.com" + url, {
      method,
      headers: {
        Authorization: "Bearer " + (await installationToken()),
        Accept: "application/vnd.github+json",
        "User-Agent": "natalia-student-community",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok)
      throw Error(
        r.status === 409 || r.status === 422
          ? "The blog changed while saving. Reload your appearance and try again."
          : "GitHub sync is unavailable. Check the community service configuration.",
      );
    return r.json();
  }
  async function snapshot() {
    const file = await api(
      "GET",
      `${repository}/contents/public/content/manifest.json?ref=${encodeURIComponent(branch)}`,
    );
    return {
      sha: file.sha,
      manifest: JSON.parse(
        Buffer.from(file.content, "base64").toString("utf8"),
      ),
    };
  }
  return {
    async read() {
      return (await snapshot()).manifest;
    },
    async saveAppearance(id, appearance) {
      const { sha, manifest } = await snapshot();
      const student = manifest.students.find((s) => s.id === id);
      if (!student) throw Error("Student not found.");
      student.appearance = appearance;
      const content = JSON.stringify(manifest, null, 2) + "\n";
      if (Buffer.byteLength(content) > 700000)
        throw Error("Blog content is too large.");
      await api("PUT", repository + "/contents/public/content/manifest.json", {
        branch,
        sha,
        message: "content: update student appearance",
        content: Buffer.from(content).toString("base64"),
      });
      return appearance;
    },
  };
}
