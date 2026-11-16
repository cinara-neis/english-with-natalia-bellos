import { useEffect, useState } from "react";
import { communityBase, communityRequest } from "../community";
import { adminRequest, asBase64, localEditing } from "../lib";
import * as S from "../styles";

type Entry = { id: string; name: string; public: boolean };
export default function StudentFiles({ studentId, session = "", teacher = false }: { studentId: string; session?: string; teacher?: boolean }) {
  const editable = !!session && !teacher;
  const [files, setFiles] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File>();
  const [refresh, setRefresh] = useState(0);
  const available = !!communityBase || (teacher && localEditing);
  function request(action: string, body = {}) {
    const data = { studentId, ...body };
    return teacher && localEditing
      ? adminRequest("/student-files/" + action, session, data)
      : communityRequest("/files/" + (teacher ? "teacher-" : "") + action, data, session);
  }
  useEffect(() => {
    let alive = true;
    setFiles([]);
    setError("");
    if (available) request("list").then(value => {
      if (alive && Array.isArray(value.files)) setFiles(value.files);
    }).catch(e => { if (alive && session) setError(e.message); });
    return () => { alive = false; };
  }, [studentId, session, teacher, available, refresh]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setStatus("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Could not complete the file action."); }
    finally { setBusy(false); }
  }
  if (!session && files.length === 0) return null;
  return <S.Panel aria-label={editable ? "My files" : "Student uploads"}>
    <h2>{editable ? "My files" : teacher ? "Files shared with you" : "Published student files"}</h2>
    {editable && <form onSubmit={e => {
      e.preventDefault();
      const form = e.currentTarget;
      if (!file) return;
      void run(async () => {
        if (!file.size || file.size > 2 * 1024 * 1024) throw Error("Choose a file up to 2 MiB.");
        await request("upload", { name: file.name, content: await asBase64(file) });
        form.reset(); setFile(undefined); setRefresh(n => n + 1); setStatus("Saved privately. Only you and your teacher can access it.");
      });
    }}>
      <p>New uploads are private. You can publish them when ready.</p>
      <label>Choose a PDF, Word document or image<input type="file" required accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" disabled={busy || !available} onChange={e => setFile(e.target.files?.[0])} /></label>
      <S.Button type="submit" disabled={busy || !file || !available}>Upload privately</S.Button>
    </form>}
    {!files.length && session && <p>No files to show.</p>}
    {files.map(entry => <S.Row key={entry.id}>
      <span>{entry.name} {session && <small>({entry.public ? "Public" : "Private"})</small>}</span>
      <S.Button $secondary type="button" disabled={busy} aria-label={`Download ${entry.name}`} onClick={() => void run(async () => {
        const { content, name } = await request("download", { id: entry.id });
        const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(content), c => c.charCodeAt(0))], { type: "application/octet-stream" }));
        const link = document.createElement("a"); link.href = url; link.download = name;
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      })}>Download</S.Button>
      {editable && <S.Button $secondary type="button" disabled={busy} onClick={() => {
        if (!entry.public && !window.confirm("Anyone will be able to download this file. Publish it?")) return;
        void run(async () => {
          await request("visibility", { id: entry.id, public: !entry.public, confirmed: !entry.public });
          setRefresh(n => n + 1);
          setStatus(entry.public ? "Removed from the public page. The file is still private." : "File published.");
        });
      }}>{entry.public ? "Remove from public page" : "Publish"}</S.Button>}
    </S.Row>)}
    {status && <p role="status">{status}</p>}
    {error && <S.Notice $error role="alert">{error}</S.Notice>}
  </S.Panel>;
}
