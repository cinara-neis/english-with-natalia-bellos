import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { acquireFileLock } from "./store.mjs";

export const emptyRanking = () => ({ visitors: {}, profiles: {}, results: {} });

export function localRankings(root) {
  const directory = path.resolve(root, ".student-auth");
  const filename = path.join(directory, "game-rankings.json");
  async function read() {
    try {
      if ((await fs.lstat(directory)).isSymbolicLink() || (await fs.lstat(filename)).isSymbolicLink()) throw Error("Invalid ranking storage path.");
      return JSON.parse(await fs.readFile(filename, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return emptyRanking();
      throw error;
    }
  }
  return {
    read,
    async update(change) {
      const release = await acquireFileLock(filename);
      const temporary = filename + "." + randomUUID();
      try {
        await fs.mkdir(directory, { recursive: true, mode: 0o700 });
        const current = await read();
        const next = change(current);
        if (next !== current) {
          await fs.writeFile(temporary, JSON.stringify(next), { flag: "wx", mode: 0o600 });
          await fs.rename(temporary, filename);
        }
        return next;
      } finally {
        await fs.unlink(temporary).catch(() => {});
        release();
      }
    },
  };
}
