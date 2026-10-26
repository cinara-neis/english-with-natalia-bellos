import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  FileText,
  Image,
  Leaf,
  LockKeyhole,
  Search,
  Sparkles,
  Instagram,
  Mail,
} from "lucide-react";
import type { Manifest, Material, Student } from "../shared/content";
import { base, loadPublic } from "./lib";
import * as S from "./styles";
import Admin from "./components/Admin";
import MaterialViewer from "./components/MaterialViewer";
import AccessibilityControls from "./components/AccessibilityControls";
import LearningUpdates from "./components/LearningUpdates";
import LearnerSpace from "./components/LearnerSpace";
import LiveChat from "./components/LiveChat";
import ContactForm from "./components/ContactForm";
import { pageContent } from "../shared/pageContent";
type Page = "home" | "about" | "contact" | "admin";
function route(): Page {
  const p = location.hash
    ? location.hash.slice(2)
    : location.pathname.match(/\/(admin|about|contact)\/?$/)?.[1];
  return p && ["about", "contact", "admin"].includes(p) ? (p as Page) : "home";
}
export default function App() {
  const [page, setPage] = useState<Page>(route);
  const [data, setData] = useState<Manifest>();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [appearancePreview, setAppearancePreview] =
    useState<Student["appearance"]>();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [view, setView] = useState<Material>();
  const [studentsOpen, setStudentsOpen] = useState(() =>
    window.matchMedia
      ? window.matchMedia("(min-width: 62.001rem)").matches
      : true,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(min-width: 62.001rem)");
    const change = () => setStudentsOpen(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const mainRef = useRef<HTMLElement>(null);
  const previousPage = useRef(page);
  useEffect(() => {
    if (previousPage.current !== page) {
      mainRef.current?.focus();
      previousPage.current = page;
    }
    document.title = `${page === "home" ? "Home" : page === "admin" ? "Teacher’s desk" : page === "about" ? "About" : "Contact"} | ${data?.blogName || "English with Natalia Bellos"}`;
  }, [page, data?.blogName]);
  const close = useCallback(() => setView(undefined), []);
  const reload = () => {
    setError("");
    loadPublic()
      .then(setData)
      .catch((e) => setError(e.message));
  };
  function chooseStudent(id: string) {
    setAppearancePreview(undefined);
    setSelected(id);
    setPage("home");
    location.hash = "/";
    setQuery("");
    setKind("all");
    if (window.matchMedia?.("(max-width: 62rem)").matches) {
      setStudentsOpen(false);
      requestAnimationFrame(() => {
        mainRef.current?.focus();
        mainRef.current?.scrollIntoView({ block: "start" });
      });
    }
  }
  useEffect(() => {
    reload();
    const change = () => {
      setPage(route());
      setView(undefined);
    };
    window.addEventListener("hashchange", change);
    window.addEventListener("blog-content-saved", reload);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("blog-content-saved", reload);
    };
  }, []);
  const student = data?.students.find((s) => s.id === selected);
  const copy = pageContent(data?.pageContent);
  const items = (
    student
      ? student.materials
      : data?.students.flatMap((s) => s.materials) || []
  )
    .filter(
      (a) =>
        (kind === "all" ||
          (kind === "word"
            ? ["doc", "docx"].includes(a.kind)
            : a.kind === kind)) &&
        a.title.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <S.Global />
      <AccessibilityControls />
      {data && <LiveChat key={student?.id || "lobby"} room={student ? "student:" + student.id : "lobby"} label={student ? `${student.name}’s study room` : "Main classroom"} />}
      <S.SkipLink
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
          mainRef.current?.scrollIntoView({ block: "start" });
        }}
      >
        Skip to main content
      </S.SkipLink>
      <S.Shell>
        <S.Side>
          <S.Brand>
            <img
              src={data?.teacherPhoto?.src || `${base}teacher.svg`}
              alt={data?.teacherPhoto?.alt || "Illustration of a smiling teacher holding a book"}
            />
            <p className="blog-name">
              {data?.blogName || "English with Natalia Bellos"}
            </p>
            <p>{copy.tagline}</p>
          </S.Brand>
          <nav aria-labelledby="students-label">
            <S.StudentNavigation
              open={studentsOpen}
              onToggle={(e) => setStudentsOpen(e.currentTarget.open)}
            >
              <summary>Students and materials</summary>
              <S.SideLabel id="students-label">OUR STUDENTS</S.SideLabel>
              {StudentsList()}
              <S.Students>
                {data?.students.map((s) => (
                  <S.StudentButton
                    key={s.id}
                    $active={selected === s.id && page === "home"}
                    aria-pressed={selected === s.id && page === "home"}
                    aria-controls={
                      page === "home" && data && !error
                        ? "learning-collection"
                        : undefined
                    }
                    onClick={() => chooseStudent(s.id)}
                  >
                    <span aria-hidden="true">
                      {s.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    {s.name}
                    <span aria-hidden="true">›</span>
                  </S.StudentButton>
                ))}
              </S.Students>
            </S.StudentNavigation>
          </nav>
          {page === "home" && (
            <details id="student-access" style={{ marginTop: "1rem" }}>
              <summary style={{ cursor: "pointer", paddingBlock: ".75rem", fontWeight: 600 }}>Student login &amp; profile</summary>
              {student ? (
                <LearnerSpace key={student.id} student={student} onChange={setAppearancePreview} compact />
              ) : <p>Select your name in Students and materials to sign in and personalise your page.</p>}
            </details>
          )}
          <S.TeacherNote>
            “{copy.sidebarQuote}”<small>{copy.sidebarCaption}</small>
          </S.TeacherNote>
        </S.Side>
        <div>
          <S.Header>
            <span style={{ fontFamily: "Georgia", fontSize: "1rem" }}> <span style={{ color: "#b11b9d" }}> ✳ </span> 
              {copy.headerCaption}<span style={{ color: "#b11b9d" }}> ✳</span>
            </span>
            <nav aria-label="Main navigation">
              {(["home", "about", "contact"] as const).map((p) => (
                <a
                  key={p}
                  href={p === "home" ? "#/" : `#/${p}`}
                  aria-current={page === p ? "page" : undefined}
                  onClick={() => {
                    if (p === "home") setSelected("");
                  }}
                >
                  {p[0].toUpperCase() + p.slice(1)}
                </a>
              ))}
              <a href={data?.instagram || "https://www.instagram.com/"} target="_blank" rel="noopener noreferrer" aria-label="Teacher Instagram (opens in a new tab)" title="Instagram"><Instagram size={21} aria-hidden="true" /></a>
              <a href="#/contact" aria-label="Open Gmail contact form" title="Gmail contact form"><Mail size={21} aria-hidden="true" /></a>
              <a
                href="#/admin"
                aria-current={page === "admin" ? "page" : undefined}
              >
                <LockKeyhole size={16} aria-hidden="true" /> Teacher login
              </a>
            </nav>
          </S.Header>
          <S.Main
            key={page}
            id="main-content"
            ref={mainRef}
            tabIndex={-1}
            $appearance={
              page === "home" && student
                ? appearancePreview || student.appearance
                : undefined
            }
          >
            {error ? (
              <S.Notice $error role="alert">
                {error} <S.Button onClick={reload}>Try again</S.Button>
              </S.Notice>
            ) : !data ? (
              <p role="status">Getting our English corner ready…</p>
            ) : page === "admin" ? (
              <Admin publicData={data} />
            ) : page === "about" ? (
              <S.Panel>
                <S.Eyebrow>NICE TO MEET YOU</S.Eyebrow>
                <h1>Hello! I’m {data.teacher}.</h1>
                <p style={{ whiteSpace: "pre-wrap" }}>{data.about}</p>
                <S.Chip>
                  <BookOpen size={14} /> {copy.aboutBadge}
                </S.Chip>
              </S.Panel>
            ) : page === "contact" ? (
              <S.Panel>
                <S.Eyebrow>LET’S TALK</S.Eyebrow>
                <h1 style={{ whiteSpace: "pre-line" }}>{copy.contactTitle}</h1>
                <p>{copy.contactIntro}</p>
                <ContactForm email={data.email} />
                {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) && !data.email.endsWith("@example.com") ? (
                  <S.Button as="a" href={`mailto:${data.email}`}>
                    Send an email <ArrowUpRight size={16} />
                  </S.Button>
                ) : (
                  <S.Notice>
                    The teacher’s contact details will be available soon.
                  </S.Notice>
                )}
              </S.Panel>
            ) : (
              <>
                <S.Eyebrow>{copy.homeEyebrow}</S.Eyebrow>
                <S.Hero>
                  <div>
                    <S.Chip>
                      <Sparkles size={12} /> {copy.homeBadge}
                    </S.Chip>
                    <h1>
                      {student ? (
                        <>
                          Hello, {student.name.split(" ")[0]}!<br />
                          {copy.studentTitle}
                        </>
                      ) : (
                        <>
                          <span style={{ whiteSpace: "pre-line" }}>{copy.homeTitle}</span>
                        </>
                      )}
                    </h1>
                    <p>
                      {student
                        ? copy.studentIntro
                        : copy.homeIntro}
                    </p>
                  </div>
                  <Garden />
                </S.Hero>
                <LearningUpdates data={data} student={student} />
                <S.Row>
                  <div>
                    <S.Eyebrow style={{ marginBottom: 8 }}>
                      {student
                        ? "YOUR LEARNING CORNER"
                        : "MADE FOR OUR STUDENTS"}
                    </S.Eyebrow>
                    <h2 style={{ margin: 0 }}>
                      {student
                        ? "Materials for " + student.name
                        : copy.collectionTitle}{" "}
                      <span
                        style={{ font: "0.875rem Arial", color: "#526147" }}
                      >
                        ({items.length})
                      </span>
                    </h2>
                  </div>
                  {student && <S.Chip>{student.level}</S.Chip>}
                </S.Row>
                <S.Row>
                  <div
                    role="group"
                    aria-label="Filter materials by type"
                    style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                  >
                    {[
                      ["all", "All"],
                      ["text", "Texts"],
                      ["pdf", "PDFs"],
                      ["word", "Word"],
                      ["image", "Images"],
                    ].map(([v, l]) => (
                      <S.Button
                        key={v}
                        $secondary={kind !== v}
                        onClick={() => setKind(v)}
                        aria-pressed={kind === v}
                      >
                        {l}
                      </S.Button>
                    ))}
                  </div>
                  <div
                    style={{
                      position: "relative",
                      width: 260,
                      maxWidth: "100%",
                    }}
                  >
                    <Search
                      size={15}
                      style={{
                        position: "absolute",
                        left: 10,
                        top: 15,
                        color: "#526147",
                      }}
                    />
                    <input
                      aria-label="Search materials"
                      placeholder="Search for a material…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      style={{ paddingLeft: 32, fontSize: "0.875rem" }}
                    />
                  </div>
                </S.Row>
                <S.ScreenReaderOnly
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {items.length} {items.length === 1 ? "material" : "materials"}{" "}
                  found{student ? ` for ${student.name}` : ""}.
                </S.ScreenReaderOnly>
                <S.Grid
                  id="learning-collection"
                  aria-label="Learning materials"
                >
                  {items.map((a) => (
                    <S.Card key={a.id}>
                      <S.Row style={{ margin: 0 }}>
                        <S.IconBox
                          $color={
                            a.kind === "pdf"
                              ? "#f6e8df"
                              : a.kind === "image"
                                ? "#ede7f2"
                                : undefined
                          }
                        >
                          {a.kind === "image" ? (
                            <Image size={21} />
                          ) : a.kind === "text" ? (
                            <BookOpen size={21} />
                          ) : (
                            <FileText size={21} />
                          )}
                        </S.IconBox>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            letterSpacing: 1,
                            color: "#526147",
                          }}
                        >
                          {a.kind === "text"
                            ? "READ & LEARN"
                            : a.kind.toUpperCase()}
                        </span>
                      </S.Row>
                      <h3>{a.title}</h3>
                      <p>
                        {a.kind === "text"
                          ? (a.text || "").slice(0, 100) + "…"
                          : a.kind === "pdf"
                            ? "A new activity to put your English into practice."
                            : a.kind === "image"
                              ? "Inspiration to learn in a different way."
                              : "Your study material, ready to go with you."}
                      </p>
                      <footer>
                        <S.LinkButton
                          aria-label={`Preview ${a.title}`}
                          onClick={() => setView(a)}
                        >
                          Preview <ArrowUpRight size={14} />
                        </S.LinkButton>
                        {a.path && (
                          <a
                            href={base + a.path}
                            download
                            aria-label={`Download ${a.title} (${a.kind.toUpperCase()})`}
                            style={{ textDecoration: "none", color: "#6c795e" }}
                          >
                            <ArrowDownToLine size={13} /> Download
                          </a>
                        )}
                        <time style={{ marginLeft: "auto" }} dateTime={a.date}>
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                            timeZone: "UTC",
                          }).format(new Date(`${a.date}T00:00:00Z`))}
                        </time>
                      </footer>
                    </S.Card>
                  ))}
                </S.Grid>
                {!items.length && (
                  <S.Panel>
                    <Leaf size={25} />
                    <h2>A blank page is a beginning, too.</h2>
                    <p>
                      {query
                        ? "No materials found. Try another search."
                        : "New materials will appear here."}
                    </p>
                  </S.Panel>
                )}
                <S.Notice>
                  <Leaf size={15} /> {copy.practiceNote}
                </S.Notice>
              </>
            )}
            <S.Footer>
              <span>
                © {new Date().getFullYear()}{" "}
                {data?.blogName || "English with Natalia Bellos"}
              </span>
              <span>{copy.footer}</span>
            </S.Footer>
          </S.Main>
        </div>
      </S.Shell>
      {view && <MaterialViewer material={view} onClose={close} />}
    </>
  );
  function StudentsList() {
    return (
      <S.StudentButton
        $active={!selected && page === "home"}
        aria-pressed={!selected && page === "home"}
        aria-controls={
          page === "home" && data && !error ? "learning-collection" : undefined
        }
        onClick={() => chooseStudent("")}
      >
        <span>
          <BookOpen size={15} />
        </span>
        All materials
      </S.StudentButton>
    );
  }
}
function Garden() {
  return (
    <svg width="205" height="205" viewBox="0 0 205 205" aria-hidden="true">
      <circle cx="109" cy="99" r="82" fill="#e6e6d1" />
      <path
        d="M60 147L112 128L166 146L113 167Z"
        fill="#f8f7ed"
        stroke="#7c8a65"
        strokeWidth="2"
      />
      <path
        d="M60 147v12l53 23 53-22v-14l-53 21Z"
        fill="#b7c49b"
        stroke="#7c8a65"
        strokeWidth="2"
      />
      <path d="M113 158V65" stroke="#6d835c" strokeWidth="3" />
      <path
        d="M113 123Q67 120 77 84Q116 86 113 123M114 101Q151 103 149 69Q113 69 114 101M113 79Q87 68 101 42Q126 53 113 79"
        fill="#8fa77a"
      />
      <path d="M112 138Q140 143 148 116Q119 106 112 138" fill="#b0bc8c" />
      <path
        d="M37 58l4-9 4 9 9 4-9 4-4 9-4-9-9-4ZM169 100l3-6 3 6 6 3-6 3-3 6-3-6-6-3Z"
        fill="#c7a26f"
      />
    </svg>
  );
}
