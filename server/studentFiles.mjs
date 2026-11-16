import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { acquireFileLock } from "./store.mjs";

const limit = 2 * 1024 * 1024;
export const validOwner = (value) => typeof value === "string" && /^[\w-]{1,80}$/.test(value);
export const validFileId = (value) => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);

export function newStudentFile(owner, body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 150 || /[/\\\x00-\x1f\x7f]/.test(name)) throw Error("Invalid filename.");
  const ext = name.split(".").pop().toLowerCase();
  const signatures = {
    pdf: "255044462d", docx: "504b0304", doc: "d0cf11e0a1b11ae1",
    png: "89504e470d0a1a0a", jpg: "ffd8ff", jpeg: "ffd8ff", webp: "52494646",
  };
  if (!Object.hasOwn(signatures, ext) || typeof body.content !== "string" ||
      body.content.length > Math.ceil(limit / 3) * 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(body.content)) throw Error("Choose a PDF, Word or image file up to 2 MiB.");
  const bytes = Buffer.from(body.content, "base64");
  if (!bytes.length || bytes.length > limit || !bytes.subarray(0, 8).toString("hex").startsWith(signatures[ext]) ||
      (ext === "webp" && bytes.subarray(8, 12).toString("ascii") !== "WEBP"))
    throw Error("The file content does not match its format.");
  return { id: randomUUID(), owner, name, size: bytes.length, public: false };
}

export function localStudentFiles(root) {
  const dir = path.resolve(root, ".student-auth/student-files");
  const index = path.join(dir, "index.json");
  async function ready() {
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    if ((await fs.realpath(dir)) !== path.join(await fs.realpath(root), ".student-auth", "student-files"))
      throw Error("Private file directory cannot be a symbolic link.");
  }
  async function read() {
    await ready();
    try { return JSON.parse(await fs.readFile(index, "utf8")); }
    catch (e) { if (e.code !== "ENOENT") throw e; return []; }
  }
  return {
    read,
    async update(change, upload) {
      const unlock = await acquireFileLock(index);
      const temp = index + "." + randomUUID();
      try {
        const current = await read();
        const next = change(current);
        if (next === current) return;
        if (upload) await fs.writeFile(path.join(dir, upload.id), Buffer.from(upload.content, "base64"), { flag: "wx", mode: 0o600 });
        await fs.writeFile(temp, JSON.stringify(next), { flag: "wx", mode: 0o600 });
        await fs.rename(temp, index);
      } finally { await fs.unlink(temp).catch(() => {}); unlock(); }
    },
    async download(id) {
      if (!validFileId(id)) throw Error("Invalid file ID.");
      await ready();
      return (await fs.readFile(path.join(dir, id))).toString("base64");
    },
  };
}

export async function studentFileAction(store, action, body, owner, teacher = false) {
  const { id } = body;
  const result = (status, data) => ({ status, data });
  if (!store) return result(503, { error: "Student file storage is not configured." });
  if (action === "upload" || action === "visibility") {
    if (!owner || teacher) return result(401, { error: "Sign in as the file owner." });
    if (action === "upload") {
      let file;
      try { file = newStudentFile(owner, body); }
      catch (e) { return result(400, { error: e.message }); }
      await store.update(items => {
        if (items.filter(item => item.owner === owner).length >= 20) throw Error("File limit reached.");
        return [...items, file];
      }, { id: file.id, content: body.content });
      return result(201, { file });
    }
    if (!validFileId(id) || typeof body.public !== "boolean" || (body.public && body.confirmed !== true))
      return result(400, { error: "Confirm before making a file public." });
    let found = false;
    await store.update(items => {
      const item = items.find(entry => entry.id === id && entry.owner === owner);
      if (!item) return items;
      found = true;
      return items.map(entry => entry === item ? { ...entry, public: body.public } : entry);
    });
    return found ? result(200, { ok: true }) : result(404, { error: "File not found." });
  }
  const studentId = teacher || !owner ? body.studentId : owner;
  if (!validOwner(studentId)) return result(400, { error: "Choose a student." });
  const visible = (await store.read()).filter(item => item.owner === studentId && (item.public || teacher || item.owner === owner));
  if (action === "list") return result(200, { files: visible });
  if (action !== "download") return result(404, { error: "Not found." });
  const file = visible.find(item => item.id === id);
  if (!file) return result(404, { error: "File not found." });
  return result(200, { name: file.name, content: await store.download(file.id) });
}
