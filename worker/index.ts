import {
  MAX_FILE,
  uploadPath,
  validateManifest,
  type Manifest,
} from "../shared/content";
import { protectLevels, revealLevels } from "../shared/privateLevels.mjs";
export interface Env {
  FRONTEND_URL: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  STUDENT_LEVELS_KEY?: string;
  ALLOWED_LOGIN: string;
  TEACHER_EMAIL?: string;
  TEACHER_PASSWORD_HASH?: string;
  TEACHER_LOGIN_LIMIT?: { limit(input: { key: string }): Promise<{ success: boolean }> };
  GITHUB_APP_ID?: string;
  GITHUB_INSTALLATION_ID?: string;
  GITHUB_PRIVATE_KEY?: string;
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
type Session = { type: "session"; token: string; exp: number };
type PasswordSession = { type: "teacher-password"; version: string; exp: number };
type State = { type: "state"; nonce: string; verifier: string; exp: number };
const enc = new TextEncoder();
const dec = new TextDecoder();
function b64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
function unb64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function url64(bytes: Uint8Array) {
  return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function key(env: Env) {
  const bytes = unb64(env.SESSION_SECRET);
  if (bytes.length !== 32) throw Error("Invalid key");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
async function seal(value: Session | State | PasswordSession, env: Env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode("teacher-admin-v1") },
    await key(env),
    enc.encode(JSON.stringify(value)),
  );
  return b64(iv) + "." + b64(new Uint8Array(encrypted));
}
async function open(s: string, env: Env): Promise<Session | State | PasswordSession> {
  try {
    const [iv, data, ...rest] = s.split(".");
    if (rest.length) throw Error();
    const value = JSON.parse(
      dec.decode(
        await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: unb64(iv),
            additionalData: enc.encode("teacher-admin-v1"),
          },
          await key(env),
          unb64(data),
        ),
      ),
    );
    if (!value.exp || value.exp < Date.now()) throw Error();
    return value;
  } catch {
    throw new HttpError(
      401,
      "Invalid or expired session. Sign in again.",
    );
  }
}
function root(env: Env) {
  return `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}`;
}
const passwordMode = (env: Env) => !!env.TEACHER_EMAIL;
const passwordVersion = (env: Env) => env.TEACHER_EMAIL?.trim().toLowerCase() + ":" + env.TEACHER_PASSWORD_HASH;
function der(tag: number, data: Uint8Array) {
  const size = data.length;
  return new Uint8Array([tag, ...(size < 128 ? [size] : size < 256 ? [0x81, size] : [0x82, size >> 8, size & 255]), ...data]);
}
async function installationToken(env: Env) {
  const pem = env.GITHUB_PRIVATE_KEY?.replaceAll("\\n", "\n");
  if (!pem || !env.GITHUB_APP_ID || !env.GITHUB_INSTALLATION_ID) throw new HttpError(503, "Teacher publishing is not configured.");
  let bytes = unb64(pem.replace(/-----[^-]+-----|\s/g, ""));
  if (pem.includes("BEGIN RSA PRIVATE KEY")) {
    bytes = der(0x30, new Uint8Array([0x02, 0x01, 0, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0, ...der(0x04, bytes)]));
  }
  const signingKey = await crypto.subtle.importKey("pkcs8", bytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const data = url64(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))) + "." +
    url64(enc.encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: env.GITHUB_APP_ID })));
  const signature = url64(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signingKey, enc.encode(data))));
  const response = await gh(`/app/installations/${encodeURIComponent(env.GITHUB_INSTALLATION_ID)}/access_tokens`, data + "." + signature, "POST", {
    repositories: [env.GITHUB_REPO], permissions: { contents: "write" },
  });
  if (typeof response.token !== "string") throw new HttpError(503, "Teacher publishing is not configured.");
  return response.token as string;
}
async function gh(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
): Promise<any> {
  const response = await fetch("https://api.github.com" + path, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "english-teacher-admin",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new HttpError(
        401,
        "GitHub authorisation expired or revoked. Sign in again.",
      );
    if (response.status === 409 || response.status === 422)
      throw new HttpError(
        409,
        "The repository changed or rejected the publication. Copy your draft and sign in again to load the current version.",
      );
    if (response.status === 403 || response.status === 429)
      throw new HttpError(
        403,
        "GitHub rejected the operation. Check App permissions, branch protection and API limits.",
      );
    throw new HttpError(
      502,
      "GitHub is unavailable or the repository is inaccessible. Check the configuration.",
    );
  }
  return response.json();
}
async function identify(token: string, env: Env) {
  const user = await gh("/user", token);
  if (user.login.toLowerCase() !== env.ALLOWED_LOGIN.toLowerCase())
    throw new HttpError(
      403,
      "This account is not authorised to manage the blog.",
    );
  const r = await gh(root(env), token);
  if (r.private || !r.permissions?.push)
    throw new HttpError(
      403,
      "Use a public repository with write access for this account and App.",
    );
}
async function auth(request: Request, env: Env) {
  const value = await open(
    (request.headers.get("Authorization") || "").replace(/^Bearer /, ""),
    env,
  );
  if (passwordMode(env)) {
    if (value.type !== "teacher-password" || value.version !== passwordVersion(env))
      throw new HttpError(401, "Sign in again.");
    return installationToken(env);
  }
  if (value.type !== "session")
    throw new HttpError(401, "Sign in with GitHub.");
  await identify(value.token, env);
  return value.token;
}
async function snapshot(token: string, env: Env) {
  const r = root(env);
  const ref = await gh(
    `${r}/git/ref/heads/${encodeURIComponent(env.GITHUB_BRANCH)}`,
    token,
  );
  const head = ref.object.sha;
  const commit = await gh(`${r}/git/commits/${head}`, token);
  const file = await gh(
    `${r}/contents/public/content/manifest.json?ref=${head}`,
    token,
  );
  const manifest: unknown = JSON.parse(
    dec.decode(unb64(file.content.replace(/\s/g, ""))),
  );
  validateManifest(manifest);
  return { head, tree: commit.tree.sha, manifest };
}
const paths = (m: Manifest) =>
  new Set(
    m.students.flatMap((s) =>
      s.materials.flatMap((a) => (a.path ? [a.path] : [])),
    ),
  );
