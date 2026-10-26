import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { localAuth } from "../dev/localAuth";
describe("Teacher-only local sessions", () => {
  it("denies missing setup and limits password attempts", async () => {
    const root = await fs.mkdtemp(path.resolve("node_modules/.auth-test-"));
    try {
      const auth = localAuth(root);
      expect(await auth.authorised("Bearer local")).toBe(false);
      expect((await auth.login("any-password-here")).status).toBe(503);
      const password = randomBytes(20).toString("hex"),
        salt = randomBytes(16);
      await fs.mkdir(path.join(root, ".local-admin"));
      await fs.writeFile(
        path.join(root, ".local-admin/credentials.json"),
        JSON.stringify({
          version: "test-version",
          salt: salt.toString("hex"),
          hash: scryptSync(password, salt, 64).toString("hex"),
        }),
      );
      for (let i = 0; i < 5; i++)
        expect((await auth.login("wrong-password")).status).toBe(401);
      expect((await auth.login(password)).status).toBe(429);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
