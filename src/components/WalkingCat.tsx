import { useEffect, useId, useRef, useState } from "react";
import { Cat, Circle, Fish, Pause, Play, X } from "lucide-react";
import styled, { keyframes } from "styled-components";
import { base } from "../lib";

const coats = {
  tuxedo: { label: "Tuxedo", image: "images/walking-cat.png" },
  ginger: { label: "Ginger", image: "images/walking-cat-ginger.png" },
} as const;
type Coat = keyof typeof coats;
type Reaction = "idle" | "feed" | "play";
const preferenceKey = "natalia-cat-colour";

function initialCoat(): Coat {
  try {
    const value = localStorage.getItem(preferenceKey);
    return value === "ginger" ? "ginger" : "tuxedo";
  } catch { return "tuxedo"; }
}

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
const hop = keyframes`
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-10px) rotate(-3deg); }
`;
const nibble = keyframes`
  from { transform: rotate(0); }
  to { transform: rotate(4deg); }
`;
const roll = keyframes`
  from { transform: translateX(-1rem) rotate(-90deg); }
  to { transform: translateX(1rem) rotate(90deg); }
`;

const Visual = styled.div<{ $image: string; $paused: boolean }>`
  width: 6rem;
  aspect-ratio: 3 / 4;
  position: relative;
  .sprite {
    width: 100%;
    height: 100%;
    background: url("${p => p.$image}") 0 0 / 400% 100% no-repeat;
    animation: ${frames} .8s steps(3) infinite alternate;
  }
  .reaction { width: 100%; height: 100%; }
  .prop { position: absolute; bottom: 12%; right: -.4rem; font-size: 1.4rem; }
  .bubble {
    position: absolute;
    top: 0;
    left: 50%;
    padding: .15rem .45rem;
    border: 1px solid #bb9cab;
    border-radius: .5rem;
    background: #fffdf8;
    color: #663047;
    white-space: nowrap;
    font-size: .75rem;
  }
  &[data-action="play"] .sprite { animation-duration: .35s; }
  &[data-action="play"] .reaction { animation: ${hop} .6s ease-in-out 6; }
  &[data-action="play"] .prop { animation: ${roll} .6s ease-in-out 6 alternate; }
  &[data-action="feed"] .sprite { animation: none; }
  &[data-action="feed"] .reaction { transform-origin: 75% 70%; animation: ${nibble} .4s ease-in-out 8 alternate; }
  .sprite, .reaction, .prop { animation-play-state: ${p => p.$paused ? "paused" : "running"} !important; }
  @media (prefers-reduced-motion: reduce) {
    .sprite, .reaction, .prop { animation: none !important; }
  }
`;

function CatVisual({ coat, reaction, paused }: { coat: Coat; reaction: Reaction; paused: boolean }) {
  return <Visual $image={base + coats[coat].image} $paused={paused} data-action={reaction} aria-hidden="true">
    <div className="reaction"><div className="sprite" /></div>
    {reaction !== "idle" && <>
      <span className="prop">{reaction === "feed" ? "🥣" : "🧶"}</span>
      <span className="bubble">{reaction === "feed" ? "Yum!" : "Meow!"}</span>
    </>}
  </Visual>;
}

const Walkway = styled.div<{ $paused: boolean }>`
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
  .direction { width: 100%; height: 100%; animation: ${face} 72s step-end infinite; }
  .traveller, .direction { animation-play-state: ${p => p.$paused ? "paused" : "running"}; }
  @media (prefers-reduced-motion: reduce) {
    .traveller { top: auto; bottom: 0; }
    .traveller, .direction { animation: none; }
  }
  @media print { display: none; }
`;

