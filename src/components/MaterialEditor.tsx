import { useState } from "react";
import { fileKind, MAX_FILE, type Material } from "../../shared/content";
import * as S from "../styles";

export default function MaterialEditor({ material, onSave }: { material: Material; onSave: (next: Material, file?: File) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(material.title);
  const [text, setText] = useState(material.text || "");
  const [alt, setAlt] = useState(material.alt || "");
  const [file, setFile] = useState<File>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!editing) return <S.Button $secondary type="button" aria-label={`Edit material ${material.title}`} onClick={() => {
    setTitle(material.title); setText(material.text || ""); setAlt(material.alt || ""); setFile(undefined); setError(""); setEditing(true);
  }}>Edit or replace</S.Button>;
  const id = `edit-material-${material.id}`;
  const image = file ? fileKind(file.name) === "image" : material.kind === "image";
  return <form style={{ width: "100%" }} onSubmit={async e => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      if (file && (!fileKind(file.name) || file.size > MAX_FILE || !file.size)) throw Error("Choose a supported file between 1 byte and 2 MiB.");
      if (image && !alt.trim()) throw Error("Add an image description.");
      const next: Material = { ...material, title: title.trim(), ...(material.kind === "text" ? { text: text.trim() } : {}) };
      if (image) next.alt = alt.trim(); else delete next.alt;
      await onSave(next, file); setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not edit material."); }
    finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} style={{ padding: 0, border: 0 }}>
      <legend>Edit {material.title}</legend>
      <label htmlFor={id + "-title"}>Material title</label><input id={id + "-title"} required maxLength={150} value={title} onChange={e => setTitle(e.target.value)} />
      {material.kind === "text" ? <><label htmlFor={id + "-text"}>Material text</label><textarea id={id + "-text"} required maxLength={20000} value={text} onChange={e => setText(e.target.value)} /></> : <>
        <label htmlFor={id + "-file"}>Replace file (optional, up to 2 MiB)</label><input id={id + "-file"} type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp" onChange={e => setFile(e.target.files?.[0])} />
        <p><small>Upload an updated file to replace this material. To change a Word or PDF document’s contents, edit it on your device and upload the new version here.</small></p>
      </>}
      {image && <><label htmlFor={id + "-alt"}>Material image description</label><textarea id={id + "-alt"} required maxLength={1000} value={alt} onChange={e => setAlt(e.target.value)} /></>}
      <S.Row><S.Button type="submit">Update material draft</S.Button><S.Button $secondary type="button" onClick={() => setEditing(false)}>Cancel material editing</S.Button></S.Row>
    </fieldset>
    {error && <S.Notice $error role="alert">{error}</S.Notice>}
  </form>;
}
