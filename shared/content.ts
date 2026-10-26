export type Material = {
  id: string;
  title: string;
  kind: "text" | "pdf" | "docx" | "doc" | "image";
  date: string;
  text?: string;
  path?: string;
  alt?: string;
};
export type Student = {
  id: string;
  name: string;
  level: string;
  materials: Material[];
  progress?: { percent: number; goal: string; note: string };
  appearance?: {
    photo?: string;
    font: "classic" | "modern" | "rounded" | "mono";
    background: "sage" | "sky" | "rose" | "sand" | "lavender";
  };
};
export type TeacherPost = {
  id: string;
  title: string;
  body: string;
  date: string;
};
export type Manifest = {
  version: 1;
  blogName: string;
  teacher: string;
  about: string;
  email: string;
  instagram?: string;
  students: Student[];
  posts?: TeacherPost[];
};
export const MAX_FILE = 2 * 1024 * 1024;
export const uploadPath =
  /^content\/uploads\/[a-zA-Z0-9_-]+\.(pdf|docx|doc|png|jpg|jpeg|webp)$/;
export function fileKind(name: string): Material["kind"] | undefined {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "pdf" || ext === "docx" || ext === "doc"
    ? ext
    : ["png", "jpg", "jpeg", "webp"].includes(ext || "")
      ? "image"
      : undefined;
}
export function validateManifest(value: unknown): asserts value is Manifest {
  const m = value as Manifest;
  const str = (s: unknown, max: number, empty = false) =>
    typeof s === "string" && (empty || s.trim().length > 0) && s.length <= max;
  if (
    !m ||
    m.version !== 1 ||
    !str(m.blogName, 100) ||
    !str(m.teacher, 100) ||
    !str(m.about, 5000, true) ||
    !str(m.email, 200, true) ||
    !Array.isArray(m.students) ||
    m.students.length > 100
  )
    throw new Error("Invalid manifest. Please check the blog details.");
  const ids = new Set<string>();
  if (m.instagram !== undefined && (typeof m.instagram !== "string" || (m.instagram !== "" && !/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?$/.test(m.instagram))))
    throw new Error("Use a valid Instagram profile URL.");
  if (m.posts !== undefined) {
    if (!Array.isArray(m.posts) || m.posts.length > 100)
      throw new Error("Use no more than 100 teacher posts.");
    const postIds = new Set<string>();
    for (const p of m.posts) {
      if (
        !p ||
        typeof p.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(p.id) ||
        postIds.has(p.id) ||
        !str(p.title, 150) ||
        !str(p.body, 20000) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(p.date)
      )
        throw new Error("Invalid or duplicate teacher post.");
      postIds.add(p.id);
    }
  }
  const materialIds = new Set<string>();
  for (const s of m.students) {
    if (
      !s ||
      typeof s.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(s.id) ||
      ids.has(s.id) ||
      !str(s.name, 100) ||
      !str(s.level, 50) ||
      !Array.isArray(s.materials) ||
      s.materials.length > 200
    )
      throw new Error("Invalid or duplicate student.");
    ids.add(s.id);
    if (
      s.appearance !== undefined &&
      (!s.appearance ||
        (s.appearance.photo !== undefined && (typeof s.appearance.photo !== "string" || s.appearance.photo.length > 6000 || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(s.appearance.photo))) ||
        !["classic", "modern", "rounded", "mono"].includes(s.appearance.font) ||
        !["sage", "sky", "rose", "sand", "lavender"].includes(
          s.appearance.background,
        ))
    )
      throw new Error("Invalid student appearance.");
    if (
      s.progress !== undefined &&
      (!s.progress ||
        !Number.isInteger(s.progress.percent) ||
        s.progress.percent < 0 ||
        s.progress.percent > 100 ||
        !str(s.progress.goal, 200) ||
        !str(s.progress.note, 2000, true))
    )
      throw new Error(
        "Progress needs a learning goal, a percentage from 0 to 100 and a valid note.",
      );
    for (const a of s.materials) {
      if (
        !a ||
        typeof a.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(a.id) ||
        materialIds.has(a.id) ||
        !str(a.title, 150) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(a.date)
      )
        throw new Error("Invalid material.");
      materialIds.add(a.id);
      if (a.kind === "text") {
        if (!str(a.text, 20000))
          throw new Error("The text is empty or too long.");
      } else if (
        !a.path ||
        !uploadPath.test(a.path) ||
        fileKind(a.path) !== a.kind
      )
        throw new Error("Invalid file path or format.");
      if (a.kind === "image" && !str(a.alt, 1000))
        throw new Error(
          "Images need a description for people who cannot see them.",
        );
    }
  }
}
