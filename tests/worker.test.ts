import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { verifyFile, type Env } from "../worker/index";
import { readFileSync } from "node:fs";
const origin = "https://teacher.github.io";
const env: Env = {
  FRONTEND_URL: origin + "/blog/",
  GITHUB_OWNER: "teacher",
  GITHUB_REPO: "blog",
  GITHUB_BRANCH: "main",
  GITHUB_CLIENT_ID: "client",
  GITHUB_CLIENT_SECRET: "test-secret",
  SESSION_SECRET: btoa("12345678901234567890123456789012"),
  ALLOWED_LOGIN: "teacher",
};
const manifest = JSON.parse(
  readFileSync("public/content/manifest.json", "utf8"),
);
afterEach(() => vi.restoreAllMocks());
function mockGithub(login = "teacher", head = "abc") {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "https://github.com/login/oauth/access_token") {
        expect(JSON.parse(String(init?.body)).code_verifier).toBeTruthy();
        return Response.json({ access_token: "ghu_test", expires_in: 28800 });
      }
      if (url.endsWith("/user")) return Response.json({ login });
      if (url.endsWith("/repos/teacher/blog"))
        return Response.json({ private: false, permissions: { push: true } });
      if (url.includes("/git/ref/"))
        return Response.json({ object: { sha: head } });
      if (url.includes("/git/commits/") && init?.method === "GET")
        return Response.json({ tree: { sha: "old-tree" } });
      if (url.includes("/contents/"))
        return Response.json({
          content: Buffer.from(JSON.stringify(manifest)).toString("base64"),
        });
      if (url.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
      if (url.endsWith("/git/commits"))
        return Response.json({ sha: "new-commit" });
      if (url.includes("/git/refs/") && init?.method === "PATCH")
        return Response.json({ object: { sha: "new-commit" } });
      if (url.endsWith("/git/blobs")) return Response.json({ sha: "blob-sha" });
      throw Error("Unexpected request " + url);
    });
}
async function getSession() {
  const start = await worker.fetch(
    new Request("https://admin.test/auth/start"),
    env,
  );
  const state = new URL(start.headers.get("Location")!).searchParams.get(
    "state",
  );
  expect(
    new URL(start.headers.get("Location")!).searchParams.get(
      "code_challenge_method",
    ),
  ).toBe("S256");
  const callback = await worker.fetch(
    new Request(`https://admin.test/auth/callback?state=${state}&code=code`, {
      headers: { Cookie: start.headers.get("Set-Cookie")!.split(";")[0] },
    }),
    env,
  );
  const html = await callback.text();
  expect(html).not.toContain("ghu_test");
  const match = html.match(/session:("[^"]+")/);
  expect(match).toBeTruthy();
  return JSON.parse(match![1]);
}
describe("Autenticação e persistência GitHub", () => {
  it("recusa credencial adulterada e sessão expirada", async () => {
    mockGithub();
    const session = await getSession();
    const invalid = await worker.fetch(
      new Request("https://admin.test/content", {
        headers: {
          Origin: origin,
          Authorization: `Bearer ${session.slice(0, -4)}AAAA`,
        },
      }),
      env,
    );
    expect(invalid.status).toBe(401);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3600001);
    const expired = await worker.fetch(
      new Request("https://admin.test/content", {
        headers: { Origin: origin, Authorization: `Bearer ${session}` },
      }),
      env,
    );
    expect(expired.status).toBe(401);
  });
  it("faz upload e inclui arquivo e catálogo no mesmo commit", async () => {
    const spy = mockGithub();
    const session = await getSession();
    const changed = structuredClone(manifest);
    changed.students[0].materials.push({
      id: "new-pdf",
      title: "New lesson",
      kind: "pdf",
      date: "2026-10-21",
      path: "content/uploads/new.pdf",
    });
    const r = await worker.fetch(
      new Request("https://admin.test/publish", {
        method: "POST",
        headers: {
          Origin: origin,
          Authorization: `Bearer ${session}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          head: "abc",
          manifest: changed,
          uploads: [
            {
              path: "content/uploads/new.pdf",
              content: readFileSync(
                "public/content/uploads/everyday-words.pdf",
              ).toString("base64"),
            },
          ],
        }),
      }),
      env,
    );
    expect(r.status).toBe(200);
    const call = spy.mock.calls.find(([url]) =>
      String(url).endsWith("/git/trees"),
    );
    const body = JSON.parse(String(call?.[1]?.body));
    expect(body.tree).toContainEqual({
      path: "public/content/uploads/new.pdf",
      mode: "100644",
      type: "blob",
      sha: "blob-sha",
    });
    expect(
      body.tree.some(
        (entry: any) => entry.path === "public/content/manifest.json",
      ),
    ).toBe(true);
  });
  it("recusa origem externa e credencial ausente", async () => {
    const a = await worker.fetch(
      new Request("https://admin.test/content", {
        headers: { Origin: "https://evil.test" },
      }),
      env,
    );
    expect(a.status).toBe(403);
    const b = await worker.fetch(
      new Request("https://admin.test/content", {
        headers: { Origin: origin },
      }),
      env,
    );
    expect(b.status).toBe(401);
  });
  it("recusa callback sem state correspondente", async () => {
    const spy = mockGithub();
    const response = await worker.fetch(
      new Request("https://admin.test/auth/callback?state=forged&code=code"),
      env,
    );
    expect(await response.text()).toContain("Sign-in expired");
    expect(spy).not.toHaveBeenCalled();
  });
  it("recusa outra conta mesmo após OAuth", async () => {
    mockGithub("intruder");
    const start = await worker.fetch(
      new Request("https://admin.test/auth/start"),
      env,
    );
    const state = new URL(start.headers.get("Location")!).searchParams.get(
      "state",
    );
    const r = await worker.fetch(
      new Request(`https://admin.test/auth/callback?state=${state}&code=code`, {
        headers: { Cookie: start.headers.get("Set-Cookie")!.split(";")[0] },
      }),
      env,
    );
    expect(await r.text()).toContain("not authorised");
  });
  it("grava manifest e exclusão numa árvore, avança sem force e retorna commit", async () => {
    const spy = mockGithub();
    const session = await getSession();
    const changed = structuredClone(manifest);
    changed.students[0].materials = changed.students[0].materials.slice(0, 1);
    const r = await worker.fetch(
      new Request("https://admin.test/publish", {
        method: "POST",
        headers: {
          Origin: origin,
          Authorization: `Bearer ${session}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ head: "abc", manifest: changed, uploads: [] }),
      }),
      env,
    );
    expect(r.status).toBe(200);
    expect(((await r.json()) as any).head).toBe("new-commit");
    const tree = spy.mock.calls.find(([url]) =>
      String(url).endsWith("/git/trees"),
    );
    const body = JSON.parse(String(tree?.[1]?.body));
    expect(body.base_tree).toBe("old-tree");
    expect(body.tree).toContainEqual({
      path: "public/content/uploads/everyday-words.pdf",
      mode: "100644",
      type: "blob",
      sha: null,
    });
    const patch = spy.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
      sha: "new-commit",
      force: false,
    });
  });
  it("recusa head antigo antes de escrever", async () => {
    const spy = mockGithub();
    const session = await getSession();
    const r = await worker.fetch(
      new Request("https://admin.test/publish", {
        method: "POST",
        headers: {
          Origin: origin,
          Authorization: `Bearer ${session}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ head: "stale", manifest, uploads: [] }),
      }),
      env,
    );
    expect(r.status).toBe(409);
    expect(spy.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(
      false,
    );
  });
  it("recusa referência nova sem upload", async () => {
    mockGithub();
    const session = await getSession();
    const m = structuredClone(manifest);
    m.students[0].materials[1].path = "content/uploads/missing.pdf";
    const r = await worker.fetch(
      new Request("https://admin.test/publish", {
        method: "POST",
        headers: {
          Origin: origin,
          Authorization: `Bearer ${session}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ head: "abc", manifest: m, uploads: [] }),
      }),
      env,
    );
    expect(r.status).toBe(400);
  });
  it("verifica assinatura e tamanho e aceita os exemplos reais", () => {
    for (const name of [
      "everyday-words.pdf",
      "morning-routine.docx",
      "learning-desk.png",
    ])
      expect(() =>
        verifyFile(
          "content/uploads/" + name,
          readFileSync("public/content/uploads/" + name).toString("base64"),
        ),
      ).not.toThrow();
    expect(() =>
      verifyFile("content/uploads/evil.pdf", btoa("<script>bad</script>")),
    ).toThrow();
    expect(() =>
      verifyFile(
        "content/uploads/large.pdf",
        Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64"),
      ),
    ).toThrow();
  });
});
