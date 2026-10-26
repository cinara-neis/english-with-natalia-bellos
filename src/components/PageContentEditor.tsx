import { useState } from "react";
import type { Manifest } from "../../shared/content";
import { pageContent, type PageContent } from "../../shared/pageContent";
import { profilePhoto } from "../profilePhoto";
import * as S from "../styles";

const sections: { title: string; fields: [keyof PageContent, string][] }[] = [
  { title: "Home", fields: [["homeEyebrow", "Welcome label"], ["homeBadge", "Welcome badge"], ["homeTitle", "Main headline"], ["homeIntro", "Welcome text"], ["collectionTitle", "Library title"], ["journalTitle", "Journal title"], ["progressIntro", "Progress introduction"], ["practiceNote", "Practice reminder"]] },
  { title: "Student pages", fields: [["studentTitle", "Student welcome headline"], ["studentIntro", "Student welcome text"]] },
  { title: "Contact", fields: [["contactTitle", "Contact headline"], ["contactIntro", "Contact introduction"]] },
  { title: "Brand and footer", fields: [["tagline", "Blog tagline"], ["headerCaption", "Header caption"], ["sidebarQuote", "Sidebar quote"], ["sidebarCaption", "Sidebar caption"], ["aboutBadge", "About badge"], ["footer", "Footer message"]] },
];
export default function PageContentEditor({ draft, onChange }: { draft: Manifest; onChange: (value: Manifest) => void }) {
  const copy = pageContent(draft.pageContent);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <S.Panel aria-labelledby="page-content-heading">
    <h2 id="page-content-heading" tabIndex={-1}>Page texts and teacher image</h2>
    <p>Edit the words visitors see without changing the layout. These edits are drafts until you save or publish all changes. Plain text only; line breaks are supported in headlines.</p>
    {sections.map(section => <details key={section.title} style={{ marginBlock: "1rem" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, paddingBlock: ".5rem" }}>{section.title} texts</summary>
      {section.fields.map(([key, label]) => <div key={key}>
        <label htmlFor={`page-${key}`}>{label}</label>
        <textarea id={`page-${key}`} required maxLength={2000} rows={3} value={copy[key]}
          onChange={e => onChange({ ...draft, pageContent: { ...draft.pageContent, [key]: e.target.value } })} />
      </div>)}
    </details>)}
    <details>
      <summary style={{ cursor: "pointer", fontWeight: 600, paddingBlock: ".5rem" }}>Teacher profile image</summary>
      {draft.teacherPhoto && <img src={draft.teacherPhoto.src} alt={draft.teacherPhoto.alt} width={96} height={96} />}
      <label htmlFor="teacher-image">Upload your teacher image</label>
      <input id="teacher-image" type="file" disabled={busy} accept="image/jpeg,image/png,image/webp" aria-describedby="teacher-image-help" onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
        setBusy(true); setError("");
        try { const src = await profilePhoto(file); onChange({ ...draft, teacherPhoto: { src, alt: draft.teacherPhoto?.alt || `Portrait of ${draft.teacher}` } }); }
        catch (e) { setError(e instanceof Error ? e.message : "Could not prepare image."); }
        finally { setBusy(false); }
      }} />
      <p id="teacher-image-help"><small>JPG, PNG or WebP, up to 5 MB. Cropped to a small square thumbnail. Replaces the sidebar illustration after you save. Your image is public.</small></p>
      {draft.teacherPhoto && <><label htmlFor="teacher-image-description">Teacher image description</label><input id="teacher-image-description" required maxLength={300} value={draft.teacherPhoto.alt} onChange={e => onChange({ ...draft, teacherPhoto: { ...draft.teacherPhoto!, alt: e.target.value } })} /><p /><S.Button $secondary type="button" onClick={() => { const { teacherPhoto: _photo, ...rest } = draft; onChange(rest); }}>Use original illustration</S.Button></>}
    </details>
    {error && <S.Notice role="alert" $error>{error}</S.Notice>}
    <details style={{ marginTop: "1rem" }}>
      <summary style={{ cursor: "pointer", paddingBlock: ".5rem" }}>Preview homepage text draft</summary>
      <h3 style={{ whiteSpace: "pre-line", marginTop: 12 }}>{copy.homeTitle}</h3><p>{copy.homeIntro}</p>
      <small>Text preview only. Save or publish to update the public page.</small>
    </details>
  </S.Panel>;
}
