import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createCommunity, accountLoader } from "./community.mjs";
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
const hub = createCommunity({
  store: githubStore(process.env),
  accounts: accountLoader(root, process.env),
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
