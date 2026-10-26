import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
type Credentials = { version: string; salt: string; hash: string };
export function localAuth(root: string) {
  const filename = path.join(root, ".local-admin", "credentials.json");
  const sessions = new Map<string, { expires: number; version: string }>();
  const attempts: number[] = [];
  const digest = (token: string) =>
    createHash("sha256").update(token).digest("hex");
  async function credentials(): Promise<Credentials | null> {
    try {
      const value = JSON.parse(await fs.readFile(filename, "utf8"));
      if (
        typeof value.version !== "string" ||
        !/^[a-f0-9]{32}$/.test(value.salt) ||
        !/^[a-f0-9]{128}$/.test(value.hash)
      )
        return null;
      return value;
    } catch {
      return null;
    }
  }
  return {
    async configured() {
      return !!(await credentials());
    },
    async login(password: unknown) {
      const now = Date.now();
      while (attempts.length && attempts[0] < now - 15 * 60 * 1000)
        attempts.shift();
      if (attempts.length >= 5)
        return {
          status: 429,
          error: "Too many sign-in attempts. Try again in 15 minutes.",
        };
      const stored = await credentials();
      if (!stored)
        return {
          status: 503,
          error:
            "Teacher sign-in is not configured. Run npm run admin:setup in the project terminal.",
        };
      attempts.push(now);
      if (
        typeof password !== "string" ||
        password.length < 12 ||
        password.length > 256
      )
        return { status: 401, error: "Incorrect teacher password." };
      const hash = (await scrypt(
        password,
        Buffer.from(stored.salt, "hex"),
        64,
      )) as Buffer;
      if (!timingSafeEqual(hash, Buffer.from(stored.hash, "hex")))
        return { status: 401, error: "Incorrect teacher password." };
      attempts.length = 0;
      for (const [id, s] of sessions)
        if (s.expires <= now || s.version !== stored.version)
          sessions.delete(id);
      const session = randomBytes(32).toString("base64url");
      sessions.set(digest(session), {
        expires: Date.now() + 3600000,
        version: stored.version,
      });
      return { status: 200, session };
    },
    async authorised(header: string | undefined) {
      const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
      if (!token) return false;
      const session = sessions.get(digest(token));
      const stored = await credentials();
      if (
        !session ||
        !stored ||
        session.expires <= Date.now() ||
        session.version !== stored.version
      ) {
        sessions.delete(digest(token));
        return false;
      }
      return true;
    },
    logout(header: string | undefined) {
      if (header?.startsWith("Bearer "))
        sessions.delete(digest(header.slice(7)));
    },
  };
}
