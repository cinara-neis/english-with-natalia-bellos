import { randomBytes, randomUUID, createHash, scrypt as derive, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { acquireFileLock } from "./store.mjs";
import { createRankedRun, gameConfig, playRankedMove, rankedView } from "./rankedGames.mjs";

const scrypt = promisify(derive);
const hash = token => createHash("sha256").update(token).digest("hex");
const nicknameValid = value => typeof value === "string" && /^[\p{L}\p{N} _.-]{2,32}$/u.test(value);
class RankingError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new RankingError(status, message); };

export function createRankings({ storage, authenticateStudent }) {
  const sessions = new Map();
  const runs = new Map();
  const limits = new Map();

  function limit(key, max, window = 60000) {
    const now = Date.now();
    if (limits.size >= 4000 && !limits.has(key)) fail(429, "The ranking is busy. Try again later.");
    const recent = (limits.get(key) || []).filter(time => time > now - window);
    limits.set(key, recent);
    if (recent.length >= max) fail(429, "Too many requests. Please wait before trying again.");
    recent.push(now);
  }

  function visitorSession(account) {
    if (sessions.size >= 500) fail(503, "Player sign-in is full. Try again later.");
    const token = "player_" + randomBytes(32).toString("base64url");
    sessions.set(hash(token), { id: "visitor:" + account.id, cohort: "visitors", expires: Date.now() + 3600000 });
    return token;
  }

  async function identity(req) {
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    if (token.startsWith("player_")) {
      const session = sessions.get(hash(token));
      if (!session || session.expires <= Date.now()) fail(401, "Player session expired. Sign in again.");
      return session;
    }
    const student = await authenticateStudent(req);
    if (!student) fail(401, "Sign in as a student or a visitor player.");
    return { id: "student:" + student.id, cohort: "students" };
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessions) if (value.expires <= now) sessions.delete(key);
    for (const [key, value] of runs) if (value.expires <= now) runs.delete(key);
    for (const [key, values] of limits) if (values.every(time => time < now - 900000)) limits.delete(key);
  }, 30000);
  timer.unref();

  async function handle(route, body, req) {
    try {
      if (route === "/status") return { status: 200, data: { available: !!storage } };
      if (!storage) fail(503, "Online rankings are not configured yet.");
      const ip = req.socket.remoteAddress || "local";
      if (route === "/board") {
        limit("board:" + ip, 60);
        const config = gameConfig(body.game, body.topic, body.size);
        if (!["students", "visitors"].includes(body.cohort)) fail(400, "Choose a ranking group.");
        const state = await storage.read();
        const rows = Object.entries(state.profiles)
          .filter(([, profile]) => profile.enabled && profile.cohort === body.cohort)
          .map(([id, profile]) => {
            const record = state.results[id]?.[config.key];
            return record && { nickname: profile.nickname, wins: record.wins, best: record.best, milliseconds: record.milliseconds };
          })
          .filter(Boolean)
          .sort((a, b) => b.wins - a.wins || a.best - b.best || a.milliseconds - b.milliseconds)
          .slice(0, 50);
        return { status: 200, data: { rows, config } };
      }
      if (route === "/register" || route === "/login") {
        limit("auth:" + ip, 10, 900000);
        const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
        const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
        if (!/^[a-z0-9][a-z0-9_-]{2,23}$/.test(username) || typeof body.password !== "string" ||
            body.password.length < 12 || body.password.length > 256)
          fail(400, "Use a username of 3–24 letters or numbers and a password of 12–256 characters.");
        if (route === "/register") {
          if (!nicknameValid(nickname) || body.consent !== true) fail(400, "Choose a public nickname and agree to join the visitor ranking.");
          const salt = randomBytes(16);
          const passwordHash = (await scrypt(body.password, salt, 64)).toString("hex");
          const account = { id: randomUUID(), salt: salt.toString("hex"), hash: passwordHash };
          const id = "visitor:" + account.id;
          await storage.update(state => {
            if (Object.hasOwn(state.visitors, username)) fail(409, "This username is already registered.");
            if (Object.keys(state.visitors).length >= 1000) fail(503, "Player registration is full.");
            if (Object.values(state.profiles).some(profile => profile.cohort === "visitors" && profile.nickname.toLowerCase() === nickname.toLowerCase()))
              fail(409, "Choose a different public nickname.");
            return { ...state, visitors: { ...state.visitors, [username]: account },
              profiles: { ...state.profiles, [id]: { cohort: "visitors", nickname, enabled: true } } };
          });
          return { status: 201, data: { session: visitorSession(account), cohort: "visitors", nickname, enabled: true } };
        }
        const state = await storage.read();
        const account = Object.hasOwn(state.visitors, username) ? state.visitors[username] : null;
        // Derive even for unknown users so the response does not trivially reveal usernames.
        const salt = account?.salt || randomBytes(16).toString("hex");
        const computed = await scrypt(body.password, Buffer.from(salt, "hex"), 64);
        if (!account || !timingSafeEqual(computed, Buffer.from(account.hash, "hex"))) fail(401, "Incorrect player username or password.");
        const profile = state.profiles["visitor:" + account.id];
        return { status: 200, data: { session: visitorSession(account), cohort: "visitors", nickname: profile.nickname, enabled: profile.enabled } };
      }
      if (route === "/logout") {
        sessions.delete(hash((req.headers.authorization || "").replace(/^Bearer /, "")));
        return { status: 200, data: { ok: true } };
      }
      const person = await identity(req);
      limit("player:" + person.id, 240);
      if (route === "/me") {
        const profile = (await storage.read()).profiles[person.id];
        return { status: 200, data: { cohort: person.cohort, nickname: profile?.nickname || "", enabled: profile?.enabled || false } };
      }
      if (route === "/profile") {
        limit("profile:" + person.id, 10);
        const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
        if (typeof body.enabled !== "boolean" || !nicknameValid(nickname)) fail(400, "Choose a public nickname of 2–32 characters.");
        const state = await storage.update(current => {
          if (Object.entries(current.profiles).some(([id, profile]) => id !== person.id && profile.cohort === person.cohort && profile.nickname.toLowerCase() === nickname.toLowerCase()))
            fail(409, "Choose a different public nickname.");
          if (!Object.hasOwn(current.profiles, person.id) && Object.keys(current.profiles).length >= 2000) fail(503, "The ranking is full.");
          return { ...current, profiles: { ...current.profiles, [person.id]: { cohort: person.cohort, nickname, enabled: body.enabled } } };
        });
        return { status: 200, data: state.profiles[person.id] };
      }
      if (!(await storage.read()).profiles[person.id]?.enabled) fail(403, "Choose a public nickname and join the ranking first.");
      const release = await acquireFileLock("ranked-player:" + person.id);
      try {
        if (route === "/start") {
          limit("start:" + person.id, 10);
          if (runs.size >= 500 && !runs.has(person.id)) fail(503, "Ranked games are full. Try again later.");
          const run = createRankedRun(gameConfig(body.game, body.topic, body.size));
          runs.set(person.id, run);
          return { status: 200, data: rankedView(run) };
        }
        if (route === "/current") {
          const run = runs.get(person.id);
          if (!run || run.expires < Date.now()) fail(409, "This round has expired. Start a new one.");
          return { status: 200, data: rankedView(run) };
        }
        if (route !== "/move") fail(404, "Ranking route not found.");
        const previous = runs.get(person.id);
        if (!previous || previous.id !== body.id || previous.expires < Date.now()) fail(409, "This round has expired or was replaced. Start a new one.");
        if (previous.version !== body.version) fail(409, "This move was already processed. Use the current round.");
        const run = playRankedMove(previous, body.action || {});
        if (run.won) {
          const milliseconds = Math.max(0, Date.now() - run.started);
          await storage.update(current => {
            const previousRecord = current.results[person.id]?.[run.config.key];
            const receipts = (previousRecord?.receipts || []).filter(receipt => receipt.expires > Date.now());
            if (receipts.some(receipt => receipt.id === run.id)) return current;
            const better = !previousRecord || run.metric < previousRecord.best ||
              (run.metric === previousRecord.best && milliseconds < previousRecord.milliseconds);
            const record = {
              wins: (previousRecord?.wins || 0) + 1,
              best: better ? run.metric : previousRecord.best,
              milliseconds: better ? milliseconds : previousRecord.milliseconds,
              receipts: [...receipts, { id: run.id, expires: run.expires }],
            };
            return { ...current, results: { ...current.results,
              [person.id]: { ...current.results[person.id], [run.config.key]: record } } };
          });
          run.recorded = true;
          run.message = "Well done! Your win was saved to the ranking.";
        }
        runs.set(person.id, run);
        return { status: 200, data: rankedView(run) };
      } finally { release(); }
    } catch (error) {
      return { status: error.status || 503, data: { error: error.status ? error.message :
        "The ranking could not save or load data. Please try again." } };
    }
  }
  return { handle, close() { clearInterval(timer); sessions.clear(); runs.clear(); } };
}
