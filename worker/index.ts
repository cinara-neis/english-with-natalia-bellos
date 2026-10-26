import {
  MAX_FILE,
  uploadPath,
  validateManifest,
  type Manifest,
} from "../shared/content";
export interface Env {
  FRONTEND_URL: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ALLOWED_LOGIN: string;
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
async function seal(value: Session | State, env: Env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode("teacher-admin-v1") },
    await key(env),
    enc.encode(JSON.stringify(value)),
  );
  return b64(iv) + "." + b64(new Uint8Array(encrypted));
}
async function open(s: string, env: Env): Promise<Session | State> {
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
      "Invalid or expired session. Sign in with GitHub again.",
    );
  }
}
function root(env: Env) {
  return `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}`;
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
async function limitedJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Empty request.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 15 * 1024 * 1024) {
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
    content: JSON.stringify(input.manifest, null, 2) + "\n",
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
      if (url.pathname === "/content" && request.method === "GET") {
        const token = await auth(request, env);
        const { head, manifest } = await snapshot(token, env);
        return Response.json({ head, manifest }, { headers: cors });
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
