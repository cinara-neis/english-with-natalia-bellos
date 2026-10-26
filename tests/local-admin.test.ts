import { describe, it, expect } from "vitest";
import { localAdmin } from "../dev/localAdmin";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { randomBytes, scryptSync } from "node:crypto";
import fixture from "../public/content/manifest.json";
describe("Real local project storage", () => {
  async function project(
    run: (
      request: (
        url: string,
        body?: unknown,
        origin?: string,
      ) => Promise<{ status: number; data: any }>,
      root: string,
    ) => Promise<void>,
  ) {
    const root = await fs.mkdtemp(
      path.resolve("node_modules/.local-admin-test-"),
    );
    await fs.mkdir(path.join(root, "public/content/uploads"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(root, "public/content/manifest.json"),
      JSON.stringify(fixture),
    );
    const password = randomBytes(24).toString("base64url"),
      salt = randomBytes(16);
    await fs.mkdir(path.join(root, ".local-admin"));
    await fs.writeFile(
      path.join(root, ".local-admin/credentials.json"),
      JSON.stringify({
        version: randomBytes(16).toString("hex"),
        salt: salt.toString("hex"),
        hash: scryptSync(password, salt, 64).toString("hex"),
      }),
    );
    let session = "";
    let handler: any;
    const plugin = localAdmin();
    (plugin.configureServer as Function)({
      config: { root },
      middlewares: {
        use: (_prefix: string, fn: any) => {
          handler = fn;
        },
      },
    });
    const request = async (
      url: string,
      body?: unknown,
      origin = "http://localhost:5173",
    ) => {
      const req = Readable.from(
        body ? [Buffer.from(JSON.stringify(body))] : [],
      ) as any;
      Object.assign(req, {
        url,
        method: body ? "POST" : "GET",
        socket: { remoteAddress: "127.0.0.1" },
        headers: {
          host: "localhost:5173",
          origin,
          "x-local-editor": "1",
          "content-type": "application/json",
          authorization: `Bearer ${session}`,
        },
      });
      let data: any;
      const res = {
        statusCode: 200,
        setHeader: () => {},
        end: (text: string) => {
          data = JSON.parse(text);
        },
      };
      await handler(req, res, () => {});
      return { status: res.statusCode, data };
    };
    try {
      expect((await request("/content")).status).toBe(401);
      expect(
        (await request("/publish", { manifest: fixture, uploads: [] })).status,
      ).toBe(401);
      expect(
        (await request("/login", { password: "incorrect-password" })).status,
      ).toBe(401);
      const result = await request("/login", { password });
      expect(result.status).toBe(200);
      session = result.data.session;
      await run(request, root);
      expect((await request("/logout", {})).status).toBe(200);
      expect((await request("/content")).status).toBe(401);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }
  it("saves a file for only the selected student, reloads it, and deletes it from disk", async () =>
    project(async (request, root) => {
      const first = await request("/content");
      expect(first.status).toBe(200);
      const manifest = structuredClone(first.data.manifest);
      manifest.pageContent = { homeTitle: "New lesson season", contactIntro: "Contact Natalia for your next lesson." };
      manifest.about = "My updated teacher introduction.";
      manifest.email = "teacher@example.com";
      manifest.students[0].materials[0].text = "An updated activity from the teacher.";
      manifest.students[0].materials.push({
        id: "local-lesson",
        title: "Local lesson",
        kind: "pdf",
        date: "2026-10-21",
        path: "content/uploads/local-lesson.pdf",
      });
      const pdf = await fs.readFile(
        "public/content/uploads/everyday-words.pdf",
      );
      const saved = await request("/publish", {
        head: first.data.head,
        manifest,
        uploads: [
          {
            path: "content/uploads/local-lesson.pdf",
            content: pdf.toString("base64"),
          },
        ],
      });
      expect(saved.status).toBe(200);
      const disk = JSON.parse(
        await fs.readFile(
          path.join(root, "public/content/manifest.json"),
          "utf8",
        ),
      );
      expect(disk.students[0].materials.at(-1).title).toBe("Local lesson");
      expect(disk.pageContent.homeTitle).toBe("New lesson season");
      expect(disk.email).toBe("teacher@example.com");
      expect(disk.about).toBe("My updated teacher introduction.");
      expect(disk.students[0].materials[0].text).toBe("An updated activity from the teacher.");
      expect(disk.students[1]).toEqual(fixture.students[1]);
      expect(
        await fs.readFile(
          path.join(root, "public/content/uploads/local-lesson.pdf"),
        ),
      ).toEqual(pdf);
      const reloaded = await request("/content");
      expect(reloaded.data.head).toBe(saved.data.head);
      const removed = structuredClone(reloaded.data.manifest);
      removed.students[0].materials = removed.students[0].materials.filter(
        (a: any) => a.id !== "local-lesson",
      );
      expect(
        (
          await request("/publish", {
            head: reloaded.data.head,
            manifest: removed,
            uploads: [],
          })
        ).status,
      ).toBe(200);
      await expect(
        fs.access(path.join(root, "public/content/uploads/local-lesson.pdf")),
      ).rejects.toThrow();
    }));
  it("rejects cross-origin writes, conflicts and paths outside the uploads folder", async () =>
    project(async (request) => {
      const first = await request("/content");
      expect(
        (
          await request(
            "/publish",
            { head: first.data.head, manifest: fixture, uploads: [] },
            "https://evil.test",
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await request("/publish", {
            head: "stale",
            manifest: fixture,
            uploads: [],
          })
        ).status,
      ).toBe(409);
      const bad = structuredClone(fixture);
      bad.students[0].materials.push({
        id: "bad",
        title: "Bad",
        kind: "pdf",
        date: "2026-10-21",
        path: "../outside.pdf",
      });
      expect(
        (
          await request("/publish", {
            head: first.data.head,
            manifest: bad,
            uploads: [],
          })
        ).status,
      ).toBe(400);
      expect((await request("/content")).data.head).toBe(first.data.head);
    }));
});