const Dock = styled.div`
  position: fixed;
  bottom: 3.35rem;
  left: .6rem;
  z-index: 5;
  display: flex;
  gap: .35rem;
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #bfb2a2;
    border-radius: 50%;
    min-width: 44px;
    min-height: 44px;
    background: #f7f2e9;
    color: #493d39;
  }
  @media (prefers-reduced-motion: reduce) { .pause { display: none; } }
  @media print { display: none; }
`;
const Panel = styled.section`
  position: fixed;
  left: .6rem;
  bottom: 6.6rem;
  z-index: 9;
  width: min(21rem, calc(100vw - 1.2rem));
  max-height: calc(100dvh - 8rem);
  overflow-y: auto;
  padding: 1rem;
  border: 1px solid #c9b7c1;
  border-radius: .8rem;
  box-shadow: 0 8px 35px #30212b30;
  background: #fffdf8;
  color: #3b2e35;
  header { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
  h2 { font-size: 1.6rem; margin: 0; }
  p { font-size: .85rem; margin: .7rem 0 0; }
  > div.preview { display: flex; justify-content: center; height: 8rem; background: #f2eaf0; border-radius: .5rem; margin: .75rem 0; }
  .actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .75rem; }
  button {
    display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
    min-height: 44px; padding: .45rem .65rem; border: 1px solid #bea5b5;
    border-radius: .4rem; background: #f5edf3; color: #523448;
  }
  header button { min-width: 44px; padding: .4rem; }
  fieldset { margin: .8rem 0; padding: 0; border: 0; }
  legend { font-size: .85rem; font-weight: 600; }
  @media print { display: none; }
`;

export default function WalkingCat() {
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const [coat, setCoat] = useState<Coat>(initialCoat);
  const [reaction, setReaction] = useState<Reaction>("idle");
  const [message, setMessage] = useState("Your little English study companion.");
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const reactionTimer = useRef<number | undefined>(undefined);
  const panelId = useId();
  const headingId = useId();

  useEffect(() => () => window.clearTimeout(reactionTimer.current), []);
  useEffect(() => {
    if (!open) return;
    heading.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false);
    };
    const navigate = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("hashchange", navigate);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("hashchange", navigate);
    };
  }, [open]);

  function chooseCoat(next: Coat) {
    setCoat(next);
    try { localStorage.setItem(preferenceKey, next); } catch { /* The colour still works for this visit. */ }
  }
  function interact(next: "feed" | "play") {
    window.clearTimeout(reactionTimer.current);
    setReaction(next);
    setMessage(next === "feed" ? "Yum! Thanks for the treat. Say: “The cat is eating.”" : "Play time! Say: “The cat is playing with a ball.”");
    reactionTimer.current = window.setTimeout(() => setReaction("idle"), 4200);
  }
  function close() { setOpen(false); trigger.current?.focus(); }

  return <>
    <Walkway $paused={paused || open || reaction !== "idle"} aria-hidden="true">
      <div className="traveller"><div className="direction"><CatVisual coat={coat} reaction={reaction} paused={paused} /></div></div>
    </Walkway>
    <Dock>
      <button type="button" ref={trigger} aria-label="Open cat companion" title="Cat companion"
        aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
        <Cat size={19} aria-hidden="true" />
      </button>
      <button type="button" className="pause" onClick={() => setPaused(value => !value)}
        aria-label={paused ? "Resume walking cat" : "Pause walking cat"}
        title={paused ? "Resume walking cat" : "Pause walking cat"}>
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>
    </Dock>
    <Panel hidden={!open} ref={panel} id={panelId} role="dialog" aria-modal="false" aria-labelledby={headingId}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
      <header>
        <h2 ref={heading} tabIndex={-1} id={headingId}>Your study cat</h2>
        <button type="button" aria-label="Close cat companion" onClick={close}><X size={17} aria-hidden="true" /></button>
      </header>
      <div className="preview"><CatVisual coat={coat} reaction={reaction} paused={paused} /></div>
      <fieldset>
        <legend>Cat colour</legend>
        <div className="actions">
          {(Object.keys(coats) as Coat[]).map(id => <button type="button" key={id} aria-pressed={coat === id} onClick={() => chooseCoat(id)}>{coats[id].label}</button>)}
        </div>
      </fieldset>
      <div className="actions">
        <button type="button" onClick={() => interact("feed")}><Fish size={16} aria-hidden="true" /> Feed the cat</button>
        <button type="button" onClick={() => interact("play")}><Circle size={16} aria-hidden="true" /> Play with the cat</button>
      </div>
      <p role="status">{message}</p>
      <p><small>Your colour choice is saved in this browser.</small></p>
    </Panel>
  </>;
}
