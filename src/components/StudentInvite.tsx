import { useState } from "react";
import { communityRequest } from "../community";
import { adminRequest, localEditing } from "../lib";
import * as S from "../styles";

export default function StudentInvite({ studentId, session }: { studentId: string; session: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <S.Panel>
    <h3>Student account invitation</h3>
    <p>Create a one-time code and give it privately to this student. They set their own password. The code expires after 48 hours; making a new code replaces the previous one.</p>
    <S.Button type="button" disabled={busy} onClick={async () => {
      setBusy(true); setError(""); setCode("");
      try {
        const result = localEditing
          ? await adminRequest("/student-invite", session, { studentId })
          : await communityRequest("/accounts/invite", { studentId }, session);
        setCode(result.code);
      } catch (e) { setError(e instanceof Error ? e.message : "Could not create invitation."); }
      finally { setBusy(false); }
    }}>{busy ? "Creating invitation…" : "Generate invitation code"}</S.Button>
    {code && <><label htmlFor="generated-student-invite">One-time invitation code</label><input id="generated-student-invite" readOnly value={code} onFocus={e => e.currentTarget.select()} /></>}
    {error && <S.Notice $error role="alert">{error}</S.Notice>}
  </S.Panel>;
}
