import { useState } from "react";
import { adminRequest, localEditing } from "../lib";
import * as S from "../styles";

export default function PasswordManager({ session, studentId, onTeacherChanged }: { session: string; studentId?: string; onTeacherChanged: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const student = studentId !== undefined;
  const id = student ? "manage-student-password" : "manage-teacher-password";
  return <S.Panel>
    <h2>{student ? "Create or reset student password" : "Change teacher password"}</h2>
    {!localEditing ? <S.Notice>{student ? "Online student passwords are managed in the community service’s private configuration. This deployment does not yet support changing those secrets from the panel." : "Online teacher sign-in uses GitHub. Use GitHub account recovery to reset your password."}</S.Notice> : <form onSubmit={async e => {
      e.preventDefault(); setError(""); setMessage("");
      if (password !== confirmation) { setError("The passwords do not match."); return; }
      setBusy(true);
      try {
        await adminRequest(student ? "/student-password" : "/teacher-password", session, { studentId, password, currentPassword: current });
        setMessage(student ? "Student password saved. Give the new password directly to this student. Their previous sessions are no longer valid." : "Teacher password changed. Sign in again with your new password.");
        if (!student) onTeacherChanged();
      } catch (e) { setError(e instanceof Error ? e.message : "Could not change password."); }
      finally { setPassword(""); setConfirmation(""); setCurrent(""); setBusy(false); }
    }}>
      <p>{student ? "The teacher creates the first password and can replace it if the student forgets it. Save new students before setting a password. Share it privately; passwords are never placed in the public blog." : "Enter your current password to set a new one. All teacher sessions will be invalidated."}</p>
      <fieldset disabled={busy} style={{ padding: 0, border: 0 }}>
        {!student && <><label htmlFor={id + "-current"}>Current teacher password</label><input id={id + "-current"} type="password" autoComplete="current-password" required minLength={12} maxLength={256} value={current} onChange={e => setCurrent(e.target.value)} /></>}
        <label htmlFor={id}>New {student ? "student" : "teacher"} password</label>
        <input id={id} type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={password} onChange={e => setPassword(e.target.value)} />
        <label htmlFor={id + "-confirm"}>Confirm new password</label>
        <input id={id + "-confirm"} type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        <p><small>At least 12 characters. Use a different password for each account.</small></p>
        <S.Button type="submit">{busy ? "Saving password…" : student ? "Save student password" : "Change my password"}</S.Button>
      </fieldset>
    </form>}
    {message && <S.Notice role="status">{message}</S.Notice>}
    {error && <S.Notice $error role="alert">{error}</S.Notice>}
  </S.Panel>;
}
