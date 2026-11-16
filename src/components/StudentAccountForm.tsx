import { useState } from "react";
import { communityBase, communityRequest } from "../community";
import * as S from "../styles";

export type StudentSession = { studentId: string; session: string; profile: { appearance: { font: "classic" | "modern" | "rounded" | "mono"; background: "sage" | "sky" | "rose" | "sand" | "lavender"; photo?: string }; level: string | null; levelAvailable: boolean } };

export default function StudentAccountForm({ onLogin }: { onLogin: (session: StudentSession) => void }) {
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return <S.Panel>
    <h1>{creating ? "Create or recover student account" : "Student login"}</h1>
    {!communityBase && <S.Notice>Student accounts are not available on this site yet.</S.Notice>}
    <form key={String(creating)} onSubmit={async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const fields = new FormData(form);
      const email = fields.get("email"), password = fields.get("password");
      setBusy(true); setError(""); setNotice("");
      try {
        if (creating) {
          await communityRequest("/register", { email, password, code: fields.get("code") });
          setCreating(false);
          setNotice("Your password is ready. Sign in with your email and password.");
        } else {
          const logged = await communityRequest("/login", { email, password });
          const profile = await communityRequest("/appearance/read", {}, logged.session);
          onLogin({ ...logged, profile });
        }
      } catch (e) { setError(e instanceof Error ? e.message : "Could not complete student access."); }
      finally { setBusy(false); }
    }}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
        <label htmlFor="student-account-email">Email</label>
        <input id="student-account-email" type="email" name="email" autoComplete="username" required maxLength={254} />
        {creating && <>
          <label htmlFor="student-invitation">Invitation code from your teacher</label>
          <input id="student-invitation" name="code" autoComplete="off" required maxLength={64} />
        </>}
        <label htmlFor="student-account-password">Password</label>
        <input id="student-account-password" name="password" type="password" autoComplete={creating ? "new-password" : "current-password"} required minLength={12} maxLength={256} />
        <S.Row>
          <S.Button type="submit" disabled={!communityBase}>{creating ? "Set my password" : "Sign in"}</S.Button>
          <S.Button type="button" $secondary onClick={() => { setCreating(!creating); setError(""); setNotice(""); }}>{creating ? "Back to sign in" : "Create an account or reset password"}</S.Button>
        </S.Row>
      </fieldset>
    </form>
    <p>{creating ? "Use the one-time code your teacher gave you. If you already have an account, use your registered email. Choose a password of at least 12 characters." : "New here or forgot your password? Ask your teacher for a one-time invitation code."}</p>
    {notice && <p role="status">{notice}</p>}
    {error && <S.Notice $error role="alert">{error}</S.Notice>}
  </S.Panel>;
}
