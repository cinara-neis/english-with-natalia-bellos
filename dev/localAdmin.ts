import type { Plugin } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { validateManifest, type Manifest } from "../shared/content";
import { verifyFile } from "../worker/index";
import { localAuth } from "./localAuth";
import { acquireFileLock } from "../server/store.mjs";
import { setPassword } from "../server/passwords.mjs";

const revision = (s: string) => createHash("sha256").update(s).digest("hex");
const paths = (m: Manifest) =>
  new Set(
    m.students.flatMap((s) =>
      s.materials.flatMap((a) => (a.path ? [a.path] : [])),
    ),
  );
export function localAdmin(): Plugin {
  let saving = false;
  return {
    name: "local-teacher-admin",
    apply: "serve",
    configureServer(server) {
      const auth = localAuth(server.config.root);
      server.middlewares.use((req, res, next) => {
        try {
          if (
            decodeURIComponent(req.url || "")
              .replaceAll("\\", "/")
              .includes(".local-admin")
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
      // Never install this API in a production build or the public preview server.
      const publicDir = path.resolve(server.config.root, "public");
      const manifestPath = path.join(publicDir, "content/manifest.json");
      server.middlewares.use("/__local-admin", async (req, res, next) => {
        if (
          !["/content", "/publish", "/status", "/login", "/logout", "/student-password", "/teacher-password"].includes(
            req.url?.split("?")[0] || "",
          )
        )
          return next();
        const reply = (status: number, data: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(data));
        };
        let ownsLock = false;
        let unlock: (() => void) | undefined;
        try {
          const host = req.headers.host || "";
          const hostName = host.split(":")[0];
          const remote = req.socket.remoteAddress;
          if (
            !["localhost", "127.0.0.1"].includes(hostName) ||
            !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote || "")
          )
            return reply(403, {
              error: "Local editing is available only on this computer.",
            });
          if (
            req.headers["x-local-editor"] !== "1" ||
            (req.headers.origin && req.headers.origin !== `http://${host}`) ||
            req.headers["sec-fetch-site"] === "cross-site"
          )
            return reply(403, {
              error: "Local editor request not authorised.",
            });
          // Fixed directories, no user-supplied filesystem paths or symlink escapes.
          if (req.method === "GET" && req.url === "/status")
            return reply(200, { configured: await auth.configured() });
          if (req.method === "POST" && req.url === "/login") {
            if (
              req.headers.origin !== `http://${host}` ||
              !req.headers["content-type"]?.startsWith("application/json")
            )
              return reply(403, {
                error: "Use teacher sign-in on the same origin.",
              });
            let bytes = 0;
            const pieces: Buffer[] = [];
            for await (const piece of req) {
              bytes += piece.length;
              if (bytes > 2048)
                return reply(413, { error: "Sign-in request too large." });
              pieces.push(Buffer.from(piece));
            }
            const result = await auth.login(
              JSON.parse(Buffer.concat(pieces).toString("utf8")).password,
            );
            return reply(result.status, result);
          }
          if (!(await auth.authorised(req.headers.authorization)))
            return reply(401, {
              error:
                "Teacher sign-in is required. Your session may have expired.",
            });
          if (req.method === "POST" && req.url === "/logout") {
            if (req.headers.origin !== `http://${host}`)
              return reply(403, { error: "Origin not authorised." });
            auth.logout(req.headers.authorization);
            return reply(200, { ok: true });
          }
          if (req.method === "POST" && ["/student-password", "/teacher-password"].includes(req.url || "")) {
            if (req.headers.origin !== `http://${host}` || !req.headers["content-type"]?.startsWith("application/json")) return reply(403, { error: "Origin not authorised." });
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of req) { size += chunk.length; if (size > 4096) return reply(413, { error: "Request too large." }); chunks.push(Buffer.from(chunk)); }
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (req.url === "/teacher-password") {
              const verified = await auth.login(body.currentPassword);
              if (verified.status !== 200) return reply(verified.status, { error: verified.error });
              auth.logout("Bearer " + verified.session);
            }
            await setPassword(server.config.root, req.url === "/teacher-password" ? null : body.studentId, body.password);
            return reply(200, { ok: true });
          }
          if ((await fs.lstat(publicDir)).isSymbolicLink())
            throw Error("The public directory must not be a symbolic link.");
          for (const dir of ["content", "content/uploads"]) {
            const expected = path.join(publicDir, dir);
            if (
              (await fs.realpath(expected)) !==
              (await fs.realpath(publicDir).then((p) => path.join(p, dir)))
            )
              throw Error(
                "Local content directories must not be symbolic links.",
              );
          }
          if ((await fs.lstat(manifestPath)).isSymbolicLink())
            throw Error("The manifest must not be a symbolic link.");
          if (req.method === "GET" && req.url === "/content") {
            const raw = await fs.readFile(manifestPath, "utf8");
            const manifest = JSON.parse(raw);
            validateManifest(manifest);
            return reply(200, { head: revision(raw), manifest });
          }
          if (req.method !== "POST" || req.url !== "/publish")
            return reply(405, { error: "Method not allowed." });
          if (
            req.headers.origin !== `http://${host}` ||
            !req.headers["content-type"]?.startsWith("application/json")
          )
            return reply(403, {
              error: "Use the local editor on the same origin.",
            });
          if (saving)
            return reply(409, {
              error: "Another save is in progress. Try again.",
            });
          saving = true;
          ownsLock = true;
          let size = 0;
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 15 * 1024 * 1024)
              return reply(413, {
                error: "Upload too large. Send fewer files.",
              });
            chunks.push(Buffer.from(chunk));
          }
          const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          validateManifest(input.manifest);
          if (Buffer.byteLength(JSON.stringify(input.manifest)) > 700000)
            throw Error("The manifest exceeds 700 KB.");
          if (!Array.isArray(input.uploads) || input.uploads.length > 5)
            throw Error("Upload up to 5 files per save.");
          unlock = await acquireFileLock(manifestPath);
          const raw = await fs.readFile(manifestPath, "utf8");
          const previous = JSON.parse(raw);
          validateManifest(previous);
          if (input.head !== revision(raw))
            return reply(409, {
              error:
                "The local files changed. Reload the editor before saving. Copy unsaved texts first.",
            });
          const old = paths(previous),
            current = paths(input.manifest);
          const added = new Set<string>();
          for (const u of input.uploads) {
            if (
              !u ||
              typeof u.path !== "string" ||
              typeof u.content !== "string"
            )
              throw Error("Invalid upload.");
            verifyFile(u.path, u.content);
            if (added.has(u.path) || old.has(u.path) || !current.has(u.path))
              throw Error("Duplicate file or missing material reference.");
            added.add(u.path);
            // Exclusive creation below prevents replacement of any existing local file.
          }
          for (const p of current)
            if (!old.has(p) && !added.has(p))
              throw Error("A new material is missing its uploaded file.");
          const saved: string[] = [];
          const nextRaw = JSON.stringify(input.manifest, null, 2) + "\n";
          const temporary = manifestPath + "." + randomUUID() + ".tmp";
          try {
            for (const u of input.uploads) {
              const target = path.join(publicDir, u.path);
              await fs.writeFile(target, Buffer.from(u.content, "base64"), {
                flag: "wx",
              });
              saved.push(target);
            }
            await fs.writeFile(temporary, nextRaw, { flag: "wx" });
            // Detect edits made in a code editor while the upload was being written.
            if ((await fs.readFile(manifestPath, "utf8")) !== raw)
              throw Error(
                "The local manifest changed during saving. Reload before trying again.",
              );
            await fs.rename(temporary, manifestPath);
          } catch (e) {
            await fs.unlink(temporary).catch(() => {});
            for (const file of saved) await fs.unlink(file).catch(() => {});
            throw e;
          }
          let retained = 0;
          for (const p of old)
            if (!current.has(p))
              try {
                const file = path.join(publicDir, p);
                if ((await fs.lstat(file)).isSymbolicLink()) throw Error();
                await fs.unlink(file);
              } catch {
                retained++;
              }
          // Prevent a full page reload from discarding an in-progress editor session.
          return reply(200, { head: revision(nextRaw), commit: "", retained });
        } catch (e) {
          return reply(400, {
            error:
              e instanceof Error ? e.message : "Could not save local files.",
          });
        } finally {
          unlock?.();
          if (ownsLock) saving = false;
        }
      });
    },
    handleHotUpdate(ctx) {
      if (ctx.file.replaceAll("\\", "/").includes("/public/content/"))
        return [];
    },
  };
}
