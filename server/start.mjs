import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createCommunity } from "./community.mjs";
import { githubStore } from "./store.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origins = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
if (!origins.size) {
  console.error("Configure ALLOWED_ORIGINS with the exact public blog origin.");
  process.exit(1);
}
const store = githubStore(process.env);
const hub = createCommunity({
  store,
  studentFiles: store.studentFiles,
  teacherAccess: async (req) => {
    const endpoint = process.env.TEACHER_ADMIN_API;
    const authorization = req.headers.authorization;
    if (!endpoint || !authorization?.startsWith("Bearer ")) return false;
    const url = new URL("/teacher-session", endpoint);
    if (url.protocol !== "https:") return false;
    const response = await fetch(url, {
      headers: { Authorization: authorization, Origin: req.headers.origin },
      redirect: "error",
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
      await response.body?.cancel();
      return false;
    }
    return (await response.json()).teacherSession === true;
  },
  accounts: store.studentAccounts?.read || (async () => ({})),
  studentAccounts: store.studentAccounts,
  levelsKey: async () => process.env.STUDENT_LEVELS_KEY,
  allowedOrigin: (origin) => origins.has(origin),
});
const server = createServer((req, res) => {
  if (req.url?.startsWith("/__community/")) void hub.handleHttp(req, res);
  else {
    res.statusCode = 404;
    res.end("Not found");
  }
});
server.on("upgrade", (req, socket, head) => {
  if (!hub.upgrade(req, socket, head)) socket.destroy();
});
server.listen(Number(process.env.PORT || 8788), "0.0.0.0", () =>
  console.log("Student community service ready. No database is used."),
);
process.on("SIGTERM", () => {
  hub.close();
  server.close();
});
