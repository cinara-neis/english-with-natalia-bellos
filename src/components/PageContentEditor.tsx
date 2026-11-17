import { useState } from "react";
import type { Manifest } from "../../shared/content";
import { pageContent, type PageContent } from "../../shared/pageContent";
import { profilePhoto } from "../profilePhoto";
import styled from "styled-components";
import * as S from "../styles";
import TeacherPortrait from "./TeacherPortrait";
import { teacherStickers, maxTeacherStickers, type TeacherSticker } from "../../shared/teacherStickers";

const sections: { title: string; fields: [keyof PageContent, string][] }[] = [
  { title: "Home", fields: [["homeEyebrow", "Welcome label"], ["homeBadge", "Welcome badge"], ["homeTitle", "Main headline"], ["homeIntro", "Welcome text"], ["collectionTitle", "Library title"], ["journalTitle", "Journal title"], ["progressIntro", "Progress introduction"], ["practiceNote", "Practice reminder"]] },
  { title: "Student pages", fields: [["studentTitle", "Student welcome headline"], ["studentIntro", "Student welcome text"]] },
  { title: "Contact", fields: [["contactTitle", "Contact headline"], ["contactIntro", "Contact introduction"]] },
  { title: "Brand and footer", fields: [["tagline", "Blog tagline"], ["headerCaption", "Header caption"], ["sidebarQuote", "Sidebar quote"], ["sidebarCaption", "Sidebar caption"], ["aboutBadge", "About badge"], ["footer", "Footer message"]] },
];
const PortraitSettings = styled(S.Panel)`
  display: grid;
  grid-template-columns: minmax(0, 15rem) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
  fieldset { margin: 0 0 1rem; padding: 0; border: 0; }
  @media (max-width: 43rem) { grid-template-columns: minmax(0, 1fr); }
`;

const PortraitPreview = styled.div`
  background: #eef1e7;
  border-radius: .75rem;
  padding: 1rem;
  text-align: center;
  h3 { margin-top: 0; }
`;

export default function PageContentEditor({ draft, section, onChange, onBusyChange }: {
  draft: Manifest;
  section: "pages" | "portrait";
  onChange: (value: Manifest) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const copy = pageContent(draft.pageContent);
  const stickers = draft.teacherStickers || [];
  const [error, setError] = useState("");
  if (section === "pages") return <S.Panel>
    <p>Edit the text visitors see on each page. Line breaks are supported in headlines.</p>
    {sections.map(section => <details key={section.title} style={{ marginBlock: "1rem" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, paddingBlock: ".5rem" }}>{section.title}</summary>
      {section.fields.map(([key, label]) => <div key={key}>
        <label htmlFor={`page-${key}`}>{label}</label>
        <textarea id={`page-${key}`} required maxLength={2000} rows={3} value={copy[key]}
          onChange={e => onChange({ ...draft, pageContent: { ...draft.pageContent, [key]: e.target.value } })} />
      </div>)}
    </details>)}
    <details>
      <summary style={{ cursor: "pointer", paddingBlock: ".5rem" }}>Preview homepage text draft</summary>
      <h3 style={{ whiteSpace: "pre-line" }}>{copy.homeTitle}</h3>
      <p>{copy.homeIntro}</p>
    </details>
  </S.Panel>;

  return <PortraitSettings>
    <PortraitPreview>
      <h3>Public sidebar preview</h3>
      <TeacherPortrait photo={draft.teacherPhoto} stickers={stickers} />
      <p>{draft.blogName}</p>
    </PortraitPreview>
    <div>
      <fieldset>
        <legend>Profile stickers (up to three)</legend>
        {Object.entries(teacherStickers).map(([key, sticker]) => {
          const id = key as TeacherSticker;
          const selected = stickers.includes(id);
          return <S.Button key={key} type="button" $secondary={!selected} aria-pressed={selected}
            disabled={!selected && stickers.length >= maxTeacherStickers}
            style={{ margin: ".25rem" }}
            onClick={() => onChange({ ...draft, teacherStickers: selected ? stickers.filter(item => item !== id) : [...stickers, id] })}>
            <span aria-hidden="true">{sticker.icon}</span> {sticker.label}
          </S.Button>;
        })}
      </fieldset>
      <label htmlFor="teacher-image">Upload your teacher image</label>
      <input id="teacher-image" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="teacher-image-help" onChange={async e => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        onBusyChange(true);
        setError("");
        try {
          const src = await profilePhoto(file);
          onChange({ ...draft, teacherPhoto: { src, alt: draft.teacherPhoto?.alt || `Portrait of ${draft.teacher}` } });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not prepare image.");
        } finally {
          onBusyChange(false);
        }
      }} />
      <p id="teacher-image-help"><small>JPG, PNG or WebP, up to 5 MB. Cropped to a square thumbnail.</small></p>
      {draft.teacherPhoto && <>
        <label htmlFor="teacher-image-description">Teacher image description</label>
        <input id="teacher-image-description" required maxLength={300} value={draft.teacherPhoto.alt}
          onChange={e => onChange({ ...draft, teacherPhoto: { ...draft.teacherPhoto!, alt: e.target.value } })} />
        <S.Button $secondary type="button" onClick={() => {
          const { teacherPhoto: _photo, ...rest } = draft;
          onChange(rest);
        }}>Use original illustration</S.Button>
      </>}
      {error && <S.Notice role="alert" $error>{error}</S.Notice>}
    </div>
  </PortraitSettings>;
}
