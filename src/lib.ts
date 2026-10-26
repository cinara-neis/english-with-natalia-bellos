import { validateManifest, type Manifest } from "../shared/content";
export const base = import.meta.env.BASE_URL;
export const localEditing =
  import.meta.env.DEV && !import.meta.env.VITE_ADMIN_API;
export const api = localEditing
  ? "/__local-admin"
  : (import.meta.env.VITE_ADMIN_API || "").replace(/\/$/, "");
export const owner = import.meta.env.VITE_GITHUB_OWNER || "";
export const repo = import.meta.env.VITE_GITHUB_REPO || "";
export const branch = import.meta.env.VITE_GITHUB_BRANCH || "main";
export const repoUrl =
  owner && repo
    ? `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    : "";
export async function loadPublic(): Promise<Manifest> {
  const r = await fetch(`${base}content/manifest.json`, { cache: "no-store" });
  if (!r.ok)
    throw new Error("Materials could not be loaded. Please try again.");
  const m: unknown = await r.json();
  validateManifest(m);
  return m;
}
export async function adminRequest(
  path: string,
  session: string,
  body?: unknown,
) {
  const r = await fetch(`${api}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${session}`,
      ...(localEditing ? { "X-Local-Editor": "1" } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok)
    throw Object.assign(
      new Error(
        data.error || "Could not communicate with the teacher service.",
      ),
      { status: r.status },
    );
  return data;
}
export function login(): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      `${api}/auth/start`,
      "teacher-github",
      "width=620,height=760",
    );
    if (!popup)
      return reject(new Error("Allow the sign-in popup in your browser."));
    const origin = new URL(api).origin;
    const cleanup = () => {
      clearInterval(timer);
      window.removeEventListener("message", listener);
    };
    const listener = (e: MessageEvent) => {
      if (
        e.origin !== origin ||
        e.source !== popup ||
        e.data?.type !== "teacher-session"
      )
        return;
      cleanup();
      popup.close();
      typeof e.data.session === "string"
        ? resolve(e.data.session)
        : reject(new Error("Sign-in not authorised."));
    };
    window.addEventListener("message", listener);
    const started = Date.now();
    const timer = setInterval(() => {
      if (popup.closed || Date.now() - started > 300000) {
        cleanup();
        popup.close();
        reject(new Error("Sign-in cancelled or expired."));
      }
    }, 1000);
  });
}
export async function asBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
