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
  ChevronDown,
} from "lucide-react";
import type { Manifest, Material, Student } from "../shared/content";
import { base, loadPublic } from "./lib";
import * as S from "./styles";
import Admin from "./components/Admin";
import MaterialViewer from "./components/MaterialViewer";
import AccessibilityControls from "./components/AccessibilityControls";
import LearningUpdates from "./components/LearningUpdates";
import BlogHome from "./components/BlogHome";
import WalkingCat from "./components/WalkingCat";
import Games from "./components/Games";
import LearnerSpace from "./components/LearnerSpace";
import StudentAccountForm, { type StudentSession } from "./components/StudentAccountForm";
import StudentFiles from "./components/StudentFiles";
import LiveChat from "./components/LiveChat";
import ContactForm from "./components/ContactForm";
import styled from "styled-components";
import { pageContent } from "../shared/pageContent";
type Page = "home" | "about" | "contact" | "admin" | "student-login" | "student" | "materials" | "games";
const pageTitles: Record<Page, string> = {
  games: "Games", home: "Home", about: "About", contact: "Contact", admin: "Teacher’s desk",
  "student-login": "Student login", student: "Student page", materials: "Learning materials",
};
const studentLink = (id: string) => `#/student?id=${encodeURIComponent(id)}`;
const studentRouteId = () => new URLSearchParams(location.hash.split("?")[1]).get("id") || "";

const StudentMenu = styled.details`
  position: relative;
  summary {
    display: flex;
    align-items: center;
    gap: .35rem;
    min-height: 44px;
    font-size: .875rem;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  ul {
    position: absolute;
    z-index: 8;
    left: 0;
    width: max-content;
    min-width: 11rem;
    max-width: calc(100vw - 2rem);
    max-height: 45vh;
    overflow: auto;
    list-style: none;
    margin: 0;
    padding: .35rem;
    background: #fffdf8;
    border: 1px solid #d9dfd4;
    border-radius: .6rem;
    box-shadow: 0 12px 28px #263a3425;
  }
  a { display: flex; padding: .35rem .65rem; border-radius: .35rem; }
  a:hover { background: #eaf0e4; }
  @media (max-width: 36rem) { ul { left: auto; right: 0; } }
`;

