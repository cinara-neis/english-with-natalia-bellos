import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Play, X } from "lucide-react";
import styled from "styled-components";
import { btsSongs, type BtsPhoto } from "../../shared/btsMedia";
import * as S from "../styles";
import { base } from "../lib";

const MediaDialog = styled(S.Dialog)`
  width: min(52rem, calc(100vw - 2rem));
  max-width: 52rem;
  color: #382d35;
  h2 { margin: 0; }
  header { display: flex; justify-content: space-between; align-items: start; gap: 1rem; margin-bottom: 1rem; }
  header button { flex: none; }
`;
const Playlist = styled.div`
  display: grid;
  gap: .5rem;
  margin-block: 1rem;
  button { text-align: left; justify-content: flex-start; gap: .65rem; border-radius: .4rem; }
`;
const Player = styled.div`
  margin-top: 1rem;
  iframe { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: .5rem; background: #211b23; }
  p { margin: .7rem 0; }
`;
const Figure = styled.figure`
  margin: 0;
  img { display: block; max-height: 65vh; max-width: 100%; height: auto; width: auto; margin: auto; border-radius: .5rem; }
  figcaption { font-size: .8rem; margin-top: 1rem; line-height: 1.7; }
  a { display: inline-block; padding-block: .25rem; }
`;

function StickerDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    heading.current?.focus();
    document.body.style.overflow = "hidden";
    window.addEventListener("hashchange", onClose);
    return () => {
      window.removeEventListener("hashchange", onClose);
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (before?.isConnected) before.focus();
    };
  }, [onClose]);
  return <MediaDialog ref={dialog} aria-labelledby={titleId} aria-modal="true" tabIndex={-1}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header>
      <h2 ref={heading} tabIndex={-1} id={titleId}>{title}</h2>
      <S.Button type="button" $secondary aria-label="Close sticker window" onClick={onClose}><X size={19} aria-hidden="true" /></S.Button>
    </header>
    {children}
  </MediaDialog>;
}

export function BtsPlaylist({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<number>();
  const song = selected === undefined ? undefined : btsSongs[selected];
  return <StickerDialog title="BTS listening corner" onClose={onClose}>
    <p>Choose an official music video and practise a little English. The video loads when you choose a song.</p>
    <Playlist aria-label="BTS video selection">
      {btsSongs.map((track, index) => <S.Button type="button" key={track.id}
        $secondary={selected !== index} aria-pressed={selected === index}
        onClick={() => setSelected(index)}>
        <Play size={16} aria-hidden="true" /> {track.title}
      </S.Button>)}
    </Playlist>
    {song && <Player>
      <iframe key={song.id} title={`BTS — ${song.title}`}
        src={`https://www.youtube-nocookie.com/embed/${song.id}?rel=0`}
        allow="encrypted-media; picture-in-picture" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin" />
      <p>{song.prompt}</p>
      <a href={`https://www.youtube.com/watch?v=${song.id}`} target="_blank" rel="noopener noreferrer">
        Watch {song.title} on YouTube (opens in a new tab)
      </a>
    </Player>}
    <p><small>Official videos from HYBE LABELS. Choose another song above to switch videos.</small></p>
  </StickerDialog>;
}

export function BtsPhotoViewer({ photo, onClose }: { photo: BtsPhoto; onClose: () => void }) {
  const [failed, setFailed] = useState(false);
  return <StickerDialog title={photo.title} onClose={onClose}>
    <Figure>
      {!failed ? <img src={photo.src.startsWith("https:") ? photo.src : base + photo.src} alt={photo.alt} onError={() => setFailed(true)} /> :
        <S.Notice>The photo could not be loaded. You can open the original image using the source link below.</S.Notice>}
      <figcaption>
        Photo · {photo.credit}. Displayed in a cropped thumbnail on the sticker.
        {" "}<a href={photo.source} target="_blank" rel="noopener noreferrer">Image source (opens in a new tab)</a>
        {" · "}<a href={photo.licenceUrl} target="_blank" rel="noopener noreferrer">{photo.licence} (opens in a new tab)</a>
      </figcaption>
    </Figure>
  </StickerDialog>;
}
