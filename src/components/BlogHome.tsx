import { useState } from "react";
import { ArrowDown, ArrowUpRight, Search, Coffee, BookOpen, Music2, Cat } from "lucide-react";
import styled from "styled-components";
import { base } from "../lib";
import type { Manifest } from "../../shared/content";
import { pageContent } from "../../shared/pageContent";
import * as S from "../styles";
import TeacherPortrait from "./TeacherPortrait";
import YouTubeText, { hasYouTubeVideo } from "./YouTubeText";

const Masthead = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, .95fr);
  gap: clamp(2rem, 6vw, 6rem);
  align-items: center;
  padding-block: clamp(1rem, 4vw, 3.5rem) clamp(2rem, 5vw, 4.5rem);
  color: #302d2a;
  h1 {
    font: 500 clamp(3.3rem, 6vw, 6.5rem)/.98 "Cormorant Garamond", Georgia, serif;
    letter-spacing: -.045em;
    white-space: pre-line;
    margin: 1rem 0 1.5rem;
    max-width: 12ch;
  }
  > div > p { max-width: 40ch; font-size: .95rem; color: #5e584f; }
  button {
    margin-top: 1rem;
    background: #663047;
    border-color: #663047;
    border-radius: 3px;
    padding: .8rem 1.2rem;
  }
  button:hover { background: #4f2237; }
  @media (max-width: 43rem) { grid-template-columns: minmax(0, 1fr); gap: 2rem; }
`;

const Cover = styled.figure`
  margin: 0;
  position: relative;
  img {
    width: 100%;
    aspect-ratio: 1;
    display: block;
    object-fit: cover;
    border-radius: 48% 48% 3px 3px;
    border: 1px solid #cfc1af;
  }
  figcaption {
    margin-top: .8rem;
    text-align: right;
    font: italic 1.1rem "Cormorant Garamond", Georgia, serif;
    color: #654758;
  }
`;

const Kicker = styled.p`
  display: flex;
  align-items: center;
  gap: .65rem;
  font-size: .7rem !important;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: #663047 !important;
  &::before { content: ""; width: 2rem; height: 1px; background: currentColor; }
`;

const CourseLinks = styled.nav`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: .75rem 2rem;
  padding: 1.1rem .5rem;
  border-block: 1px solid #d9cfc2;
  margin-bottom: clamp(2rem, 5vw, 4rem);
  a { display: inline-flex; align-items: center; gap: .6rem; font-size: .85rem; min-height: 44px; }
`;

const IllustrationButtons = styled.div`
  position: absolute;
  inset: 0 0 2rem;
  pointer-events: none;
  button {
    position: absolute;
    display: grid;
    place-items: center;
    pointer-events: auto;
    width: 44px;
    height: 44px;
    min-width: 44px;
    padding: 0;
    margin: 0;
    border-radius: 50%;
    border: 2px solid #fffdf8;
    background: #663047;
    color: #fffdf8;
    box-shadow: 0 2px 9px #0003;
  }
  button[aria-pressed="true"] { background: #365542; }
`;

const Practice = styled.div`
  grid-column: 1 / -1;
  border-left: 3px solid #75425d;
  padding: 1rem 1.25rem;
  background: #eee6ec;
  margin-top: -1.5rem;
  p { margin: .4rem 0 0; font-size: .9rem; }
`;

const pictureWords = [
  { word: "Cat", icon: Cat, left: "27%", top: "49%", prompt: "The cat is sleeping on the books. What is your pet doing? Try a sentence with “is” and a verb ending in “-ing”." },
  { word: "Tea", icon: Coffee, left: "69%", top: "57%", prompt: "Would you like a cup of tea? Practise offering a drink: “Would you like…?”" },
  { word: "Book", icon: BookOpen, left: "43%", top: "80%", prompt: "I read a book yesterday. What did you read yesterday? Try an answer in the past tense." },
  { word: "Music", icon: Music2, left: "84%", top: "39%", prompt: "I like listening to music. What do you like listening to? Tell your teacher about a favourite song in English." },
];

const Editorial = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(13rem, 17rem);
  gap: clamp(2rem, 5vw, 4.5rem);
  align-items: start;
  @media (max-width: 52rem) { grid-template-columns: minmax(0, 1fr); }
`;

const Author = styled.aside`
  border-top: 3px solid #64735c;
  padding: 1.5rem;
  background: #eceadf;
  > div { margin: 0 auto 1rem; }
  h2 { font: 500 1.75rem "Cormorant Garamond", Georgia, serif; margin-bottom: .75rem; }
  p { color: #544f47; font-size: .85rem; }
  a { display: inline-flex; align-items: center; gap: .5rem; min-height: 44px; font-size: .8rem; color: #663047; }
  @media (min-width: 52.001rem) { position: sticky; top: 1.5rem; }
`;

const Journal = styled.section`
  min-width: 0;
  h2 { margin: 0 0 .75rem; font: 500 clamp(2rem, 4vw, 3rem) "Cormorant Garamond", Georgia, serif; scroll-margin-top: 1.5rem; }
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
  input { margin: 0; border-radius: 3px; border-color: #c5baad; background: #fcf9f3; }
  button { border-radius: 3px; }
  button[aria-pressed="true"] { background: #663047; color: #fff; border-color: #663047; }
`;

const Entry = styled.article`
  margin: 0 0 1rem;
  padding: clamp(1rem, 3vw, 2rem) 0 2rem;
  border-bottom: 1px solid #d9cfc2;
  h3 { margin: 0 0 .65rem; font: 500 clamp(1.8rem, 3vw, 2.5rem) "Cormorant Garamond", Georgia, serif; }
  > p { margin: 0 0 1.5rem; color: #6d6258; font-size: .75rem; }
  > div { font-size: .95rem; line-height: 1.85; }
  iframe { border-radius: 3px; }
`;

const longDate = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export default function BlogHome({ data }: { data: Manifest }) {
  const [pictureWord, setPictureWord] = useState<number>();
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
        <Kicker>{copy.homeEyebrow}</Kicker>
        <h1>{copy.homeTitle}</h1>
        <p>{copy.homeIntro}</p>
        <S.Button type="button" onClick={() => {
          const heading = document.getElementById("teacher-journal-heading");
          heading?.focus({ preventScroll: true });
          heading?.scrollIntoView({ block: "start" });
        }}>
          Read the journal <ArrowDown size={16} aria-hidden="true" />
        </S.Button>
      </div>
      <Cover>
        <img src={`${base}images/natalia-studio.png`} alt="A sleeping cat beside art books, a sketchbook, purple flowers and a cup of tea." width={800} height={800} fetchPriority="high" />
        <IllustrationButtons aria-label="Practise English with the picture">
          {pictureWords.map(({ word, icon: Icon, left, top }, index) => (
            <button type="button" key={word} style={{ left, top }} aria-label={`Practise the word ${word}`}
              aria-pressed={pictureWord === index} aria-controls="picture-practice"
              onClick={() => setPictureWord(current => current === index ? undefined : index)}>
              <Icon size={18} aria-hidden="true" />
            </button>
          ))}
        </IllustrationButtons>
        <figcaption>Choose an object. Practise a little English.</figcaption>
      </Cover>
      {pictureWord !== undefined && (
        <Practice id="picture-practice" role="status">
          <strong>{pictureWords[pictureWord].word}</strong>
          <p>{pictureWords[pictureWord].prompt}</p>
        </Practice>
      )}
    </Masthead>
    <CourseLinks aria-label="Course shortcuts">
      <a href="#/materials">Class materials <ArrowUpRight size={16} aria-hidden="true" /></a>
      <a href="#/games">Practise with games <ArrowUpRight size={16} aria-hidden="true" /></a>
      <a href="#/contact">Ask about English lessons <ArrowUpRight size={16} aria-hidden="true" /></a>
    </CourseLinks>
    <Editorial>
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
      <Author aria-labelledby="meet-natalia">
        <TeacherPortrait photo={data.teacherPhoto} stickers={data.teacherStickers} />
        <h2 id="meet-natalia">{data.teacher}</h2>
        <p>Your English teacher. Follow the class notes here and find your own materials in the Students menu.</p>
        <details>
          <summary>A little about your teacher</summary>
          <p>She also teaches history and loves art, BTS, cats and a good cup of tea.</p>
        </details>
        <a href="#/about">Meet your teacher <ArrowUpRight size={15} aria-hidden="true" /></a>
      </Author>
    </Editorial>
  </>;
}
