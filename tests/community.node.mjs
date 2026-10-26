import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { Readable } from "node:stream";
import assert from "node:assert/strict";
import { createCommunity, accountLoader } from "../server/community.mjs";
import { fileStore } from "../server/store.mjs";
import test from "node:test";
import { setPassword } from "../server/passwords.mjs";
test("Student access, cross-session appearance persistence and chat join protection", async () => {
  const root = await fs.mkdtemp(path.resolve("node_modules/.community-test-"));
  const fixture = JSON.parse(
    await fs.readFile("public/content/manifest.json", "utf8"),
  );
  await fs.mkdir(path.join(root, "public/content"), { recursive: true });
  await fs.mkdir(path.join(root, ".student-auth"));
  await fs.writeFile(
    path.join(root, "public/content/manifest.json"),
    JSON.stringify(fixture),
  );
  const password = randomBytes(24).toString("base64url"),
    salt = randomBytes(16);
  await fs.writeFile(
    path.join(root, ".student-auth/accounts.json"),
    JSON.stringify({
      [fixture.students[0].id]: {
        salt: salt.toString("hex"),
        hash: scryptSync(password, salt, 64).toString("hex"),
      },
    }),
  );
  const hub = createCommunity({
    store: fileStore(root),
    accounts: accountLoader(root),
    allowedOrigin: (o) => o === "http://localhost:5173",
  });
  async function request(
    route,
    body = {},
    token = "",
    origin = "http://localhost:5173",
  ) {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]);
    Object.assign(req, {
      method: "POST",
      url: "/__community" + route,
      headers: {
        origin,
        "x-community-client": "1",
        authorization: "Bearer " + token,
      },
      socket: { remoteAddress: "127.0.0.1" },
    });
    let value;
    const res = {
      statusCode: 200,
      setHeader() {},
      end(s) {
        value = JSON.parse(s);
      },
    };
    await hub.handleHttp(req, res);
    return { status: res.statusCode, value };
  }
  try {
    assert.equal(
      (await request("/appearance", { font: "modern", background: "sky" }))
        .status,
      401,
    );
    assert.equal(
      (
        await request("/login", {
          studentId: fixture.students[0].id,
          password: "wrong-password",
        })
      ).status,
      401,
    );
    const a = await request("/login", {
      studentId: fixture.students[0].id,
      password,
    });
    assert.equal(a.status, 200);
    const b = await request("/login", {
      studentId: fixture.students[0].id,
      password,
    });
    assert.equal(b.status, 200);
    assert.equal(
      (
        await request(
          "/appearance",
          {
            studentId: fixture.students[1].id,
            font: "modern",
            background: "sky",
          },
          a.value.session,
        )
      ).status,
      200,
    );
    const reloaded = await request("/appearance/read", {}, b.value.session);
    assert.deepEqual(reloaded.value.appearance, {
      font: "modern",
      background: "sky",
    });
    const manifest = await fileStore(root).read();
    assert.equal(
      manifest.students[1].appearance,
      fixture.students[1].appearance,
    );
    assert.deepEqual(manifest.students[0].appearance, {
      font: "modern",
      background: "sky",
    });
    assert.equal(
      (
        await request(
          "/appearance",
          { font: "url(javascript:evil)", background: "sky" },
          a.value.session,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          "/chat/join",
          { name: "Guest A", room: "lobby" },
          "",
          "https://evil.test",
        )
      ).status,
      403,
    );
    assert.equal((await request("/logout", {}, a.value.session)).status, 200);
    assert.equal(
      (await request("/appearance/read", {}, a.value.session)).status,
      401,
    );
    const join = await request("/chat/join", {
      name: "Connection test",
      room: "lobby",
    });
    assert.equal(join.status, 200);
    assert.ok(join.value.ticket);
    const photo = "data:image/jpeg;base64,/9j/2Q==";
    assert.equal((await request("/appearance", { font: "modern", background: "sky", photo })).status, 401);
    assert.equal((await request("/appearance", { font: "modern", background: "sky", photo: "data:image/svg+xml,<svg/>" }, b.value.session)).status, 400);
    assert.equal((await request("/appearance", { font: "modern", background: "sky", photo: "data:image/jpeg;base64,/9j/" + "A".repeat(7000) }, b.value.session)).status, 400);
    assert.equal((await request("/appearance", { studentId: fixture.students[1].id, font: "modern", background: "sky", photo }, b.value.session)).status, 200);
    const photoSession = await request("/login", { studentId: fixture.students[0].id, password });
    assert.equal((await request("/appearance/read", {}, photoSession.value.session)).value.appearance.photo, photo);
    assert.deepEqual((await fileStore(root).read()).students[1], fixture.students[1]);
    assert.equal((await request("/appearance", { font: "classic", background: "sage" }, b.value.session)).status, 200);
    assert.equal((await request("/appearance/read", {}, photoSession.value.session)).value.appearance.photo, undefined);
    const forged = await request(
      "/publish",
      { manifest: fixture },
      b.value.session,
    );
    assert.equal(forged.status, 404);
    await assert.rejects(setPassword(root, fixture.students[0].id, "short"));
    await assert.rejects(setPassword(root, "missing-student", password));
    const newPassword = randomBytes(24).toString("base64url");
    await setPassword(root, fixture.students[0].id, newPassword);
    assert.equal((await request("/appearance/read", {}, b.value.session)).status, 401);
    assert.equal((await request("/login", { studentId: fixture.students[0].id, password })).status, 401);
    assert.equal((await request("/login", { studentId: fixture.students[0].id, password: newPassword })).status, 200);
    const privateFile = await fs.readFile(path.join(root, ".student-auth/accounts.json"), "utf8");
    assert.ok(!privateFile.includes(newPassword));
    console.log(
      "PASS: real preference persistence between separate student sessions, own-student scope, no teacher routes, password checks, origin restriction, safe theme values and logout.",
    );
  } finally {
    hub.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});
