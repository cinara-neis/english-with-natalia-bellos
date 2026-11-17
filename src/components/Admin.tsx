import { useEffect, useRef, useState } from "react";
import { Github, Plus, Trash2, LogOut, Users, FolderOpen, ChartNoAxesColumn, Newspaper, FileText, Image, Contact, Settings } from "lucide-react";
import {
  fileKind,
  MAX_FILE,
  validateManifest,
  type Manifest,
  type Material,
} from "../../shared/content";
import {
  adminRequest,
  api,
  asBase64,
  login,
  repoUrl,
  localEditing,
} from "../lib";
import * as S from "../styles";
import styled from "styled-components";
import TeacherAccess from "./TeacherAccess";
import TeacherPostEditor from "./TeacherPostEditor";
import StudentProgressEditor from "./StudentProgressEditor";
import PasswordManager from "./PasswordManager";
import StudentInvite from "./StudentInvite";
import PageContentEditor from "./PageContentEditor";
import MaterialEditor from "./MaterialEditor";
import StudentFiles from "./StudentFiles";
type UploadData = { path: string; content: string };
const tools = [
  { id: "documents", label: "Student documents", icon: FolderOpen },
  { id: "students", label: "Students", icon: Users },
  { id: "progress", label: "Learning progress", icon: ChartNoAxesColumn },
  { id: "posts", label: "Homepage posts", icon: Newspaper },
  { id: "pages", label: "Page texts", icon: FileText },
  { id: "portrait", label: "Photo and stickers", icon: Image },
  { id: "details", label: "Contacts and About", icon: Contact },
  { id: "access", label: "Account", icon: Settings },
] as const;

const Dashboard = styled.div`
  display: grid;
  grid-template-columns: minmax(12rem, 15rem) minmax(0, 1fr);
  gap: clamp(1rem, 3vw, 2.5rem);
  align-items: start;
  @media (max-width: 48rem) { grid-template-columns: minmax(0, 1fr); }
`;

const Menu = styled.nav`
  display: grid;
  gap: .25rem;
  padding: .75rem;
  border: 1px solid #dce4d5;
  border-radius: 1rem;
  background: #eef1e7;
  @media (min-width: 48.001rem) {
    position: sticky;
    top: 1rem;
  }
  @media (max-width: 48rem) {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
  }
`;

const MenuButton = styled.button`
  display: flex;
  align-items: center;
  gap: .65rem;
  text-align: left;
  color: #263a34;
  background: transparent;
  border: 1px solid transparent;
  border-radius: .55rem;
  font: inherit;
  padding: .65rem;
  min-height: 44px;
  cursor: pointer;
  &:hover { background: #e1e9d6; }
  &[aria-current="true"] {
    background: #dce7d3;
    border-color: #526548;
    font-weight: 700;
  }
  svg { flex: none; }
`;

const Workspace = styled.div`
  min-width: 0;
  h2 { scroll-margin-top: 6rem; }
`;

