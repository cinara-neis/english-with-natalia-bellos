import { WebSocketServer, WebSocket } from "ws";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import palette from "../shared/appearance.json" with { type: "json" };
const scrypt = promisify(scryptCallback),
  hash = (s) => createHash("sha256").update(s).digest("hex");
export function accountLoader(root, env = {}) {
  return async () => {
    try {
      return JSON.parse(
        env.STUDENT_ACCOUNTS_JSON ||
          (await fs.readFile(
            path.join(root, ".student-auth/accounts.json"),
            "utf8",
          )),
      );
    } catch {
      return {};
    }
  };
}
export function createCommunity({ store, accounts, allowedOrigin }) {
  const sessions = new Map(),
    attempts = new Map(),
    tickets = new Map(),
    rooms = new Map();
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 4096,
    perMessageDeflate: false,
  });
  const send = (ws, data) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (ws.bufferedAmount > 64000) ws.close(1013, "Connection too slow");
      else ws.send(JSON.stringify(data));
    }
  };
  const broadcast = (room, data) => {
    for (const ws of room.members) send(ws, data);
  };
  const presence = (room) =>
    broadcast(room, {
      type: "presence",
      people: [...room.members].map((ws) => ({
        id: ws.person.id,
        name: ws.person.name,
      })),
    });
  async function authenticated(req) {
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    const s = sessions.get(hash(token));
    const account = s && (await accounts())[s.id];
    if (
      !s ||
      s.expires < Date.now() ||
      !account ||
      account.hash !== s.credential
    ) {
      sessions.delete(hash(token));
      return null;
    }
    return s;
  }
  async function json(req, max = 4096) {
    let bytes = 0;
    const parts = [];
    for await (const p of req) {
      bytes += p.length;
      if (bytes > max) throw Error("Request too large.");
      parts.push(p);
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  }
  async function handleHttp(req, res) {
    const origin = req.headers.origin;
    const reply = (status, data) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      if (origin && allowedOrigin(origin, req)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }
      res.end(JSON.stringify(data));
    };
    const url = new URL(req.url, "http://localhost");
    const route = url.pathname.replace(/^\/__community/, "");
    try {
      if (req.method === "GET" && route === "/health")
        return reply(200, { ok: true });
      if (!origin || !allowedOrigin(origin, req))
        return reply(403, { error: "Origin not authorised." });
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Authorization, Content-Type, X-Community-Client",
        );
        return reply(204, {});
      }
      if (req.headers["x-community-client"] !== "1")
        return reply(403, { error: "Use the student community interface." });
      if (req.method === "POST" && route === "/status")
        return reply(200, { available: true });
      if (req.method === "POST" && route === "/login") {
        const body = await json(req);
        if (
          typeof body.studentId !== "string" ||
          !/^[a-zA-Z0-9_-]{1,80}$/.test(body.studentId)
        )
          return reply(401, {
            error:
              "Student access is not configured or the password is incorrect.",
          });
        const key =
          (req.socket.remoteAddress || "local") + "|" + body.studentId;
        if (attempts.size >= 2000 && !attempts.has(key))
          return reply(429, { error: "Sign-in is busy. Try again later." });
        const cutoff = Date.now() - 900000;
        const recent = (attempts.get(key) || []).filter((t) => t > cutoff);
        attempts.set(key, recent);
        if (recent.length >= 10)
          return reply(429, {
            error: "Too many sign-in attempts. Try again in 15 minutes.",
          });
        recent.push(Date.now());
        const account = (await accounts())[body.studentId];
        if (
          !account ||
          typeof body.password !== "string" ||
          body.password.length < 12 ||
          body.password.length > 256 ||
          !/^[a-f0-9]{32}$/.test(account.salt) ||
          !/^[a-f0-9]{128}$/.test(account.hash)
        )
          return reply(401, {
            error:
              "Student access is not configured or the password is incorrect.",
          });
        const computed = await scrypt(
          body.password,
          Buffer.from(account.salt, "hex"),
          64,
        );
        if (!timingSafeEqual(computed, Buffer.from(account.hash, "hex")))
          return reply(401, {
            error:
              "Student access is not configured or the password is incorrect.",
          });
        if (!(await store.read()).students.some((s) => s.id === body.studentId))
          return reply(401, { error: "Student access is not configured." });
        attempts.delete(key);
        for (const [id, s] of sessions)
          if (s.expires < Date.now()) sessions.delete(id);
        if (sessions.size >= 500)
          return reply(503, {
            error: "Student sign-in is full. Try again later.",
          });
        const token = randomBytes(32).toString("base64url");
        sessions.set(hash(token), {
          id: body.studentId,
          credential: account.hash,
          expires: Date.now() + 3600000,
        });
        return reply(200, { session: token, studentId: body.studentId });
      }
      if (req.method === "POST" && route === "/logout") {
        sessions.delete(
          hash((req.headers.authorization || "").replace(/^Bearer /, "")),
        );
        return reply(200, { ok: true });
      }
      if (route === "/appearance" || route === "/appearance/read") {
        const session = await authenticated(req);
        if (!session)
          return reply(401, {
            error:
              "Sign in with your own student account to sync your appearance.",
          });
        if (req.method === "GET" || route === "/appearance/read") {
          const s = (await store.read()).students.find(
            (s) => s.id === session.id,
          );
          return reply(200, {
            appearance: s?.appearance || {
              font: "classic",
              background: "sage",
            },
            studentId: session.id,
          });
        }
        if (req.method === "POST") {
          const body = await json(req, 8192);
          if (
            !body ||
            !Object.hasOwn(palette.fonts, body.font) ||
            !Object.hasOwn(palette.backgrounds, body.background)
          )
            return reply(400, {
              error: "Choose one of the available fonts and backgrounds.",
            });
          if (body.photo !== undefined && (typeof body.photo !== "string" || body.photo.length > 6000 || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(body.photo) || !Buffer.from(body.photo.split(",")[1], "base64").subarray(-2).equals(Buffer.from([0xff, 0xd9]))))
            return reply(400, { error: "Choose a valid small JPEG profile photo." });
          const appearance = { font: body.font, background: body.background, ...(body.photo !== undefined ? { photo: body.photo } : {}) };
          await store.saveAppearance(session.id, appearance);
          return reply(200, { appearance, studentId: session.id });
        }
      }
      if (req.method === "POST" && route === "/chat/join") {
        const body = await json(req);
        const name =
          typeof body.name === "string"
            ? body.name.trim().replace(/[\u0000-\u001f\u007f]/g, "")
            : "";
        if (name.length < 2 || name.length > 30)
          return reply(400, {
            error: "Choose a nickname between 2 and 30 characters.",
          });
        const room = body.room || "lobby";
        if (!/^(lobby|student:[a-zA-Z0-9_-]{1,80})$/.test(room))
          return reply(400, { error: "Invalid chat room." });
        const active = [...rooms.values()].reduce(
          (n, r) => n + r.members.size,
          0,
        );
        if (active >= 100)
          return reply(503, { error: "The chat is full. Try again later." });
        const now = Date.now();
        for (const [k, t] of tickets) if (t.expires < now) tickets.delete(k);
        if (tickets.size >= 200)
          return reply(429, { error: "Please wait before joining again." });
        const ticket = randomBytes(32).toString("base64url");
        tickets.set(hash(ticket), { room, name, expires: now + 30000 });
        return reply(200, { ticket });
      }
      return reply(404, { error: "Community route not found." });
    } catch {
      return reply(503, {
        error:
          "The community service could not complete the request. Check its configuration or try again later.",
      });
    }
  }
  function upgrade(req, socket, head) {
    const u = new URL(req.url, "http://localhost");
    if (u.pathname !== "/__community/live") return false;
    if (!allowedOrigin(req.headers.origin, req)) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return true;
    }
    const key = hash(u.searchParams.get("ticket") || "");
    const ticket = tickets.get(key);
    tickets.delete(key);
    if (!ticket || ticket.expires < Date.now()) {
      socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      return true;
    }
    if ([...rooms.values()].reduce((n, r) => n + r.members.size, 0) >= 100) {
      socket.end(
        "HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n",
      );
      return true;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      let room = rooms.get(ticket.room);
      if (!room) {
        room = { members: new Set(), messages: [] };
        rooms.set(ticket.room, room);
      }
      if (room.members.size >= 50) {
        ws.close(1013, "Room full");
        return;
      }
      ws.person = { id: randomUUID(), name: ticket.name };
      ws.alive = true;
      ws.times = [];
      room.members.add(ws);
      send(ws, {
        type: "welcome",
        self: ws.person,
        room: ticket.room,
        messages: room.messages,
      });
      presence(room);
      ws.on("pong", () => {
        ws.alive = true;
      });
      ws.on("message", (raw, isBinary) => {
        try {
          if (isBinary) return;
          const data = JSON.parse(raw.toString());
          if (data.type !== "message" || typeof data.text !== "string") return;
          const text = data.text.trim();
          if (!text || text.length > 500)
            return send(ws, {
              type: "error",
              message: "Use a message between 1 and 500 characters.",
            });
          const now = Date.now();
          ws.times = ws.times.filter((t) => t > now - 60000);
          if (
            ws.times.length >= 20 ||
            (ws.times.length && now - ws.times.at(-1) < 800)
          )
            return send(ws, {
              type: "error",
              message: "Please slow down before sending another message.",
            });
          ws.times.push(now);
          const message = {
            id: randomUUID(),
            name: ws.person.name,
            personId: ws.person.id,
            text,
            date: new Date().toISOString(),
          };
          room.messages.push(message);
          if (room.messages.length > 50) room.messages.shift();
          broadcast(room, { type: "message", message });
        } catch {
          send(ws, { type: "error", message: "Invalid chat message." });
        }
      });
      ws.on("error", () => {});
      ws.on("close", () => {
        room.members.delete(ws);
        if (!room.members.size) rooms.delete(ticket.room);
        else presence(room);
      });
    });
    return true;
  }
  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) ws.terminate();
      else {
        ws.alive = false;
        ws.ping();
      }
    }
    const now = Date.now();
    for (const [id, s] of sessions) if (s.expires < now) sessions.delete(id);
    for (const [ip, times] of attempts)
      if (times.every((t) => t < now - 900000)) attempts.delete(ip);
  }, 30000);
  timer.unref();
  return {
    handleHttp,
    upgrade,
    close() {
      clearInterval(timer);
      for (const ws of wss.clients) ws.terminate();
      wss.close();
    },
  };
}