export function verifyFile(path: string, content: string) {
  if (
    !uploadPath.test(path) ||
    typeof content !== "string" ||
    content.length > Math.ceil(MAX_FILE / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(content)
  )
    throw new HttpError(400, "Invalid upload or file larger than 2 MiB.");
  let bytes: Uint8Array;
  try {
    bytes = unb64(content);
  } catch {
    throw new HttpError(400, "Invalid file.");
  }
  if (!bytes.length || bytes.length > MAX_FILE)
    throw new HttpError(400, "The file is empty or larger than 2 MiB.");
  const starts = (signature: number[]) =>
    signature.every((n, i) => bytes[i] === n);
  const ext = path.split(".").pop();
  const valid =
    ext === "pdf"
      ? dec.decode(bytes.subarray(0, 5)) === "%PDF-"
      : ext === "docx"
        ? starts([0x50, 0x4b, 0x03, 0x04])
        : ext === "doc"
          ? starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
          : ext === "png"
            ? starts([137, 80, 78, 71, 13, 10, 26, 10])
            : ext === "jpg" || ext === "jpeg"
              ? starts([255, 216, 255])
              : ext === "webp"
                ? dec.decode(bytes.subarray(0, 4)) === "RIFF" &&
                  dec.decode(bytes.subarray(8, 12)) === "WEBP"
                : false;
  if (!valid)
    throw new HttpError(400, "The file content does not match its extension.");
}
async function limitedJson(request: Request, limit = 15 * 1024 * 1024) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Empty request.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new HttpError(
        413,
        "The publication is too large. Upload fewer files.",
      );
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(dec.decode(all));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
async function publish(request: Request, token: string, env: Env) {
  const input = await limitedJson(request);
  try {
    validateManifest(input.manifest);
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
  if (!Array.isArray(input.uploads) || input.uploads.length > 5)
    throw new HttpError(400, "Upload no more than 5 files per publication.");
  if (enc.encode(JSON.stringify(input.manifest)).length > 700000)
    throw new HttpError(400, "The manifest exceeds 700 KB. Shorten the texts.");
  const current = await snapshot(token, env);
  if (input.head !== current.head)
    throw new HttpError(
      409,
      "There are new changes on GitHub. Copy your draft and sign in again before publishing.",
    );
  await revealLevels(current.manifest, env.STUDENT_LEVELS_KEY);
  const publicManifest = await protectLevels(input.manifest, env.STUDENT_LEVELS_KEY);
  const old = paths(current.manifest),
    next = paths(input.manifest);
  const uploaded = new Set<string>();
  for (const u of input.uploads) {
    if (!u || typeof u.path !== "string" || typeof u.content !== "string")
      throw new HttpError(400, "Invalid upload.");
    verifyFile(u.path, u.content);
    if (uploaded.has(u.path) || old.has(u.path) || !next.has(u.path))
      throw new HttpError(
        400,
        "Duplicate file or missing reference in the manifest.",
      );
    uploaded.add(u.path);
  }
  for (const p of next)
    if (!old.has(p) && !uploaded.has(p))
      throw new HttpError(
        400,
        "A new file is referenced without a corresponding upload.",
      );
  const r = root(env);
  const tree: Array<{
    path: string;
    mode: string;
    type: string;
    sha?: string | null;
    content?: string;
  }> = [];
  for (const u of input.uploads) {
    const blob = await gh(`${r}/git/blobs`, token, "POST", {
      content: u.content,
      encoding: "base64",
    });
    tree.push({
      path: "public/" + u.path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }
  for (const p of old)
    if (!next.has(p))
      tree.push({
        path: "public/" + p,
        mode: "100644",
        type: "blob",
        sha: null,
      });
  tree.push({
    path: "public/content/manifest.json",
    mode: "100644",
    type: "blob",
    content: JSON.stringify(publicManifest, null, 2) + "\n",
  });
  const newTree = await gh(`${r}/git/trees`, token, "POST", {
    base_tree: current.tree,
    tree,
  });
  const commit = await gh(`${r}/git/commits`, token, "POST", {
    message: "content: update student materials",
    tree: newTree.sha,
    parents: [current.head],
  });
  // Sem force: se alguém publicou enquanto criávamos o commit, o GitHub recusa o avanço.
  await gh(
    `${r}/git/refs/heads/${encodeURIComponent(env.GITHUB_BRANCH)}`,
    token,
    "PATCH",
    { sha: commit.sha, force: false },
  );
  return {
    head: commit.sha,
    commit: `https://github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/commit/${commit.sha}`,
  };
}
function cookie(value: string, max = 600) {
  return `teacher_oauth=${encodeURIComponent(value)}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${max}`;
}
function html(message: string, headers: Record<string, string> = {}) {
  return new Response(message, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = new URL(env.FRONTEND_URL).origin;
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      Vary: "Origin",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    try {
      if (passwordMode(env) && url.pathname.startsWith("/auth/"))
        throw new HttpError(404, "Use email and password on the blog.");
      if (url.pathname === "/auth/start" && request.method === "GET") {
        const nonce = url64(crypto.getRandomValues(new Uint8Array(32))),
          verifier = url64(crypto.getRandomValues(new Uint8Array(32)));
        const challenge = url64(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", enc.encode(verifier)),
          ),
        );
        const state = await seal(
          { type: "state", nonce, verifier, exp: Date.now() + 600000 },
          env,
        );
        const target = new URL("https://github.com/login/oauth/authorize");
        target.search = new URLSearchParams({
          client_id: env.GITHUB_CLIENT_ID,
          redirect_uri: url.origin + "/auth/callback",
          state: nonce,
          code_challenge: challenge,
          code_challenge_method: "S256",
        }).toString();
        return new Response(null, {
          status: 302,
          headers: {
            Location: target.toString(),
            "Set-Cookie": cookie(state),
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
      }
      if (url.pathname === "/auth/callback" && request.method === "GET") {
        const c = request.headers
          .get("Cookie")
          ?.split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith("teacher_oauth="));
        if (!c)
          throw new HttpError(
            401,
            "Sign-in expired. Close this window and try again.",
          );
        const state = await open(
          decodeURIComponent(c.slice("teacher_oauth=".length)),
          env,
        );
        if (
          state.type !== "state" ||
          url.searchParams.get("state") !== state.nonce ||
          !url.searchParams.get("code")
        )
          throw new HttpError(401, "Sign-in cancelled or invalid state.");
        const response = await fetch(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              client_id: env.GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET,
              code: url.searchParams.get("code"),
              redirect_uri: url.origin + "/auth/callback",
              code_verifier: state.verifier,
            }),
          },
        );
        const result = (await response.json()) as {
          access_token?: string;
          expires_in?: number;
        };
        if (!response.ok || !result.access_token)
          throw new HttpError(401, "GitHub did not authorise sign-in.");
        await identify(result.access_token, env);
        const session = await seal(
          {
            type: "session",
            token: result.access_token,
            exp: Date.now() + Math.min(3600, result.expires_in || 3600) * 1000,
          },
          env,
        );
        const nonce = url64(crypto.getRandomValues(new Uint8Array(16)));
        return html(
          `<!doctype html><html lang="en"><meta charset="utf-8"><title>Sign-in complete</title><p>Sign-in complete. You may close this window.</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage({type:'teacher-session',session:${JSON.stringify(session)}},${JSON.stringify(origin)});window.close();}</script></html>`,
          {
            "Set-Cookie": cookie("", 0),
            "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,
          },
        );
      }
      if (request.headers.get("Origin") !== origin)
        throw new HttpError(403, "Origin not authorised.");
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers: cors });
      if (url.pathname === "/status" && request.method === "GET") {
        return Response.json({ mode: passwordMode(env) ? "password" : "github" }, { headers: cors });
      }
      if (url.pathname === "/login" && request.method === "POST" && passwordMode(env)) {
        if (!env.TEACHER_LOGIN_LIMIT || !/^[a-f0-9]{64}$/.test(env.TEACHER_PASSWORD_HASH || ""))
          throw new HttpError(503, "Teacher sign-in is not configured.");
        const { success } = await env.TEACHER_LOGIN_LIMIT.limit({ key: request.headers.get("CF-Connecting-IP") || "unknown" });
        if (!success) throw new HttpError(429, "Too many attempts. Try again in a minute.");
        const body = await limitedJson(request, 2048);
        const password = typeof body?.password === "string" ? body.password : "";
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        if (!/^[A-Za-z0-9_-]{32}$/.test(password)) throw new HttpError(401, "Incorrect email or password.");
        const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(password)));
        const expected = Uint8Array.from(env.TEACHER_PASSWORD_HASH!.match(/../g)!, hex => parseInt(hex, 16));
        let diff = 0;
        for (let i = 0; i < digest.length; i++) diff |= digest[i] ^ expected[i];
        if (diff || email !== env.TEACHER_EMAIL!.trim().toLowerCase()) throw new HttpError(401, "Incorrect email or password.");
        const session = await seal({ type: "teacher-password", version: passwordVersion(env), exp: Date.now() + 3600000 }, env);
        return Response.json({ session }, { headers: cors });
      }
      if (url.pathname === "/teacher-session" && request.method === "GET") {
        await auth(request, env);
        return Response.json({ teacherSession: true }, { headers: cors });
      }
      if (url.pathname === "/content" && request.method === "GET") {
        const token = await auth(request, env);
        const { head, manifest } = await snapshot(token, env);
        return Response.json({ head, manifest: await revealLevels(manifest, env.STUDENT_LEVELS_KEY) }, { headers: cors });
      }
      if (url.pathname === "/publish" && request.method === "POST") {
        if (
          !request.headers.get("Content-Type")?.startsWith("application/json")
        )
          throw new HttpError(415, "Use JSON.");
        const token = await auth(request, env);
        return Response.json(await publish(request, token, env), {
          headers: cors,
        });
      }
      throw new HttpError(404, "Route not found.");
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message =
        e instanceof HttpError
          ? e.message
          : "Service error. Check the configuration and try again.";
      if (url.pathname.startsWith("/auth/"))
        return html(
          `<!doctype html><html lang="en"><meta charset="utf-8"><title>Sign-in unsuccessful</title><p>${message.replace(/[<>&]/g, "")}</p><p>Close this window and try again on the blog.</p></html>`,
          {
            "Set-Cookie": cookie("", 0),
            "Content-Security-Policy":
              "default-src 'none'; frame-ancestors 'none'",
          },
        );
      return Response.json({ error: message }, { status, headers: cors });
    }
  },
};
