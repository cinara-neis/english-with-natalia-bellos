import { useCallback, useId, useState } from "react";
import styled from "styled-components";
import { teacherStickers } from "../../shared/teacherStickers";
import type { Manifest } from "../../shared/content";
import { base } from "../lib";
import StickerArt from "./StickerArt";
import { btsPhotos } from "../../shared/btsMedia";
import { BtsPhotoViewer, BtsPlaylist } from "./BtsMedia";

const Portrait = styled.div`
  position: relative;
  width: 130px;
  margin-inline: auto;
  > img { display: block; width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; border-radius: 50%; }
  @media (max-width: 62rem) { width: 64px; grid-row: 1 / 3; margin-inline: 0; }
`;
const Sticker = styled.button`
  position: absolute;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid #8b9b7e;
  border-radius: 50%;
  background: #fffdf7;
  font-size: 1.2rem;
  line-height: 1;
  box-shadow: 0 2px 5px #0002;
  &[data-slot="0"] { top: -4px; right: -14px; }
  &[data-slot="1"] { bottom: -4px; left: -14px; }
  &[data-slot="2"] { bottom: -4px; right: -14px; }
  @media (prefers-reduced-motion: no-preference) {
    transition: transform 180ms ease;
    &:hover, &:focus-visible, &[aria-expanded="true"] { transform: translateY(-3px) rotate(8deg); }
  }
  @media (max-width: 62rem) {
    &[data-slot] { position: static; }
  }
`;
const StickerGroup = styled.span`
  @media (max-width: 62rem) {
    display: flex;
    gap: 4px;
    margin-block-start: 4px;
    flex-wrap: wrap;
  }
`;
const StickerNote = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 2;
  width: 11rem;
  padding: .6rem;
  border: 1px solid currentColor;
  border-radius: .6rem;
  background: #fffdf7;
  color: #283729;
  font-size: .85rem;
  text-align: left;
  html[data-high-contrast="true"] & { background: black; color: white; }
`;

export default function TeacherPortrait({ photo, stickers = [] }: { photo?: Manifest["teacherPhoto"]; stickers?: Manifest["teacherStickers"] }) {
  const [media, setMedia] = useState<"music" | keyof typeof btsPhotos>();
  const closeMedia = useCallback(() => setMedia(undefined), []);
  const [active, setActive] = useState<NonNullable<Manifest["teacherStickers"]>[number]>();
  const noteId = useId();
  const visible = active && stickers.includes(active) ? teacherStickers[active] : null;
  return <Portrait onKeyDown={event => { if (event.key === "Escape") setActive(undefined); }}>
    <img src={photo?.src || `${base}teacher.svg`} alt={photo?.alt || "Illustration of a smiling teacher holding a book"} />
    <StickerGroup>
      {stickers.map((id, index) => {
        const sticker = teacherStickers[id];
        const hasPhoto = "photo" in sticker;
        const opensWindow = id === "music" || hasPhoto;
        return <Sticker key={id} type="button" data-slot={index} aria-label={sticker.label}
          aria-haspopup={opensWindow ? "dialog" : undefined}
          aria-expanded={opensWindow ? media === (hasPhoto ? sticker.photo : "music") : id === active}
          aria-controls={opensWindow ? undefined : noteId}
          onClick={() => {
            if (opensWindow) {
              setActive(undefined);
              setMedia(hasPhoto ? sticker.photo : "music");
            } else setActive(current => current === id ? undefined : id);
          }}>
          <StickerArt key={id === active ? "open" : "closed"} id={id} animate />
        </Sticker>;
      })}
    </StickerGroup>
    <StickerNote id={noteId} role="status" hidden={!visible}>{visible?.note}</StickerNote>
    {media === "music" && <BtsPlaylist onClose={closeMedia} />}
    {media && media !== "music" && <BtsPhotoViewer photo={btsPhotos[media]} onClose={closeMedia} />}
  </Portrait>;
}
