import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
if (!process.stdin.isTTY || !id || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
  console.error(
    "Run npm run student:setup -- STUDENT_ID in an interactive project terminal.",
  );
  process.exit(1);
}
const manifest = JSON.parse(
  await readFile(path.join(root, "public/content/manifest.json"), "utf8"),
);
const student = manifest.students.find((s) => s.id === id);
if (!student) {
  console.error("Student ID not found in the blog.");
  process.exit(1);
}
readline.emitKeypressEvents(process.stdin);
function hidden(prompt) {
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (e) => {
      process.stdin.off("keypress", key);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      e ? reject(e) : resolve(value);
    };
    const key = (text, k = {}) => {
      if (k.ctrl && k.name === "c") return finish(Error("Cancelled."));
      if (k.name === "return") return finish();
      if (k.name === "backspace") {
        value = value.slice(0, -1);
        return;
      }
      if (text && !k.ctrl && !k.meta && text !== "\u001b") value += text;
    };
    process.stdin.on("keypress", key);
  });
}
try {
  console.log(
    "Set a separate student password for " +
      student.name +
      ". This never grants teacher access.",
  );
  const password = await hidden("Student password (12–256 characters): ");
  if (password.length < 12 || password.length > 256)
    throw Error("Use 12–256 characters.");
  if (password !== (await hidden("Confirm password: ")))
    throw Error("Passwords do not match.");
  const folder = path.join(root, ".student-auth");
  await mkdir(folder, { recursive: true });
  const filename = path.join(folder, "accounts.json");
  let accounts = {};
  try {
    accounts = JSON.parse(await readFile(filename, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const salt = randomBytes(16);
  accounts[id] = {
    salt: salt.toString("hex"),
    hash: scryptSync(password, salt, 64).toString("hex"),
  };
  await writeFile(filename, JSON.stringify(accounts, null, 2) + "\n", {
    mode: 0o600,
  });
  console.log(
    "Student access configured locally. For hosted sync, copy the private accounts JSON into the community service STUDENT_ACCOUNTS_JSON secret. Never commit this file or put it in VITE variables.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
