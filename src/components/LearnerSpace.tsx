import { useState } from "react";
import type { Student } from "../../shared/content";
import palette from "../../shared/appearance.json";
import { communityBase, communityRequest } from "../community";
import * as S from "../styles";
import { profilePhoto } from "../profilePhoto";
type Appearance = NonNullable<Student["appearance"]>;
export default function LearnerSpace({
  student,
  onChange,
  compact = false,
}: {
  student: Student;
  onChange: (appearance: Appearance) => void;
  compact?: boolean;
}) {
  const [appearance, setAppearance] = useState<Appearance>(
    student.appearance || { font: "classic", background: "sage" },
  );
  const [session, setSession] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  function choose(next: Appearance) {
    setAppearance(next);
    onChange(next);
    setMessage(
      session
        ? "Preview only. Save to sync this look across your devices."
        : "Preview only. Sign in and save to sync this look across your devices.",
    );
  }
  async function task(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      if (e && typeof e === "object" && "status" in e && e.status === 401)
        setSession("");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  return (
    <S.Panel aria-labelledby="learner-space-heading" style={compact ? { padding: "1rem", marginTop: ".5rem" } : undefined}>
      <S.Eyebrow>MAKE YOURSELF AT HOME</S.Eyebrow>
      <h2 id="learner-space-heading" style={compact ? { fontSize: "1.4rem" } : undefined}>Your space, your style</h2>
      {appearance.photo ? <img src={appearance.photo} alt={`Profile photo of ${student.name}`} width={96} height={96} style={{ borderRadius: "50%", objectFit: "cover" }} /> : <p>No profile photo yet.</p>}
      <p>
        Choose a font and background for {student.name}’s page. Your saved look
        is shared across devices after student sign-in.
      </p>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <S.ScreenReaderOnly as="legend">Student appearance</S.ScreenReaderOnly>
        {session ? <>
          <label htmlFor="student-photo">Your profile photo</label>
          <input id="student-photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="student-photo-help"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void task(async () => choose({ ...appearance, photo: await profilePhoto(file) }));
            }} />
          <p id="student-photo-help"><small>JPG, PNG or WebP, up to 5 MB. Photos are cropped to a small square. Your saved photo is public; previous versions remain in Git history. Save appearance to publish your change.</small></p>
          {appearance.photo && <S.Button $secondary type="button" onClick={() => { const { photo: _photo, ...rest } = appearance; choose(rest); }}>Remove profile photo</S.Button>}
        </> : <p><small>Sign in with your student account to upload or change your profile photo.</small></p>}
        <fieldset style={{ border: 0, padding: 0, margin: "1rem 0" }}>
          <legend style={{ fontWeight: 600 }}>Font palette</legend>
          <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(palette.fonts).map(([id, font]) => (
            <S.Button $secondary type="button" key={id} aria-pressed={appearance.font === id}
              onClick={() => choose({ ...appearance, font: id as Appearance["font"] })}
              style={{ display: "block", textAlign: "left", fontFamily: font.css, width: "100%" }}>
              <span style={{ display: "block" }}>{font.label} {appearance.font === id ? "✓" : ""}</span>
              <span style={{ fontSize: "1.2rem" }} aria-hidden="true">Aa · Learn &amp; grow</span>
            </S.Button>
          ))}
          </div>
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: "1rem 0" }}>
          <legend style={{ fontWeight: 600 }}>Colour combinations</legend>
          <p><small>Each palette pairs a background with a readable text colour.</small></p>
          <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(palette.backgrounds).map(([id, background]) => (
            <S.Button $secondary type="button" key={id} aria-pressed={appearance.background === id}
              onClick={() => choose({ ...appearance, background: id as Appearance["background"] })}
              style={{ display: "block", width: "100%", textAlign: "left", background: background.background, color: background.text }}>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span aria-hidden="true" style={{ width: 18, height: 18, flexShrink: 0, borderRadius: "50%", background: background.text }} />
                {background.label} {appearance.background === id ? "✓" : ""}
              </span>
              <span style={{ fontSize: ".75rem" }}>{background.background} / {background.text}</span>
            </S.Button>
          ))}
          </div>
        </fieldset>
        <div aria-label="Appearance preview" style={{ background: palette.backgrounds[appearance.background].background, color: palette.backgrounds[appearance.background].text, fontFamily: palette.fonts[appearance.font].css, padding: "1rem", border: "1px solid currentColor", borderRadius: 8, marginBlock: "1rem" }}>
          <strong style={{ display: "block", fontSize: "1.25rem" }}>Small steps, big discoveries.</strong>
          <span>Your English journey starts here. Aa Bb 123</span>
        </div>
        {!session ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void task(async () => {
                const logged = await communityRequest("/login", {
                  studentId: student.id,
                  password,
                });
                const current = await communityRequest(
                  "/appearance/read",
                  {},
                  logged.session,
                );
                setSession(logged.session);
                setAppearance(current.appearance);
                onChange(current.appearance);
                setMessage(
                  "Signed in as " +
                    student.name +
                    ". Your saved appearance is loaded. Choose a look and save it.",
                );
              });
            }}
          >
            <label htmlFor="student-password">
              Student password for {student.name}
            </label>
            <input
              id="student-password"
              type="password"
              autoComplete="current-password"
              minLength={12}
              maxLength={256}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="student-access-help"
            />
            <p id="student-access-help">
              <small>
                Ask the teacher for your own student password. This account can
                change only your appearance, never teacher tools. This is not
                the teacher password.
              </small>
            </p>
            <S.Button type="submit" disabled={!communityBase}>
              {busy ? "Signing in…" : "Student sign-in"}
            </S.Button>
            <details style={{ marginTop: "1rem" }}>
              <summary style={{ cursor: "pointer" }}>Forgot your password?</summary>
              <p>Ask your teacher to reset your student password. The teacher provides your first password too. There is no automatic email reset.</p>
            </details>
          </form>
        ) : (
          <S.Row style={{ marginTop: 16 }}>
            <S.Button
              onClick={() =>
                void task(async () => {
                  const saved = await communityRequest(
                    "/appearance",
                    appearance,
                    session,
                  );
                  onChange(saved.appearance);
                  setMessage(
                    "Appearance saved. Sign in on another device to load the same look.",
                  );
                })
              }
            >
              Save appearance across devices
            </S.Button>
            <S.Button
              $secondary
              onClick={() =>
                void task(async () => {
                  await communityRequest("/logout", {}, session);
                  setSession("");
                  setMessage("Student signed out.");
                })
              }
            >
              Student sign-out
            </S.Button>
          </S.Row>
        )}
      </fieldset>
      {!communityBase && (
        <S.Notice>
          Preview is available. Cross-device saving needs the community service
          to be configured.
        </S.Notice>
      )}
      {message && <S.Notice role="status">{message}</S.Notice>}
      {error && (
        <S.Notice $error role="alert">
          {error}
        </S.Notice>
      )}
    </S.Panel>
  );
}
