import { useRef, useState } from "react";
import { Cat, Heart, X } from "lucide-react";
import styled from "styled-components";
import * as S from "../../styles";
import { catPuzzles } from "./puzzles";
import { Actions, Feedback, GamePanel } from "./styles";

const territories = [
  { name: "Rose", colour: "#efd1d8" },
  { name: "Mint", colour: "#d3e5d9" },
  { name: "Lilac", colour: "#e1d4ed" },
  { name: "Honey", colour: "#f3e3b1" },
  { name: "Sky", colour: "#cfdfef" },
];

const CatBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  max-width: 24rem;
  width: 100%;
  border: 2px solid #66565e;
  margin-block: 1rem;
  button {
    position: relative;
    min-width: 0;
    min-height: 44px;
    aspect-ratio: 1;
    padding: .3rem;
    border: 1px solid #ffffffb0;
    border-radius: 0;
    display: grid;
    place-items: center;
    color: #3c3039;
  }
  button:focus-visible { outline: 3px solid #613448; outline-offset: -4px; z-index: 1; }
  button:disabled { cursor: default; opacity: 1; }
  small { position: absolute; top: 1px; left: 4px; font-size: .6rem; color: #493b42; }
  svg { width: clamp(20px, 5vw, 30px); height: auto; }
`;

const Legend = styled.div`
  display: flex;
  gap: .4rem .9rem;
  flex-wrap: wrap;
  font-size: .8rem;
  span { display: inline-flex; align-items: center; gap: .35rem; }
  i { width: .8rem; height: .8rem; border: 1px solid #66565e; }
`;

export default function MeowDoku() {
  const [round, setRound] = useState(0);
  const [mode, setMode] = useState<"mark" | "cat">("mark");
  const [cats, setCats] = useState<number[]>([]);
  const [marks, setMarks] = useState<number[]>([]);
  const [lives, setLives] = useState(3);
  const [message, setMessage] = useState("Start by marking squares where a cat cannot go.");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const puzzle = catPuzzles[round % catPuzzles.length];
  const won = cats.length === 5;
  const finished = won || lives === 0;

  function select(index: number) {
    if (finished) return;
    if (cats.includes(index)) {
      if (mode === "cat") {
        setCats(current => current.filter(cell => cell !== index));
        setMessage("Cat removed. You can place it again.");
      }
      return;
    }
    if (mode === "mark") {
      setMarks(current => current.includes(index) ? current.filter(cell => cell !== index) : [...current, index]);
      setMessage("X mark updated. Marks do not cost a heart.");
      return;
    }
    if (!puzzle.solution.includes(index)) {
      setMarks(current => current.includes(index) ? current : [...current, index]);
      setLives(current => current - 1);
      setMessage(lives === 1 ? "No hearts left. Restart the puzzle and try again." :
        "That square is not a cat’s home. One heart lost. Check the rows, columns, regions and diagonals.");
      return;
    }
    setCats(current => [...current, index]);
    setMarks(current => current.filter(cell => cell !== index));
    setMessage(cats.length === 4 ? "Purr-fect! One cat in every row, column and region. No cats touch!" :
      "A happy cat found its home. Keep going!");
  }

  function reset(next: number) {
    setRound(next); setCats([]); setMarks([]); setLives(3); setMode("mark");
    setMessage("Start by marking squares where a cat cannot go.");
  }

  return <GamePanel aria-labelledby="doku-title">
    <h2 id="doku-title"><Cat size={26} aria-hidden="true" /> Meow-doku</h2>
    <p>Find five cats. Place exactly one cat in each row, column and coloured region. Cats must not touch, even diagonally. A wrong cat placement costs one of your three hearts.</p>
    <p><strong>{lives} hearts remaining</strong> · {cats.length} of 5 cats found
      <span aria-hidden="true"> {Array.from({ length: lives }, (_, index) => <Heart key={index} size={17} fill="#a95b74" />)}</span>
    </p>
    <Actions aria-label="Choose your move">
      <S.Button type="button" $secondary={mode !== "mark"} aria-pressed={mode === "mark"} disabled={finished} onClick={() => setMode("mark")}><X size={17} aria-hidden="true" /> Mark X</S.Button>
      <S.Button type="button" $secondary={mode !== "cat"} aria-pressed={mode === "cat"} disabled={finished} onClick={() => setMode("cat")}><Cat size={17} aria-hidden="true" /> Place cat</S.Button>
    </Actions>
    <Legend aria-label="Region names">
      {territories.map(({ name, colour }, index) => <span key={name}><i style={{ background: colour }} aria-hidden="true" />{index + 1}. {name}</span>)}
    </Legend>
    <CatBoard aria-label="Meow-doku puzzle">
      {puzzle.regions.map((region, index) => {
        const isCat = cats.includes(index);
        const isMarked = marks.includes(index);
        return <button type="button" key={index} disabled={finished}
          ref={element => { buttons.current[index] = element; }}
          style={{
            backgroundColor: territories[region].colour,
            borderRight: index % 5 < 4 && puzzle.regions[index + 1] !== region ? "2px solid #66565e" : undefined,
            borderBottom: index < 20 && puzzle.regions[index + 5] !== region ? "2px solid #66565e" : undefined,
          }}
          aria-label={`Row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}, ${territories[region].name} region, ${isCat ? "cat" : isMarked ? "X" : "empty"}`}
          onClick={() => select(index)}
          onKeyDown={event => {
            const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 };
            const offset = offsets[event.key];
            if (!offset) return;
            event.preventDefault();
            const next = index + offset;
            if (next < 0 || next >= 25 || (Math.abs(offset) === 1 && Math.floor(next / 5) !== Math.floor(index / 5))) return;
            buttons.current[next]?.focus();
          }}>
          <small aria-hidden="true">{region + 1}</small>
          {isCat ? <Cat aria-hidden="true" /> : isMarked ? <X aria-hidden="true" /> : null}
        </button>;
      })}
    </CatBoard>
    <Feedback role="status">{message}</Feedback>
    <Actions>
      <S.Button type="button" $secondary onClick={() => reset(round)}>Restart Meow-doku</S.Button>
      <S.Button type="button" $secondary onClick={() => reset(round + 1)}>Next puzzle</S.Button>
    </Actions>
  </GamePanel>;
}
