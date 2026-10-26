import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { acquireFileLock } from "./store.mjs";

export async function setPassword(root, studentId, password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256)
    throw Error("Use a password between 12 and 256 characters.");
  if (studentId !== null && (typeof studentId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(studentId)))
    throw Error("Invalid student ID.");
  const directory = path.resolve(root, studentId === null ? ".local-admin" : ".student-auth");
  const filename = path.join(directory, studentId === null ? "credentials.json" : "accounts.json");
  const unlock = await acquireFileLock(filename);
  const temp = filename + "." + randomUUID() + ".tmp";
  try {
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    if ((await fs.lstat(directory)).isSymbolicLink()) throw Error("Credential directory must not be a symbolic link.");
    const stat = await fs.lstat(filename).catch(e => { if (e.code !== "ENOENT") throw e; });
    if (stat?.isSymbolicLink()) throw Error("Credential file must not be a symbolic link.");
    const salt = randomBytes(16);
    const record = { salt: salt.toString("hex"), hash: scryptSync(password, salt, 64).toString("hex") };
    let value;
    if (studentId === null) value = { version: randomUUID(), ...record };
    else {
      const manifest = JSON.parse(await fs.readFile(path.join(root, "public/content/manifest.json"), "utf8"));
      if (!manifest.students.some(s => s.id === studentId)) throw Error("Save the student in the blog before creating their password.");
      value = stat ? JSON.parse(await fs.readFile(filename, "utf8")) : {};
      Object.defineProperty(value, studentId, { value: record, enumerable: true, configurable: true, writable: true });
    }
    await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await fs.rename(temp, filename);
  } finally { await fs.unlink(temp).catch(() => {}); unlock(); }
}