const Wordmark = styled.div`
  display: flex;
  align-items: center;
  gap: .9rem;
  color: #5c283c;
  min-width: 0;
  > span:first-child {
    display: grid;
    place-items: center;
    flex: none;
    width: 3rem;
    height: 3rem;
    border: 1px solid #8b6070;
    border-radius: 50% 50% 6px 6px;
    font: italic 1.65rem "Cormorant Garamond", Georgia, serif;
  }
  strong {
    display: block;
    font: 600 clamp(1.05rem, 2vw, 1.5rem) "Cormorant Garamond", Georgia, serif;
    line-height: 1.15;
  }
  small { display: block; font-size: .65rem; letter-spacing: .15em; text-transform: uppercase; margin-top: .35rem; }
`;
function route(): Page {
  const p = location.hash
    ? location.hash.slice(2).split("?")[0]
    : location.pathname.match(/\/(admin|about|contact|student-login|games)\/?$/)?.[1];
  return p && ["about", "contact", "admin", "student-login", "student", "materials", "games"].includes(p) ? (p as Page) : "home";
}
export default function App() {
  const [page, setPage] = useState<Page>(route);
  const [adminVisited, setAdminVisited] = useState(page === "admin");
  const [data, setData] = useState<Manifest>();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(studentRouteId);
  const [studentAccount, setStudentAccount] = useState<StudentSession>();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [view, setView] = useState<Material>();
  const studentsMenu = useRef<HTMLDetailsElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousRoute = useRef(location.hash);
  const student = page === "student" ? data?.students.find(s => s.id === selected) : undefined;
  useEffect(() => {
    if (previousRoute.current !== location.hash) {
      mainRef.current?.focus();
      previousRoute.current = location.hash;
    }
    document.title = `${student?.name || pageTitles[page]} | ${data?.blogName || "English with Natalia Bellos"}`;
  }, [page, selected, student?.name, data?.blogName]);
  const close = useCallback(() => setView(undefined), []);
  const reload = () => {
    setError("");
    loadPublic()
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    reload();
    const change = () => {
      const next = route();
      if (next === "admin") setAdminVisited(true);
      else loadPublic().then(setData).catch(() => {});
      setPage(next);
      setSelected(next === "student" ? studentRouteId() : "");
      setQuery("");
      setKind("all");
      setView(undefined);
      if (studentsMenu.current) studentsMenu.current.open = false;
    };
    window.addEventListener("hashchange", change);
    window.addEventListener("blog-content-saved", reload);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("blog-content-saved", reload);
    };
  }, []);
  const accountStudent = data?.students.find(s => s.id === studentAccount?.studentId);
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
          <S.Header>
            <Wordmark>
              <span aria-hidden="true">N</span>
              <span>
                <strong>{data?.blogName || "English with Natalia Bellos"}</strong>
                <small>{copy.headerCaption}</small>
              </span>
            </Wordmark>
            <nav aria-label="Main navigation">
              {(["home", "about", "contact", "games"] as const).map((p) => (
                <a
                  key={p}
                  href={p === "home" ? "#/" : `#/${p}`}
                  aria-current={page === p ? "page" : undefined}
                >
                  {p[0].toUpperCase() + p.slice(1)}
                </a>
              ))}
              <StudentMenu ref={studentsMenu} onKeyDown={event => {
                if (event.key !== "Escape" || !event.currentTarget.open) return;
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }}>
                <summary>Students <ChevronDown size={14} aria-hidden="true" /></summary>
                <ul aria-label="Student pages">
                  {data?.students.map(s => (
                    <li key={s.id}><a href={studentLink(s.id)} aria-current={student?.id === s.id ? "page" : undefined}>{s.name}</a></li>
                  ))}
                  <li><a href="#/materials" aria-current={page === "materials" ? "page" : undefined}>All materials</a></li>
                </ul>
              </StudentMenu>
              <a href={data?.instagram || "https://www.instagram.com/"} target="_blank" rel="noopener noreferrer" aria-label="Teacher Instagram (opens in a new tab)" title="Instagram"><Instagram size={21} aria-hidden="true" /></a>
              <a href="#/contact" aria-label="Open Gmail contact form" title="Gmail contact form"><Mail size={21} aria-hidden="true" /></a>
              <a
                href="#/student-login"
                aria-current={page === "student-login" ? "page" : undefined}
              >
                <LockKeyhole size={16} aria-hidden="true" /> Student login
              </a>
              <a
                href="#/admin"
                aria-current={page === "admin" ? "page" : undefined}
              >
                <LockKeyhole size={16} aria-hidden="true" /> Teacher login
              </a>
            </nav>
          </S.Header>
          <S.Main
            id="main-content"
            ref={mainRef}
            tabIndex={-1}
            $appearance={student && (studentAccount?.studentId === student.id
              ? studentAccount.profile.appearance || student.appearance
              : student.appearance)}
          >
            {(adminVisited || page === "admin") && data && (
              <div hidden={page !== "admin"}><Admin publicData={data} /></div>
            )}
            {page === "admin" && data ? null : error ? (
              <S.Notice $error role="alert">
                {error} <S.Button onClick={reload}>Try again</S.Button>
              </S.Notice>
            ) : !data ? (
              <p role="status">Getting our English corner ready…</p>
            ) : page === "student-login" ? (
              studentAccount && accountStudent ? <>
                <h1>My student account</h1>
                <LearnerSpace key={accountStudent.id} student={accountStudent} account={studentAccount} onLogout={() => setStudentAccount(undefined)} onChange={(appearance) => {
                  setStudentAccount(current => current ? { ...current, profile: { ...current.profile, appearance } } : current);
                }} />
                <S.Button $secondary as="a" href={studentLink(accountStudent.id)}>Open my learning page</S.Button>
              </> : <StudentAccountForm onLogin={setStudentAccount} />
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
            ) : page === "games" ? (
              <Games />
            ) : page === "home" ? (
              <BlogHome data={data} />
            ) : page === "student" && !student ? (
              <S.Panel>
                <h1>Student page unavailable</h1>
                <p>Choose a student from the menu or open the materials library.</p>
                <S.Button as="a" href="#/materials">Browse materials</S.Button>
              </S.Panel>
            ) : (
              <>
                {student ? (
                  <>
                    <S.Hero>
                      <div>
                        <h1>{student.name}</h1>
                        <p>{copy.studentTitle} {copy.studentIntro}</p>
                      </div>
                    </S.Hero>
                    <LearningUpdates student={student} intro={copy.progressIntro} />
                    <StudentFiles key={student.id} studentId={student.id} />
                  </>
                ) : <h1>{copy.collectionTitle}</h1>}
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
                        : "Learning materials"}{" "}
                      <span
                        style={{ font: "0.875rem Arial", color: "#526147" }}
                      >
                        ({items.length})
                      </span>
                    </h2>
                  </div>
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
      </S.Shell>
      {view && <MaterialViewer material={view} onClose={close} />}
      {page !== "admin" && <WalkingCat />}
    </>
  );
}
