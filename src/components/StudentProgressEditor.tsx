import type { Student } from "../../shared/content";
import * as S from "../styles";
export default function StudentProgressEditor({
  student,
  onChange,
}: {
  student: Student;
  onChange: (s: Student) => void;
}) {
  const progress = student.progress;
  return (
    <S.Panel aria-labelledby="progress-editor-heading">
      <h2 id="progress-editor-heading" tabIndex={-1}>
        Learning progress for {student.name}
      </h2>
      <p>
        This is your assessment of the student’s current learning goal. It does
        not change automatically when a file is opened or downloaded.
      </p>
      {!progress ? (
        <S.Button
          type="button"
          onClick={() =>
            onChange({
              ...student,
              progress: {
                percent: 0,
                goal: "My current learning goal",
                note: "",
              },
            })
          }
        >
          Set a learning goal
        </S.Button>
      ) : (
        <>
          <label htmlFor="progress-goal">Learning goal</label>
          <input
            id="progress-goal"
            maxLength={200}
            value={progress.goal}
            onChange={(e) =>
              onChange({
                ...student,
                progress: { ...progress, goal: e.target.value },
              })
            }
          />
          <label htmlFor="progress-percent">Progress percentage (0–100)</label>
          <input
            id="progress-percent"
            type="number"
            min={0}
            max={100}
            step={1}
            value={progress.percent}
            onChange={(e) => {
              const percent = Number(e.target.value);
              if (Number.isInteger(percent))
                onChange({
                  ...student,
                  progress: {
                    ...progress,
                    percent: Math.max(0, Math.min(100, percent)),
                  },
                });
            }}
            aria-describedby="progress-percent-help"
          />
          <small id="progress-percent-help">
            The homepage displays this percentage with the learning goal. Update
            it when you review the student’s work.
          </small>
          <label htmlFor="progress-note">Teacher feedback</label>
          <textarea
            id="progress-note"
            maxLength={2000}
            value={progress.note}
            onChange={(e) =>
              onChange({
                ...student,
                progress: { ...progress, note: e.target.value },
              })
            }
          />
          <p />
          <S.Button
            type="button"
            $secondary
            onClick={() => onChange({ ...student, progress: undefined })}
          >
            Clear progress goal
          </S.Button>
        </>
      )}
    </S.Panel>
  );
}
