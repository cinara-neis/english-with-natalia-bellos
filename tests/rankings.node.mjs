import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { randomBytes, scryptSync, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { githubStore } from "../server/store.mjs";
import { createCommunity } from "../server/community.mjs";
import { localRankings } from "../server/rankingStore.mjs";
import { createRankings } from "../server/rankings.mjs";
import { createRankedRun, gameConfig, playRankedMove, rankedView } from "../server/rankedGames.mjs";
import catalog from "../shared/gameCatalog.json" with { type: "json" };

const origin = "http://localhost:5173";
const registration = { username: "visitor-one", password: "A-private-test-password", nickname: "Tea Player", consent: true };

async function solveHangman(request, token) {
  let result = await request("/ranking/start", { game: "hangman" }, token);
  assert.equal(result.status, 200);
  let run = result.data;
  const word = catalog.vocabulary.find(item => item.clue === run.clue).word;
  for (const letter of new Set(word)) {
    result = await request("/ranking/move", { id: run.id, version: run.version, action: { type: "guess", letter } }, token);
    assert.equal(result.status, 200);
    run = result.data;
  }
  assert.equal(run.won, true);
  return run;
}

test("Private ranking persistence, separate cohorts, opt-in, replay protection and visitor isolation", async () => {
  const root = await fs.mkdtemp(path.resolve("node_modules/.ranking-test-"));
  const storage = localRankings(root);
  const salt = randomBytes(16);
  const password = "A-student-test-password";
  const accounts = { learner: { email: "learner@example.test", salt: salt.toString("hex"), hash: scryptSync(password, salt, 64).toString("hex") } };
  const makeHub = () => createCommunity({
    store: { read: async () => ({ students: [{ id: "learner", name: "Private real name" }] }) },
    accounts: async () => accounts, rankings: storage, allowedOrigin: value => value === origin,
  });
  let hub = makeHub();
  async function request(route, body = {}, token = "", requestOrigin = origin) {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]);
    Object.assign(req, {
      method: "POST", url: "/__community" + route,
      headers: { origin: requestOrigin, "x-community-client": "1", authorization: "Bearer " + token },
      socket: { remoteAddress: "127.0.0.1" },
    });
    let result;
    await hub.handleHttp(req, { statusCode: 0, setHeader() {}, end(value) { result = { status: this.statusCode, data: JSON.parse(value) }; } });
    return result;
  }
  try {
    assert.equal((await request("/ranking/status", {}, "", "https://other.test")).status, 403);
    assert.equal((await request("/ranking/register", { ...registration, consent: false })).status, 400);
    const concurrent = await Promise.all([
      request("/ranking/register", registration), request("/ranking/register", registration),
    ]);
    assert.deepEqual(concurrent.map(result => result.status).sort(), [201, 409]);
    const visitor = concurrent.find(result => result.status === 201).data.session;
    assert.equal((await request("/appearance/read", {}, visitor)).status, 401);
    assert.equal((await request("/accounts/invite", { studentId: "learner" }, visitor)).status, 401);
    const student = (await request("/login", { email: "learner@example.test", password })).data.session;
    assert.ok(student);
    assert.equal((await request("/ranking/start", { game: "hangman" }, student)).status, 403);
    await request("/ranking/profile", { nickname: "Book Learner", enabled: true, cohort: "visitors" }, student);
    assert.equal((await request("/ranking/me", {}, student)).data.cohort, "students");
    const [studentWin, visitorWin] = await Promise.all([solveHangman(request, student), solveHangman(request, visitor)]);
    assert.equal(studentWin.recorded, true);
    assert.equal(visitorWin.recorded, true);
    const stale = await request("/ranking/move", { id: studentWin.id, version: studentWin.version - 1, action: { type: "guess", letter: "Z" } }, student);
    assert.equal(stale.status, 409);
    const finished = await request("/ranking/move", { id: studentWin.id, version: studentWin.version, action: { type: "guess", letter: "Z" } }, student);
    assert.equal(finished.status, 400);
    assert.equal((await solveHangman(request, visitor)).recorded, true);
    const board = group => request("/ranking/board", { cohort: group, game: "hangman" });
    const studentRows = (await board("students")).data.rows;
    const visitorRows = (await board("visitors")).data.rows;
    assert.deepEqual(studentRows.map(row => [row.nickname, row.wins]), [["Book Learner", 1]]);
    assert.deepEqual(visitorRows.map(row => [row.nickname, row.wins]), [["Tea Player", 2]]);
    assert.equal(JSON.stringify(studentRows).includes("learner@example.test"), false);
    assert.equal(JSON.stringify(visitorRows).includes("hash"), false);
    assert.equal(JSON.stringify(studentRows).includes("Private real name"), false);
    await request("/ranking/profile", { nickname: "Tea Player", enabled: false }, visitor);
    assert.equal((await board("visitors")).data.rows.length, 0);
    await request("/ranking/profile", { nickname: "Tea Player", enabled: true }, visitor);
    assert.equal((await solveHangman(request, visitor)).recorded, true);
    hub.close();
    hub = makeHub();
    assert.equal((await request("/ranking/me", {}, visitor)).status, 401);
    const logged = await request("/ranking/login", { username: registration.username, password: registration.password });
    assert.equal(logged.status, 200);
    assert.deepEqual((await board("visitors")).data.rows.map(row => [row.nickname, row.wins]), [["Tea Player", 3]]);
    assert.equal((await request("/ranking/logout", {}, logged.data.session)).status, 200);
    assert.equal((await request("/ranking/me", {}, logged.data.session)).status, 401);
    const raw = await storage.read();
    assert.equal(JSON.stringify(raw).includes(registration.password), false);
  } finally {
    hub.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("Ranked game engine hides answers and derives every result from accepted moves", () => {
  let memory = createRankedRun(gameConfig("memory", "fruits", 12));
  assert.equal(rankedView(memory).cards.every(card => card === null), true);
  assert.throws(() => playRankedMove(memory, { type: "win", score: 1000 }));
  const words = [...new Set(memory.deck.map(card => card.word))];
  for (const word of words) {
    const cells = memory.deck.flatMap((card, index) => card.word === word ? [index] : []);
    memory = playRankedMove(memory, { type: "flip", cell: cells[0] });
    assert.throws(() => playRankedMove(memory, { type: "flip", cell: cells[0] }));
    memory = playRankedMove(memory, { type: "flip", cell: cells[1] });
  }
  assert.equal(memory.won, true);
  assert.equal(memory.metric, 6);
  const fresh = createRankedRun(gameConfig("memory", "animals", 16));
  const first = 0, second = fresh.deck.findIndex(card => card.word !== fresh.deck[0].word);
  let mismatch = playRankedMove(fresh, { type: "flip", cell: first });
  mismatch = playRankedMove(mismatch, { type: "flip", cell: second });
  assert.equal(rankedView(mismatch).needsCover, true);
  assert.throws(() => playRankedMove(mismatch, { type: "flip", cell: 2 }));
  mismatch = playRankedMove(mismatch, { type: "cover" });
  assert.equal(rankedView(mismatch).cards.every(card => card === null), true);
  let cats = createRankedRun(gameConfig("doku"));
  assert.equal(Object.hasOwn(rankedView(cats), "solution"), false);
  const wrong = cats.regions.findIndex((_, index) => !cats.solution.includes(index));
  cats = playRankedMove(cats, { type: "mark", cell: wrong });
  assert.equal(cats.lives, 3);
  cats = playRankedMove(cats, { type: "cat", cell: wrong });
  assert.equal(cats.lives, 2);
  for (const cell of cats.solution) cats = playRankedMove(cats, { type: "cat", cell });
  assert.equal(cats.won, true);
  assert.equal(cats.metric, 1);
  let crossword = createRankedRun(gameConfig("crossword"));
  assert.equal(Object.hasOwn(rankedView(crossword), "answers"), false);
  crossword = playRankedMove(crossword, { type: "solve", answers: Array(15).fill("") });
  assert.equal(crossword.metric, 1);
  crossword = playRankedMove(crossword, { type: "solve", answers: crossword.answers });
  assert.equal(crossword.won, true);
  assert.equal(crossword.metric, 1);
});

test("A failed save is retryable and duplicate final requests award exactly one win", async () => {
  let state = { visitors: {}, profiles: { "student:one": { cohort: "students", nickname: "One", enabled: true } }, results: {} };
  let failSave = true;
  const ranking = createRankings({
    storage: { read: async () => state, update: async change => {
      if (failSave) { failSave = false; throw Error("Temporary storage failure"); }
      state = change(state); return state;
    } },
    authenticateStudent: async () => ({ id: "one" }),
  });
  const req = { headers: {}, socket: { remoteAddress: "test" } };
  try {
    let run = (await ranking.handle("/start", { game: "hangman" }, req)).data;
    const letters = [...new Set(catalog.vocabulary.find(item => item.clue === run.clue).word)];
    for (const letter of letters.slice(0, -1)) {
      run = (await ranking.handle("/move", { id: run.id, version: run.version, action: { type: "guess", letter } }, req)).data;
    }
    const body = { id: run.id, version: run.version, action: { type: "guess", letter: letters.at(-1) } };
    assert.equal((await ranking.handle("/move", body, req)).status, 503);
    assert.equal((await ranking.handle("/current", {}, req)).data.version, run.version);
    const results = await Promise.all([ranking.handle("/move", body, req), ranking.handle("/move", body, req)]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    assert.equal(state.results["student:one"].hangman.wins, 1);
  } finally { ranking.close(); }
});

test("GitHub ranking writes retry version conflicts and reject public storage", async () => {
  const previousFetch = globalThis.fetch;
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const env = {
    GITHUB_OWNER: "owner", GITHUB_REPO: "blog", STUDENT_FILES_REPO: "private-games",
    GITHUB_APP_ID: "1", GITHUB_INSTALLATION_ID: "2",
    GITHUB_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
  };
  let current = { visitors: {}, profiles: {}, results: {} };
  let sha = "v1", writes = 0, callbacks = 0, privateRepo = true;
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
  globalThis.fetch = async (url, options) => {
    if (url.includes("/access_tokens")) return response({ token: "test-token", expires_at: new Date(Date.now() + 3600000).toISOString() });
    if (url.endsWith("/repos/owner/private-games")) return response({ private: privateRepo });
    assert.equal(url.endsWith("/repos/owner/private-games/contents/game-rankings.json"), true);
    if (options.method === "GET") return response({ sha, content: Buffer.from(JSON.stringify(current)).toString("base64") });
    const body = JSON.parse(options.body);
    writes++;
    if (writes === 1) {
      current = { ...current, results: { other: { wins: 1 } } };
      sha = "v2";
      return response({ message: "Conflict" }, 409);
    }
    assert.equal(body.sha, "v2");
    current = JSON.parse(Buffer.from(body.content, "base64").toString("utf8"));
    sha = "v3";
    return response({ content: { sha } });
  };
  try {
    const storage = githubStore(env).rankings;
    await storage.update(value => {
      callbacks++;
      return { ...value, results: { ...value.results, mine: { wins: 1 } } };
    });
    assert.equal(callbacks, 2);
    assert.equal(writes, 2);
    assert.deepEqual(current.results, { other: { wins: 1 }, mine: { wins: 1 } });
    privateRepo = false;
    await assert.rejects(storage.read(), /private repository/);
  } finally { globalThis.fetch = previousFetch; }
});
