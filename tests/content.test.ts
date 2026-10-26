import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { validateManifest, fileKind, type Manifest } from "../shared/content";
const data = JSON.parse(
  readFileSync("public/content/manifest.json", "utf8"),
) as Manifest;
describe("Catálogo público", () => {
  it("accepts editable page copy and rejects unknown settings, empty copy and remote teacher images", () => {
    const m: Manifest = structuredClone(data);
    m.pageContent = { homeTitle: "Welcome to my lessons", contactIntro: "Ask me about lessons." };
    expect(() => validateManifest(m)).not.toThrow();
    m.pageContent.homeTitle = "";
    expect(() => validateManifest(m)).toThrow("Page texts");
    m.pageContent = JSON.parse('{"backendUrl":"https://example.com"}');
    expect(() => validateManifest(m)).toThrow("Page texts");
    delete m.pageContent;
    m.teacherPhoto = { src: "https://example.com/photo.jpg", alt: "Teacher portrait" };
    expect(() => validateManifest(m)).toThrow("teacher profile");
  });
  it("aceita progresso e posts e rejeita percentuais fora do intervalo", () => {
    const m = structuredClone(data);
    m.students[0].progress = {
      percent: 65,
      goal: "Introduce myself",
      note: "Good progress.",
    };
    m.posts = [
      {
        id: "teacher-note",
        title: "Practice this week",
        body: "Read a little every day.",
        date: "2026-10-21",
      },
    ];
    expect(() => validateManifest(m)).not.toThrow();
    m.students[0].progress.percent = 101;
    expect(() => validateManifest(m)).toThrow("Progress needs");
    m.students[0].progress.percent = 0;
    m.posts.push(m.posts[0]);
    expect(() => validateManifest(m)).toThrow(
      "Invalid or duplicate teacher post",
    );
  });
  it("exige uma descrição para imagens informativas", () => {
    const m = structuredClone(data);
    const image = m.students
      .flatMap((s) => s.materials)
      .find((a) => a.kind === "image")!;
    delete image.alt;
    expect(() => validateManifest(m)).toThrow("Images need a description");
  });
  it("o DOCX de exemplo contém o texto usado na prévia", () => {
    const files = unzipSync(
      readFileSync("public/content/uploads/morning-routine.docx"),
      {
        filter: (f) =>
          f.name === "word/document.xml" && f.originalSize <= 4 * 1024 * 1024,
      },
    );
    expect(strFromU8(files["word/document.xml"])).toContain(
      "My morning routine",
    );
  });
  it("aceita o manifest entregue e todos os arquivos existem", () => {
    validateManifest(data);
    for (const s of data.students)
      for (const a of s.materials)
        if (a.path) expect(existsSync(resolve("public", a.path))).toBe(true);
  });
  it("rejeita caminhos fora da pasta de uploads e HTML ativo", () => {
    for (const path of [
      "../secret.pdf",
      "content/uploads/evil.html",
      "https://evil.test/a.pdf",
      "content/uploads/a.svg",
    ]) {
      const m = structuredClone(data);
      m.students[0].materials[1].path = path;
      expect(() => validateManifest(m)).toThrow();
    }
  });
  it("rejeita aluno duplicado e texto vazio", () => {
    const m = structuredClone(data);
    m.students.push(m.students[0]);
    expect(() => validateManifest(m)).toThrow();
    const n = structuredClone(data);
    n.students[0].materials[0].text = "";
    expect(() => validateManifest(n)).toThrow();
  });
  it("classifica Word e imagens e rejeita executáveis", () => {
    expect(fileKind("a.DOCX")).toBe("docx");
    expect(fileKind("a.png")).toBe("image");
    expect(fileKind("a.exe")).toBeUndefined();
  });
});
