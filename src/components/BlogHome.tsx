import { useState } from "react";
import { ArrowDown, Search } from "lucide-react";
import styled from "styled-components";
import type { Manifest } from "../../shared/content";
import { pageContent } from "../../shared/pageContent";
import * as S from "../styles";
import TeacherPortrait from "./TeacherPortrait";
import YouTubeText, { hasYouTubeVideo } from "./YouTubeText";

const Masthead = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(12rem, 1fr);
  gap: clamp(2rem, 6vw, 6rem);
  align-items: center;
  padding: clamp(1.5rem, 6vw, 5rem);
  border: 1px solid #dce4d5;
  border-radius: 1.35rem;
  background: radial-gradient(ellipse at 100% 0%, #e5ecdd, #f8f6ee 68%);
  color: #263a34;
  margin-bottom: clamp(2.5rem, 7vw, 5rem);
  html[data-high-contrast="true"] & { background-image: none; }

  h1 {
    font-family: "Instrument Serif", Georgia, serif;
    font-size: clamp(2.7rem, 6vw, 5.5rem);
    line-height: 1;
    letter-spacing: -.035em;
    white-space: pre-line;
    margin: 0 0 1rem;
  }
  p { max-width: 42ch; }
  @media (max-width: 42rem) { grid-template-columns: minmax(0, 1fr); }
`;

const Author = styled.div`
  min-width: 0;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid #d2dbc9;
  border-radius: 8rem 8rem 1rem 1rem;
  background: #fbfaf4;
  > div { margin-inline: auto; }
  > p { margin: .5rem auto 0; }
  > p:first-of-type { font: 1.4rem Georgia, serif; }
  > p:last-of-type { color: #465841; font-size: .84rem; }
`;

const Journal = styled.section`
  max-width: 58rem;
  margin-inline: auto;
  h2 { margin: 0 0 .75rem; }
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .65rem;
  align-items: center;
  margin: .75rem 0;
  > label {
    display: flex;
    align-items: center;
    gap: .45rem;
    flex: 1 1 14rem;
    margin: 0;
  }
  input { margin: 0; }
`;

const Entry = styled.article`
  margin: 0 0 1rem;
  padding: clamp(1rem, 4vw, 2.5rem);
  border: 1px solid #dfe4d8;
  border-top: 3px solid #789067;
  border-radius: .9rem;
  background: #fffdf8;
  h3 { margin: 0 0 .4rem; font: clamp(1.45rem, 3vw, 2.25rem) Georgia, serif; }
  > p { margin: 0 0 1rem; color: #465841; font-size: .88rem; }
`;

const longDate = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export default function BlogHome({ data }: { data: Manifest }) {
  const [query, setQuery] = useState("");
  const [videosOnly, setVideosOnly] = useState(false);
  const copy = pageContent(data.pageContent);
  const search = query.trim().toLowerCase();
  const posts = [...(data.posts || [])]
    .filter(post => (!videosOnly || hasYouTubeVideo(post.body)) &&
      `${post.title} ${post.body}`.toLowerCase().includes(search))
    .sort((a, b) => b.date.localeCompare(a.date));

  return <>
    <Masthead>
      <div>
        <S.Eyebrow>{copy.homeEyebrow}</S.Eyebrow>
        <h1>{copy.homeTitle}</h1>
        <p>{copy.homeIntro}</p>
        <S.Button type="button" onClick={() => document.getElementById("teacher-journal-heading")?.focus()}>
          Read the journal <ArrowDown size={16} aria-hidden="true" />
        </S.Button>
      </div>
      <Author>
        <TeacherPortrait photo={data.teacherPhoto} stickers={data.teacherStickers} />
        <p>{data.teacher}</p>
        <p>{copy.tagline}</p>
      </Author>
    </Masthead>
    <Journal aria-labelledby="teacher-journal-heading">
      <h2 id="teacher-journal-heading" tabIndex={-1}>{copy.journalTitle}</h2>
      {(data.posts || []).length > 0 && (
        <Controls>
          <label>
            <Search size={17} aria-hidden="true" />
            <input type="search" aria-label="Search posts" placeholder="Search posts…" value={query} onChange={event => setQuery(event.target.value)} />
          </label>
          <S.Button $secondary={videosOnly} type="button" aria-pressed={!videosOnly} onClick={() => setVideosOnly(false)}>All posts</S.Button>
          <S.Button $secondary={!videosOnly} type="button" aria-pressed={videosOnly} onClick={() => setVideosOnly(true)}>Videos</S.Button>
        </Controls>
      )}
      <S.ScreenReaderOnly role="status">{posts.length} {posts.length === 1 ? "post" : "posts"} found.</S.ScreenReaderOnly>
      {posts.map(post => (
        <Entry key={post.id}>
          <h3>{post.title}</h3>
          <p>{data.teacher} · <time dateTime={post.date}>{longDate.format(new Date(`${post.date}T00:00:00Z`))}</time></p>
          <YouTubeText text={post.body} />
        </Entry>
      ))}
      {!posts.length && (
        <S.Notice>{data.posts?.length ? "No posts match these filters." : "New posts will appear here."}</S.Notice>
      )}
    </Journal>
  </>;
}
