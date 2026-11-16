import { createHash, randomBytes } from "node:crypto";
const password = randomBytes(24).toString("base64url");
console.log("Teacher password (share privately): " + password);
console.log("TEACHER_PASSWORD_HASH (Cloudflare secret): " + createHash("sha256").update(password).digest("hex"));
