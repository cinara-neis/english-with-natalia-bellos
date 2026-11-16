const encoder = new TextEncoder();
const context = encoder.encode("natalia-student-levels-v1");
const encode = (bytes) => btoa(String.fromCharCode(...bytes));
const decode = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
export function newLevelsKey() {
  return encode(crypto.getRandomValues(new Uint8Array(32)));
}
async function importKey(secret) {
  if (!secret) throw Error("Private student levels are not configured on this service.");
  const bytes = decode(secret);
  if (bytes.length !== 32) throw Error("Invalid private levels key.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function readPrivateLevels(sealed, secret) {
  if (!sealed) return {};
  const [iv, data] = sealed.split(".");
  const result = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(iv), additionalData: context },
    await importKey(secret), decode(data),
  );
  return JSON.parse(new TextDecoder().decode(result));
}
export async function protectLevels(manifest, secret) {
  const levels = Object.create(null);
  const { privateLevels: _previous, ...rest } = manifest;
  const students = manifest.students.map(({ level, ...student }) => {
    if (typeof level === "string" && level.trim()) levels[student.id] = level.trim();
    return student;
  });
  if (!Object.keys(levels).length) return { ...rest, students };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const result = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: context },
    await importKey(secret), encoder.encode(JSON.stringify(levels)),
  );
  return { ...rest, students, privateLevels: encode(iv) + "." + encode(new Uint8Array(result)) };
}
export async function revealLevels(manifest, secret) {
  const { privateLevels, ...rest } = manifest;
  const levels = await readPrivateLevels(privateLevels, secret);
  return { ...rest, students: manifest.students.map(({ level: legacy, ...student }) => ({
    ...student,
    ...(Object.hasOwn(levels, student.id) ? { level: levels[student.id] } :
      typeof legacy === "string" ? { level: legacy } : {}),
  })) };
}
