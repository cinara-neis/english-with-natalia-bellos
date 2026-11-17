import { useState } from "react";
import { Pause, Play } from "lucide-react";
import styled, { keyframes } from "styled-components";
import { base } from "../lib";

const explore = keyframes`
  0%, 100% { left: 1%; top: 15%; }
  24%, 28% { left: calc(99% - 6rem); top: 35%; }
  49%, 53% { left: 1%; top: 65%; }
  74%, 78% { left: calc(99% - 6rem); top: calc(100% - 9rem); }
`;
const frames = keyframes`
  from { background-position: 0 0; }
  to { background-position: 100% 0; }
`;
const face = keyframes`
  0%, 24% { transform: scaleX(1); }
  25%, 49% { transform: scaleX(-1); }
  50%, 74% { transform: scaleX(1); }
  75%, 100% { transform: scaleX(-1); }
`;

const Walkway = styled.div<{ $paused: boolean; $image: string }>`
  position: fixed;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  overflow: hidden;
  .traveller {
    position: absolute;
    width: 6rem;
    aspect-ratio: 3 / 4;
    left: 1%;
    top: 15%;
    animation: ${explore} 72s linear infinite;
  }
  .direction {
    width: 100%;
    height: 100%;
    animation: ${face} 72s step-end infinite;
  }
  .cat {
    width: 100%;
    height: 100%;
    background-image: url("${p => p.$image}");
    background-size: 400% 100%;
    background-repeat: no-repeat;
    animation: ${frames} .8s steps(3) infinite alternate;
  }
  .traveller, .direction, .cat { animation-play-state: ${p => p.$paused ? "paused" : "running"}; }
  @media (prefers-reduced-motion: reduce) {
    .traveller { top: auto; bottom: 0; }
    .traveller, .direction, .cat { animation: none; }
  }
  @media print { display: none; }
`;

const Toggle = styled.button`
  position: fixed;
  bottom: 3.35rem;
  left: .6rem;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #bfb2a2;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  background: #f7f2e9;
  color: #493d39;
  @media (prefers-reduced-motion: reduce), print { display: none; }
`;

export default function WalkingCat() {
  const [paused, setPaused] = useState(false);
  return <>
    <Walkway $paused={paused} $image={`${base}images/walking-cat.png`} aria-hidden="true">
      <div className="traveller"><div className="direction"><div className="cat" /></div></div>
    </Walkway>
    <Toggle type="button" onClick={() => setPaused(value => !value)}
      aria-label={paused ? "Resume walking cat" : "Pause walking cat"}
      title={paused ? "Resume walking cat" : "Pause walking cat"}>
      {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
    </Toggle>
  </>;
}
