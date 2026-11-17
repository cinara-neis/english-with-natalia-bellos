import { useState } from "react";
import { btsPhotos } from "../../shared/btsMedia";
import { base } from "../lib";
import styled, { keyframes } from "styled-components";
import { teacherStickers, type TeacherSticker } from "../../shared/teacherStickers";

const bounce = keyframes`
  0%, 100% { transform: translateY(0) rotate(0); }
  35% { transform: translateY(-3px) rotate(-7deg); }
  68% { transform: translateY(0) rotate(5deg); }
`;

const Art = styled.span`
  display: inline-grid;
  place-items: center;
  flex: none;
  position: relative;
  width: 2.25rem;
  height: 2.25rem;
  color: #653b94;
  line-height: 1;
  img { width: 100%; height: 100%; border-radius: .4rem; object-fit: cover; }
  .icon { font-size: 1.2rem; }
  .accent { position: absolute; top: .05rem; right: .05rem; font-size: .65rem; }
  @media (prefers-reduced-motion: no-preference) {
    &.animated, button:hover &, button:focus-visible & {
      animation: ${bounce} .7s ease-in-out 3;
    }
  }
`;

const Lineup = styled.span`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  align-items: end;
  width: calc(100% - 2px);
  gap: 1px 0;
  padding: 3px 1px;
  border-radius: 5px;
  background: #ede0fc;
  > span {
    grid-column: span 2;
    display: grid;
    justify-items: center;
  }
  > span:first-child { grid-column: 2 / span 2; }
  > span::before {
    content: "";
    width: 6px;
    height: 7px;
    border-radius: 55% 55% 45% 45%;
    background: #eebb9c;
    box-shadow: inset 0 2px var(--hair);
  }
  > span::after {
    content: "";
    width: 7px;
    height: 4px;
    border-radius: 3px 3px 1px 1px;
    background: var(--jacket);
  }
  > span:nth-child(3n+1) { --hair: #292033; --jacket: #6742a8; }
  > span:nth-child(3n+2) { --hair: #633c30; --jacket: #301c4f; }
  > span:nth-child(3n) { --hair: #735189; --jacket: #9250af; }
`;

export default function StickerArt({ id, animate = false }: { id: TeacherSticker; animate?: boolean }) {
  const sticker = teacherStickers[id];
  const [failed, setFailed] = useState(false);
  const photo = "photo" in sticker ? btsPhotos[sticker.photo] : undefined;
  return (
    <Art aria-hidden="true" className={animate ? "animated" : undefined}>
      {photo && !failed ? (
        <img src={photo.src.startsWith("https:") ? photo.src : base + photo.src} alt="" loading="lazy"
          referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : id === "group" ? (
        <Lineup>{Array.from({ length: 7 }, (_, index) => <span key={index} />)}</Lineup>
      ) : <span className="icon">{sticker.icon}</span>}
      {"accent" in sticker && <span className="accent">{sticker.accent}</span>}
    </Art>
  );
}
