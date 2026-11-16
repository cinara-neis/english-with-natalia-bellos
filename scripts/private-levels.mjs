import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { protectLevels, readPrivateLevels } from "../shared/privateLevels.mjs";
import { localLevelsKey } from "../server/levelsKey.mjs";
import { acquireFileLock } from "../server/store.mjs";

const root = process.cwd();
const file = path.resolve(root, "public/content/manifest.json");
const unlock = await acquireFileLock(file);
const temp = file + "." + randomUUID() + ".tmp";
try {
  if ((await fs.lstat(file)).isSymbolicLink()) throw Error("Invalid manifest path.");
  const original = await fs.readFile(file, "utf8");
  const manifest = JSON.parse(original);
  const legacy = manifest.students.some(student => Object.hasOwn(student, "level"));
  if (legacy && process.argv[2] === "--check")
    throw Error("Public English levels detected. Run npm run levels:migrate before publishing.");
  if (legacy) {
    const key = process.env.STUDENT_LEVELS_KEY || await localLevelsKey(root, true);
    const saved = await readPrivateLevels(manifest.privateLevels, key);
    manifest.students = manifest.students.map(student => Object.hasOwn(saved, student.id) ? { ...student, level: saved[student.id] } : student);
    await fs.writeFile(temp, JSON.stringify(await protectLevels(manifest, key), null, 2) + "\n", { flag: "wx" });
    if ((await fs.readFile(file, "utf8")) !== original) throw Error("The manifest changed. Try again.");
    await fs.rename(temp, file);
    console.log("English levels protected. Keep the levels key private and backed up.");
  }
} finally {
  await fs.unlink(temp).catch(() => {});
  unlock();
}
