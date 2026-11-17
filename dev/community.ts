import type { Plugin } from "vite";
import { createCommunity } from "../server/community.mjs";
import { localRankings } from "../server/rankingStore.mjs";
import { localStudentAccounts } from "../server/studentAccounts.mjs";
import { fileStore } from "../server/store.mjs";
import { localLevelsKey } from "../server/levelsKey.mjs";
import { localStudentFiles } from "../server/studentFiles.mjs";
export function community(): Plugin {
  return {
    name: "student-community",
    apply: "serve",
    configureServer(server) {
      const studentAccounts = localStudentAccounts(server.config.root);
      const hub = createCommunity({
        store: fileStore(server.config.root),
        accounts: studentAccounts.read,
        studentAccounts,
        rankings: localRankings(server.config.root),
        studentFiles: localStudentFiles(server.config.root),
        levelsKey: () => localLevelsKey(server.config.root),
        allowedOrigin: (origin, req) => {
          const host = req.headers.host || "";
          return (
            ["localhost", "127.0.0.1"].includes(host.split(":")[0]) &&
            origin === `http://${host}` &&
            ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
              req.socket.remoteAddress || "",
            )
          );
        },
      });
      server.middlewares.use((req, res, next) => {
        try {
          if (
            decodeURIComponent(req.url || "")
              .replaceAll("\\", "/")
              .includes(".student-auth")
          ) {
            res.statusCode = 404;
            res.end("Not found");
            return;
          }
        } catch {
          res.statusCode = 400;
          res.end("Bad request");
          return;
        }
        next();
      });
      // Keep the prefix on req.url so the same API works in development and hosting.
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/__community/")) void hub.handleHttp(req, res);
        else next();
      });
      server.httpServer?.on("upgrade", (req, socket, head) => {
        hub.upgrade(req, socket, head);
      });
      server.httpServer?.once("close", () => hub.close());
    },
  };
}
