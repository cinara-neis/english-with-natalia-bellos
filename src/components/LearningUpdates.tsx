import type { Student } from "../../shared/content";
import * as S from "../styles";
import YouTubeText from "./YouTubeText";

export default function LearningUpdates({ student, intro }: { student: Student; intro: string }) {
  const { id, name, progress } = student;
  return (
    <section aria-labelledby="progress-heading" style={{ marginBottom: "2rem" }}>
      <h2 id="progress-heading">{name}’s learning progress</h2>
      <p>{intro}</p>
      <S.Panel>
        {progress ? (
          <>
            <strong>{progress.goal}</strong>
            <label htmlFor={`progress-${id}`} style={{ margin: 0 }}>
              Goal progress: {progress.percent}%
            </label>
            <progress
              id={`progress-${id}`}
              value={progress.percent}
              max={100}
              style={{ width: "100%", height: 24, accentColor: "#536d42" }}
            >
              {progress.percent}%
            </progress>
            <YouTubeText text={progress.note || "Keep going. Every small step counts."} />
          </>
        ) : <p>Not assessed yet. The teacher will set a learning goal and update this progress bar.</p>}
      </S.Panel>
    </section>
  );
}
