import type { Manifest, Student } from "../../shared/content";
import * as S from "../styles";
import { pageContent } from "../../shared/pageContent";
export default function LearningUpdates({
  data,
  student,
}: {
  data: Manifest;
  student?: Student;
}) {
  const students = student ? [student] : data.students;
  const copy = pageContent(data.pageContent);
  return (
    <>
      <section
        aria-labelledby="progress-heading"
        style={{ marginBottom: "2rem" }}
      >
        <S.Eyebrow>ONE STEP AT A TIME</S.Eyebrow>
        <h2 id="progress-heading">
          {student
            ? `${student.name}’s learning progress`
            : "Our learning progress"}
        </h2>
        <p>
          {copy.progressIntro}
        </p>
        <S.Grid>
          {students.map((s) => (
            <S.Card key={s.id}>
              <S.Row style={{ margin: 0 }}>
                <h3>{s.name}</h3>
                <S.Chip>{s.level}</S.Chip>
              </S.Row>
              {s.progress ? (
                <>
                  <strong>{s.progress.goal}</strong>
                  <label htmlFor={`progress-${s.id}`} style={{ margin: 0 }}>
                    Goal progress: {s.progress.percent}%
                  </label>
                  <progress
                    id={`progress-${s.id}`}
                    value={s.progress.percent}
                    max={100}
                    style={{
                      width: "100%",
                      height: 24,
                      accentColor: "#536d42",
                    }}
                  >
                    {s.progress.percent}%
                  </progress>
                  <p>
                    {s.progress.note || "Keep going. Every small step counts."}
                  </p>
                </>
              ) : (
                <>
                  <div
                    aria-hidden="true"
                    style={{
                      height: 14,
                      borderRadius: 8,
                      border: "1px solid #718066",
                      background: "#e6ecd9",
                    }}
                  />
                  <p>
                    Not assessed yet. The teacher will set a learning goal and
                    update this progress bar.
                  </p>
                </>
              )}
            </S.Card>
          ))}
        </S.Grid>
        {!students.length && (
          <S.Notice>
            Learning goals will appear here when the teacher adds students.
          </S.Notice>
        )}
      </section>
      <section
        aria-labelledby="teacher-journal-heading"
        style={{ marginBottom: "2rem" }}
      >
        <S.Eyebrow>FROM YOUR TEACHER</S.Eyebrow>
        <h2 id="teacher-journal-heading">{copy.journalTitle}</h2>
        {(data.posts || []).length ? (
          [...data.posts!]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((p) => (
              <S.Panel as="article" key={p.id}>
                <h3>{p.title}</h3>
                <p>
                  <small>
                    By {data.teacher} ·{" "}
                    <time dateTime={p.date}>
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }).format(new Date(`${p.date}T00:00:00Z`))}
                    </time>
                  </small>
                </p>
                <div
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {p.body}
                </div>
              </S.Panel>
            ))
        ) : (
          <S.Notice>The teacher’s next message will appear here.</S.Notice>
        )}
      </section>
    </>
  );
}
