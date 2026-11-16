import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomBytes, randomUUID, scrypt as derive } from "node:crypto";
import { promisify } from "node:util";
import { acquireFileLock } from "./store.mjs";

const scrypt = promisify(derive);
const digest = value => createHash("sha256").update(value).digest("hex");
export const normalizeEmail = value => typeof value === "string" && value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? value.trim().toLowerCase() : "";

export function localStudentAccounts(root) {
  const dir = path.resolve(root, ".student-auth");
  const file = path.join(dir, "accounts.json");
  async function read() {
    try {
      if ((await fs.lstat(dir)).isSymbolicLink() || (await fs.lstat(file)).isSymbolicLink()) throw Error("Invalid private account path.");
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch (e) { if (e.code === "ENOENT") return {}; throw e; }
  }
  return { read, async update(change) {
    const release = await acquireFileLock(file);
    const temp = file + "." + randomUUID();
    try {
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
      const current = await read();
      const next = change(current);
      if (next === current) return;
      await fs.writeFile(temp, JSON.stringify(next), { flag: "wx", mode: 0o600 });
      await fs.rename(temp, file);
    } finally { await fs.unlink(temp).catch(() => {}); release(); }
  } };
}

export async function createStudentInvite(accounts, catalog, studentId) {
  if (!accounts) return { status: 503, data: { error: "Private student account storage is not configured." } };
  if (typeof studentId !== "string" || !(await catalog.read()).students.some(student => student.id === studentId))
    return { status: 400, data: { error: "Save the student profile before creating an invitation." } };
  const code = randomBytes(24).toString("base64url");
  await accounts.update(current => ({ ...current, [studentId]: {
    ...(Object.hasOwn(current, studentId) ? current[studentId] : {}),
    invite: { hash: digest(code), expires: Date.now() + 2 * 86400000 },
  } }));
  return { status: 200, data: { code } };
}

export async function registerStudent(accounts, catalog, body) {
  if (!accounts) return { status: 503, data: { error: "Private student account storage is not configured." } };
  const email = normalizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!email || !/^[\w-]{32}$/.test(code) || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 256)
    return { status: 400, data: { error: "Enter a valid email, invitation and password (at least 12 characters)." } };
  const ids = new Set((await catalog.read()).students.map(student => student.id));
  const inviteHash = digest(code);
  const find = current => Object.entries(current).find(([id, account]) => ids.has(id) &&
    account.invite?.hash === inviteHash && account.invite.expires > Date.now() && (!account.email || account.email === email));
  const available = current => {
    const match = find(current);
    return match && !Object.entries(current).some(([id, account]) => id !== match[0] && account.email === email) ? match : null;
  };
  const failure = { status: 400, data: { error: "The invitation is invalid, expired, used, or does not match this email." } };
  if (!available(await accounts.read())) return failure;
  const salt = randomBytes(16);
  const hash = (await scrypt(body.password, salt, 64)).toString("hex");
  let saved = false;
  await accounts.update(current => {
    const match = available(current);
    if (!match) return current;
    saved = true;
    return { ...current, [match[0]]: { email, salt: salt.toString("hex"), hash } };
  });
  return saved ? { status: 201, data: { ok: true } } : failure;
}
