import { promises as fs } from "node:fs";
import path from "node:path";
import { newLevelsKey } from "../shared/privateLevels.mjs";

export async function localLevelsKey(root, create = false) {
  const directory = path.resolve(root, ".student-auth");
  const file = path.join(directory, "levels.key");
  if (create) await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    if ((await fs.lstat(directory)).isSymbolicLink() || (await fs.lstat(file)).isSymbolicLink())
      throw Error("Private key path must not be a symbolic link.");
    return (await fs.readFile(file, "utf8")).trim();
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    if (!create) return undefined;
    try { await fs.writeFile(file, newLevelsKey() + "\n", { flag: "wx", mode: 0o600 }); }
    catch (writeError) { if (writeError.code !== "EEXIST") throw writeError; }
    return localLevelsKey(root);
  }
}
