import { useState } from "react";
import { Pause, Play } from "lucide-react";
import styled, { keyframes } from "styled-components";

const stroll = keyframes`
  from { transform: translateX(-7rem); }
  to { transform: translateX(calc(100vw + 1rem)); }
`;
const step = keyframes`
  from { transform: rotate(-18deg); }
  to { transform: rotate(18deg); }
`;
const tail = keyframes`
  from { transform: rotate(-12deg); }
  to { transform: rotate(12deg); }
`;

const Walkway = styled.div<{ $paused: boolean }>`
  position: fixed;
  bottom: .25rem;
  left: 0;
  right: 0;
  height: 2.8rem;
  z-index: 4;
  pointer-events: none;
  overflow: hidden;
  .cat {
    position: absolute;
    bottom: 0;
    width: 3.7rem;
    height: 2.4rem;
    animation: ${stroll} 36s linear infinite;
  }
  .body {
    position: absolute;
    left: .65rem;
    top: .85rem;
    width: 2.15rem;
    height: 1.05rem;
    border-radius: 48% 48% 30% 30%;
    background: #493d39;
  }
  .head {
    position: absolute;
    left: 2.45rem;
    top: .35rem;
    width: 1.05rem;
    height: 1.1rem;
    border-radius: 35% 35% 45% 45%;
    background: #493d39;
  }
  .head::before, .head::after {
    content: "";
    position: absolute;
    top: -.3rem;
    width: .4rem;
    height: .5rem;
    background: #493d39;
    clip-path: polygon(0 0, 100% 100%, 0 100%);
  }
  .head::before { left: .05rem; }
  .head::after { right: .05rem; transform: scaleX(-1); }
  .eye {
    position: absolute;
    top: .4rem;
    right: .2rem;
    width: .14rem;
    height: .18rem;
    border-radius: 50%;
    background: #eed5a0;
  }
  .tail {
    position: absolute;
    left: .4rem;
    top: .1rem;
    width: .35rem;
    height: 1.4rem;
    border-radius: 1rem;
    background: #493d39;
    transform-origin: bottom;
    animation: ${tail} 1.2s ease-in-out infinite alternate;
  }
  .leg {
    position: absolute;
    bottom: -.45rem;
    width: .3rem;
    height: .85rem;
    background: #493d39;
    border-radius: 0 0 4px 4px;
    transform-origin: top;
    animation: ${step} .5s ease-in-out infinite alternate;
  }
  .leg:nth-of-type(1) { left: .85rem; }
  .leg:nth-of-type(2) { left: 1.2rem; animation-delay: -.5s; }
  .leg:nth-of-type(3) { left: 2.15rem; animation-delay: -.5s; }
  .leg:nth-of-type(4) { left: 2.5rem; }
  .cat, .cat * { animation-play-state: ${p => p.$paused ? "paused" : "running"}; }
  @media (prefers-reduced-motion: reduce) {
    .cat { left: 1rem; transform: none; }
    .cat, .cat * { animation: none; }
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
    <Walkway $paused={paused} aria-hidden="true">
      <div className="cat">
        <span className="tail" />
        <div className="body">
          <span className="leg" /><span className="leg" />
          <span className="leg" /><span className="leg" />
        </div>
        <span className="head"><span className="eye" /></span>
      </div>
    </Walkway>
    <Toggle type="button" onClick={() => setPaused(value => !value)}
      aria-label={paused ? "Resume walking cat" : "Pause walking cat"}
      title={paused ? "Resume walking cat" : "Pause walking cat"}>
      {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
    </Toggle>
  </>;
}
