import { useState } from "react";
import * as S from "../styles";

export function youtubeVideoId(value: string) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname;
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.match(/^\/([\w-]+)\/?$/)?.[1] || null;
    else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") :
        url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)\/?$/)?.[1] || null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

function VideoCard({ id, number }: { id: string; number: number }) {
  const [playing, setPlaying] = useState(false);
  return <S.Card as="div" style={{ marginBlock: "1rem", maxWidth: "40rem" }}>
    <strong>YouTube video</strong>
    {playing ? (
      <iframe
        title={`YouTube video player ${number}`}
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        style={{ width: "100%", minHeight: 200, aspectRatio: "16 / 9", border: 0 }}
      />
    ) : (
      <S.Button type="button" $secondary onClick={() => setPlaying(true)} aria-label={`Load YouTube video ${number}`}>
        Load video
      </S.Button>
    )}
    <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">
      Watch on YouTube (opens in a new tab)
    </a>
  </S.Card>;
}

function splitLinks(text: string) {
  return text.split(/(https?:\/\/[^\s<>"']+)/gi);
}

function withoutTrailingPunctuation(url: string) {
  return url.replace(/[.,!?;:)\]}]+$/, "");
}

export function hasYouTubeVideo(text: string) {
  return splitLinks(text).some((part, index) =>
    index % 2 === 1 && youtubeVideoId(withoutTrailingPunctuation(part)));
}

export default function YouTubeText({ text }: { text: string }) {
  const videos = new Set<string>();
  const parts = splitLinks(text);
  return <div>
    <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {parts.map((part, index) => {
        if (index % 2 === 0) return part;
        const url = withoutTrailingPunctuation(part);
        const id = youtubeVideoId(url);
        if (!id) return part;
        if (videos.size < 3) videos.add(id);
        return <span key={index}><a href={`https://www.youtube.com/watch?v=${id}`}>{url}</a>{part.slice(url.length)}</span>;
      })}
    </div>
    {[...videos].map((id, index) => <VideoCard key={id} id={id} number={index + 1} />)}
  </div>;
}