export default function Admin({ publicData }: { publicData: Manifest }) {
  const [section, setSection] = useState<(typeof tools)[number]["id"]>("documents");
  const sectionHeading = useRef<HTMLHeadingElement>(null);
  const focusSection = useRef(false);
  const [session, setSession] = useState("");
  const [localPassword, setLocalPassword] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [onlinePassword, setOnlinePassword] = useState(false);
  const [localConfigured, setLocalConfigured] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<Manifest>(publicData);
  const [head, setHead] = useState("");
  const [uploads, setUploads] = useState<UploadData[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "file">("file");
  const [file, setFile] = useState<File>();
  const [imageDescription, setImageDescription] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const [commit, setCommit] = useState("");
  const [pendingAnnouncement, setPendingAnnouncement] = useState("");
  const chosen = draft.students.find((s) => s.id === studentId);
  useEffect(() => {
    if (!focusSection.current) return;
    focusSection.current = false;
    sectionHeading.current?.focus({ preventScroll: true });
    sectionHeading.current?.scrollIntoView?.({ block: "nearest" });
  }, [section]);
  useEffect(() => {
    if (localEditing)
      adminRequest("/status", "")
        .then((r) => setLocalConfigured(r.configured === true))
        .catch((e) => setError(e.message));
    else if (api)
      adminRequest("/status", "").then(r => setOnlinePassword(r.mode === "password")).catch(() => {});
  }, []);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  const change = (d: Manifest) => {
    setDraft(d);
    setDirty(true);
    setMessage("");
    setCommit("");
  };
  async function task(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && e.status === 401)
        setSession("");
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  function connect() {
    void task(async () => {
      let s: string;
      if (localEditing || onlinePassword) {
        try {
          s = (await adminRequest("/login", "", { email: teacherEmail, password: localPassword }))
            .session;
        } finally {
          setLocalPassword("");
        }
      } else s = await login();
      const result = await adminRequest("/content", s);
      validateManifest(result.manifest);
      setSession(s);
      setDraft(result.manifest);
      setHead(result.head);
      setDirty(false);
      setUploads([]);
      setMessage(
        localEditing
          ? "Local editor ready. Changes are saved to this project on your computer."
          : "Connected to GitHub. Your session lasts up to one hour and ends when you reload the page.",
      );
    });
  }
  function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = crypto.randomUUID();
    change({
      ...draft,
      students: [
        ...draft.students,
        { id, name: name.trim(), level, materials: [] },
      ],
    });
    setStudentId(id);
    setName("");
    setPendingAnnouncement(
      localEditing
        ? "Student added to draft. Choose Save to project to save on this computer."
        : "Student added to draft. Publish changes to save to GitHub.",
    );
  }
  async function addMaterial(e: React.FormEvent) {
    e.preventDefault();
    void task(async () => {
      if (!chosen) throw Error("Select a student.");
      let a: Material = {
        id: crypto.randomUUID(),
        title: title.trim(),
        kind: "text",
        date: new Date().toLocaleDateString("sv-SE"),
        text: text.trim(),
      };
      if (mode === "file") {
        if (!file) throw Error("Choose a file.");
        const kind = fileKind(file.name);
        if (!kind) throw Error("Use PDF, DOCX, DOC, PNG, JPG or WebP.");
        if (file.size > MAX_FILE || file.size === 0)
          throw Error("The file must be between 1 byte and 2 MiB.");
        if (uploads.length >= 5)
          throw Error("Publish your pending files before adding more.");
        const path = `content/uploads/${crypto.randomUUID()}.${file.name.split(".").pop()!.toLowerCase()}`;
        a = {
          ...a,
          kind,
          path,
          ...(kind === "image" ? { alt: imageDescription.trim() } : {}),
        };
        delete a.text;
        setUploads([...uploads, { path, content: await asBase64(file) }]);
      }
      const next = {
        ...draft,
        students: draft.students.map((s) =>
          s.id === studentId ? { ...s, materials: [a, ...s.materials] } : s,
        ),
      };
      validateManifest(next);
      change(next);
      setTitle("");
      setText("");
      setFile(undefined);
      setImageDescription("");
      setFileKey((k) => k + 1);
      setPendingAnnouncement(
        localEditing
          ? "Material added to draft. Choose Save to project to save on this computer."
          : "Material added to draft. Publish changes to save to GitHub.",
      );
    });
  }
  function publish() {
    void task(async () => {
      validateManifest(draft);
      const paths = new Set(
        draft.students.flatMap((s) => s.materials.map((a) => a.path)),
      );
      const result = await adminRequest("/publish", session, {
        head,
        manifest: draft,
        uploads: uploads.filter((u) => paths.has(u.path)),
      });
      setHead(result.head);
      setUploads([]);
      setDirty(false);
      setCommit(result.commit);
      setPendingAnnouncement("");
      setMessage(
        localEditing
          ? `Saved to this project. Your files are in public/content/uploads and the student list is in public/content/manifest.json.${result.retained ? " Some unreferenced files could not be removed from disk." : ""} This does not publish the blog online.`
          : "Saved to GitHub. Visitors will see the update after the GitHub Pages deployment succeeds.",
      );
      if (localEditing) window.dispatchEvent(new Event("blog-content-saved"));
    });
  }
  async function editMaterial(original: Material, next: Material, replacement?: File) {
    if (!chosen) throw Error("Select a student.");
    setBusy(true);
    try {
      let updated = { ...next };
      const referenced = new Set(draft.students.flatMap(s => s.materials.map(m => m.path)));
      let nextUploads = uploads.filter(u => referenced.has(u.path));
      if (replacement) {
        const kind = fileKind(replacement.name);
        if (!kind || !replacement.size || replacement.size > MAX_FILE) throw Error("Choose a supported file up to 2 MiB.");
        nextUploads = nextUploads.filter(u => u.path !== original.path);
        if (nextUploads.length >= 5) throw Error("Save your pending files before replacing more.");
        const path = `content/uploads/${crypto.randomUUID()}.${replacement.name.split(".").pop()!.toLowerCase()}`;
        updated = { ...updated, kind, path };
        delete updated.text;
        if (kind !== "image") delete updated.alt;
        nextUploads = [...nextUploads, { path, content: await asBase64(replacement) }];
      }
      const nextDraft = { ...draft, students: draft.students.map(s => s.id === chosen.id ? { ...s, materials: s.materials.map(m => m.id === original.id ? updated : m) } : s) };
      validateManifest(nextDraft);
      change(nextDraft);
      setUploads(nextUploads);
      setPendingAnnouncement("Material updated in draft. Save or publish all changes to update the site.");
    } finally { setBusy(false); }
  }
  return (
    <>
      <h1>Teacher dashboard</h1>
      {!session && <details style={{ marginBottom: "1rem" }}><summary style={{ cursor: "pointer" }}>Forgot your teacher password?</summary><p>{localEditing ? "The project owner can reset teacher access by running npm run admin:setup on this computer. A visitor cannot reset it through this public page." : onlinePassword ? "Ask the site administrator to reset your teacher password." : "Teacher access uses your authorised GitHub account. Recover that account through GitHub."}</p>{!localEditing && !onlinePassword && <a href="https://github.com/password_reset" target="_blank" rel="noopener noreferrer">Recover GitHub account (opens in a new tab)</a>}</details>}
      <S.ScreenReaderOnly role="status" aria-live="polite">
        {busy ? "Working. Please wait." : pendingAnnouncement}
      </S.ScreenReaderOnly>
      {!api ? (
        <S.Panel>
          <h2>Teacher access is locked</h2>
          <p>
            Teacher sign-in is not configured. Management tools are unavailable
            until the site owner finishes the GitHub App setup.
          </p>
        </S.Panel>
      ) : !session ? (
        <S.Panel>
          <h2>Hello, teacher.</h2>
          <p>
            Only the authorised teacher can open the management tools.{" "}
            {localEditing
              ? "Sign in with your local teacher password."
              : onlinePassword ? "Sign in with your teacher email and password." : "Sign in with your authorised GitHub account. Other accounts cannot manage this blog."}
          </p>
          {localEditing || onlinePassword ? (
            <>
              {localEditing && localConfigured === false && (
                <S.Notice>
                  Teacher access is locked until you configure a password. Run{" "}
                  <code>npm run admin:setup</code> in the project terminal on
                  this computer, then reload this page. No default password
                  exists.
                </S.Notice>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  connect();
                }}
              >
                {onlinePassword && <>
                  <label htmlFor="teacher-email">Teacher email</label>
                  <input id="teacher-email" type="email" autoComplete="username" maxLength={254} required value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} />
                </>}
                <label htmlFor="teacher-password">Teacher password</label>
                <input
                  id="teacher-password"
                  type="password"
                  autoComplete="current-password"
                  minLength={12}
                  maxLength={256}
                  required
                  value={localPassword}
                  onChange={(e) => setLocalPassword(e.target.value)}
                  aria-describedby="password-help"
                />
                <p id="password-help">
                  Your password is checked securely. This session
                  ends when you sign out, reload the page or after one hour.
                </p>
                <S.Button
                  type="submit"
                  disabled={busy || (localEditing && localConfigured !== true)}
                >
                  {busy ? "Signing in…" : "Sign in as teacher"}
                </S.Button>
              </form>
            </>
          ) : (
            <>
              <p id="sign-in-help">
                GitHub sign-in opens in a separate window.
              </p>
              <S.Button
                onClick={connect}
                disabled={busy}
                aria-describedby="sign-in-help"
              >
                <Github size={17} />
                {busy ? "Connecting…" : "Sign in with GitHub"}
              </S.Button>
            </>
          )}
        </S.Panel>
      ) : (
        <Dashboard>
          <Menu aria-label="Teacher tools">
            {tools.map(({ id, label, icon: Icon }) => (
              <MenuButton
                key={id}
                type="button"
                disabled={busy}
                aria-current={section === id ? "true" : undefined}
                onClick={() => {
                  if (section === id) return;
                  focusSection.current = true;
                  setSection(id);
                }}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </MenuButton>
            ))}
          </Menu>
          <Workspace>
            <S.SaveBar>
              <S.Button type="button" disabled={!dirty || busy} onClick={publish}>
                {busy ? "Please wait…" : localEditing ? "Save to project" : "Publish changes"}
              </S.Button>
              <S.Chip>{dirty ? "Unsaved changes" : "All changes saved"}</S.Chip>
            </S.SaveBar>
            {error && <S.Notice $error role="alert">{error}</S.Notice>}
            {message && <S.Notice role="status">{message}</S.Notice>}
            {commit && repoUrl && !localEditing && (
              <p><a href={`${repoUrl}/actions`} target="_blank" rel="noreferrer">
                Track deployment on GitHub Actions (opens in a new tab)
              </a></p>
            )}
            <h2 ref={sectionHeading} tabIndex={-1}>{tools.find(tool => tool.id === section)?.label}</h2>
            {section === "documents" && (
              <p>Published materials are public. Removed files can remain in Git history or previous downloads.</p>
            )}
            <fieldset disabled={busy} aria-busy={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <S.ScreenReaderOnly as="legend">Blog management</S.ScreenReaderOnly>
              <div hidden={section !== "documents" && section !== "students" && section !== "progress"}>
            <S.Panel>
              <h3 id="student-tools" tabIndex={-1}>
                Select a student
              </h3>
              <p id="student-selection-help">
                Choose whose information you want to manage.
              </p>
              <label htmlFor="studentSelect">Student to manage</label>
              <select
                id="studentSelect"
                value={studentId}
                aria-describedby="student-selection-help"
                onChange={(e) => {
                  setStudentId(e.target.value);
                  setTitle("");
                  setText("");
                  setFile(undefined);
                  setImageDescription("");
                  setFileKey((k) => k + 1);
                }}
              >
                <option value="">Select a student</option>
                {draft.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <S.Notice role="status">
                {chosen
                  ? `Selected student: ${chosen.name}.`
                  : draft.students.length
                    ? "Choose a student to continue."
                    : "Add your first student in Students."}
              </S.Notice>
            </S.Panel>
              </div>
              <div hidden={section !== "documents"}>
            {chosen && (
              <S.Panel>
                <h3>Add a material for {chosen.name}</h3>
                <form onSubmit={addMaterial}>
                  <label htmlFor="materialTitle">Title</label>
                  <input
                    id="materialTitle"
                    required
                    maxLength={150}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <label htmlFor="materialMode">Material type</label>
                  <select
                    id="materialMode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "text" | "file")}
                  >
                    <option value="file">File</option>
                    <option value="text">Text</option>
                  </select>
                  {mode === "text" ? (
                    <>
                      <label htmlFor="text">Activity text</label>
                      <textarea
                        id="text"
                        required
                        maxLength={20000}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                    </>
                  ) : (
                    <>
                      <label htmlFor="file">
                        PDF, Word or image • up to 2 MiB
                      </label>
                      <input
                        key={fileKey}
                        id="file"
                        type="file"
                        required
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                        aria-describedby="upload-help"
                        onChange={(e) => setFile(e.target.files?.[0])}
                      />
                      <small id="upload-help">
                        Up to 5 files per publication. Only upload trusted
                        files. Use accessible documents with headings,
                        selectable text and image descriptions.
                      </small>
                      {file && fileKind(file.name) === "image" && (
                        <>
                          <label htmlFor="image-description">
                            Image description (required)
                          </label>
                          <textarea
                            id="image-description"
                            required
                            maxLength={1000}
                            value={imageDescription}
                            onChange={(e) =>
                              setImageDescription(e.target.value)
                            }
                            aria-describedby="image-description-help"
                          />
                          <small id="image-description-help">
                            Describe the information a student needs to
                            understand the image, including important text.
                          </small>
                        </>
                      )}
                    </>
                  )}
                  <p />
                  <S.Button>
                    <Plus size={16} /> Add to draft
                  </S.Button>
                </form>
                <hr
                  style={{
                    border: 0,
                    borderTop: "1px solid #e0e5d8",
                    margin: "26px 0",
                  }}
                />
                {chosen.materials.map((a) => (
                  <S.Row key={a.id}>
                    <span>
                      {a.title} <small>({a.kind})</small>
                    </span>
                    <MaterialEditor material={a} onSave={(next, replacement) => editMaterial(a, next, replacement)} />
                    <S.LinkButton
                      aria-label={`Delete ${a.title}`}
                      onClick={() => {
                        if (
                          confirm(
                            `Remove “${a.title}” from the current version?`,
                          )
                        )
                          change({
                            ...draft,
                            students: draft.students.map((s) =>
                              s.id === studentId
                                ? {
                                    ...s,
                                    materials: s.materials.filter(
                                      (m) => m.id !== a.id,
                                    ),
                                  }
                                : s,
                            ),
                          });
                      }}
                    >
                      <Trash2 size={16} />
                    </S.LinkButton>
                  </S.Row>
                ))}
              </S.Panel>
            )}
            {section === "documents" && chosen && <StudentFiles key={chosen.id} studentId={chosen.id} session={session} teacher />}
              </div>
            {section === "progress" && chosen && (
              <StudentProgressEditor
                student={chosen}
                onChange={(student) =>
                  change({
                    ...draft,
                    students: draft.students.map((s) =>
                      s.id === student.id ? student : s,
                    ),
                  })
                }
              />
            )}
            {section === "posts" && <TeacherPostEditor
              draft={draft}
              onChange={change}
              onNotice={setPendingAnnouncement}
            />}
            {(section === "pages" || section === "portrait") && (
              <PageContentEditor
                key={section}
                section={section}
                draft={draft}
                onChange={change}
                onBusyChange={setBusy}
              />
            )}
            {section === "details" && (
            <S.Panel>
              <h2 id="blog-details-heading" tabIndex={-1}>Your blog</h2>
              <label htmlFor="blogName">Blog name</label>
              <input
                id="blogName"
                maxLength={100}
                value={draft.blogName}
                onChange={(e) => change({ ...draft, blogName: e.target.value })}
              />
              <label htmlFor="teacher">Teacher’s name</label>
              <input
                id="teacher"
                maxLength={100}
                value={draft.teacher}
                onChange={(e) => change({ ...draft, teacher: e.target.value })}
              />
              <label htmlFor="email">Public contact email</label>
              <input
                id="email"
                type="email"
                maxLength={200}
                value={draft.email}
                onChange={(e) => change({ ...draft, email: e.target.value })}
              />
              <label htmlFor="instagram">Instagram profile URL</label>
              <input id="instagram" type="url" maxLength={100} placeholder="https://www.instagram.com/your.profile/" value={draft.instagram || ""} onChange={(e) => change({ ...draft, instagram: e.target.value })} />
              <label htmlFor="about">About</label>
              <textarea
                id="about"
                maxLength={5000}
                value={draft.about}
                onChange={(e) => change({ ...draft, about: e.target.value })}
              />
            </S.Panel>)}
            {section === "students" && <S.Panel>
              <h3>Add or manage a student</h3>
              <form onSubmit={addStudent}>
                <S.Row style={{ alignItems: "end" }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="studentName">Student’s name</label>
                    <input
                      id="studentName"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="level">English level (private)</label>
                    <select
                      id="level"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                    >
                      <option value="">Not set</option>
                      {[
                        "A1 · Beginner",
                        "A2 · Elementary",
                        "B1 · Intermediate",
                        "B2 · Upper intermediate",
                        "C1 · Advanced",
                        "C2 · Proficient",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <S.Button disabled={draft.students.length >= 100}>
                    <Plus size={15} /> Add student
                  </S.Button>
                </S.Row>
              </form>
              {chosen && (
                <>
                  <StudentInvite key={chosen.id} session={session} studentId={chosen.id} />
                  <S.Row style={{ marginTop: 18 }}>
                    <strong>{chosen.name}</strong>
                    <S.LinkButton
                      onClick={() => {
                        if (
                          confirm(
                            `Delete ${chosen.name} and all their materials from the current version?`,
                          )
                        ) {
                          change({
                            ...draft,
                            students: draft.students.filter(
                              (s) => s.id !== studentId,
                            ),
                          });
                          setStudentId("");
                        }
                      }}
                    >
                      <Trash2 size={15} /> Delete student
                    </S.LinkButton>
                  </S.Row>
                  <label htmlFor="rename">Edit student’s name</label>
                  <input
                    id="rename"
                    maxLength={100}
                    value={chosen.name}
                    onChange={(e) =>
                      change({
                        ...draft,
                        students: draft.students.map((s) =>
                          s.id === studentId
                            ? { ...s, name: e.target.value }
                            : s,
                        ),
                      })
                    }
                  />
                  <label htmlFor="editLevel">English level (private)</label>
                  <p><small>Only you and this student can see the level after signing in.</small></p>
                  <input
                    id="editLevel"
                    maxLength={50}
                    value={chosen.level || ""}
                    onChange={(e) =>
                      change({
                        ...draft,
                        students: draft.students.map((s) =>
                          s.id === studentId
                            ? { ...s, level: e.target.value }
                            : s,
                        ),
                      })
                    }
                  />
                </>
              )}
            </S.Panel>}
            {section === "access" && (
              <S.Panel>
                <TeacherAccess onlinePassword={onlinePassword} />
      {!onlinePassword && <PasswordManager session={session} onTeacherChanged={() => { setSession(""); setMessage("Password changed. Sign in with your new teacher password."); }} />}
                <S.Button
                  type="button"
                  $secondary
                  onClick={() => {
                    if (dirty && !confirm("Discard unpublished changes and sign out?")) return;
                    if (localEditing) void adminRequest("/logout", session, {}).catch(() => {});
                    setSession("");
                    setDirty(false);
                    setUploads([]);
                    setMessage("");
                    setError("");
                    setCommit("");
                  }}
                >
                  <LogOut size={16} /> Sign out
                </S.Button>
              </S.Panel>
            )}
            </fieldset>
          </Workspace>
        </Dashboard>
      )}
      {!session && error && <S.Notice $error role="alert">{error}</S.Notice>}
      {!session && message && <S.Notice role="status">{message}</S.Notice>}
    </>
  );
}
