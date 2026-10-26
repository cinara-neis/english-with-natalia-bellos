import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!process.stdin.isTTY) {
  console.error(
    "Run npm run admin:setup in an interactive terminal on your computer.",
  );
  process.exit(1);
}
readline.emitKeypressEvents(process.stdin);
async function password(prompt) {
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    function finish(error) {
      process.stdin.off("keypress", key);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      error ? reject(error) : resolve(value);
    }
    function key(text, key = {}) {
      if (key.ctrl && key.name === "c")
        return finish(Error("Setup cancelled."));
      if (key.name === "return") return finish();
      if (key.name === "backspace") {
        value = value.slice(0, -1);
        return;
      }
      if (text && !key.ctrl && !key.meta && text !== "\u001b") value += text;
    }
    process.stdin.on("keypress", key);
  });
}
try {
  console.log(
    "Set the teacher password for this local project. Input is hidden. Existing sessions will be invalidated.",
  );
  const first = await password("Password (12–256 characters): ");
  if (first.length < 12 || first.length > 256)
    throw Error("Use a password between 12 and 256 characters.");
  const second = await password("Confirm password: ");
  if (first !== second) throw Error("Passwords do not match.");
  const salt = randomBytes(16);
  const hash = await promisify(scryptCallback)(first, salt, 64);
  const folder = path.join(root, ".local-admin");
  await mkdir(folder, { recursive: true });
  await writeFile(
    path.join(folder, "credentials.json"),
    JSON.stringify({
      version: randomBytes(16).toString("hex"),
      salt: salt.toString("hex"),
      hash: hash.toString("hex"),
    }) + "\n",
    { mode: 0o600 },
  );
  console.log(
    "Teacher sign-in configured. Open the blog admin page and sign in. The password was not saved in plain text.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
