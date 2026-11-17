import { useRef, useState } from "react";
import * as S from "../../styles";
import { crosswordCells, crosswords } from "./puzzles";
import { Actions, Board, Feedback, GamePanel } from "./styles";

const starts: Record<number, number> = { 0: 1, 2: 2, 12: 3 };
export default function Crossword() {
  const [round, setRound] = useState(0);
  const [values, setValues] = useState<string[]>(() => Array(15).fill(""));
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState("Use the clues to fill the seven white squares.");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const puzzle = crosswords[round % crosswords.length];
  const solution = crosswordCells(puzzle);
  function focusCell(index: number) { inputs.current[index]?.focus(); }
  return <GamePanel aria-labelledby="crossword-title">
    <h2 id="crossword-title">English crossword</h2>
    <p>Three little words, one connected puzzle. Type one letter per square. Use the arrow keys to move. Clue buttons take you to the first square of each word.</p>
    <Board $columns={5} aria-label="Crossword puzzle">
      {solution.map((answer, index) => !answer ? <div className="blocked" aria-hidden="true" key={index} /> : (
        <div key={index}>
          {starts[index] && <small aria-hidden="true">{starts[index]}</small>}
          <input ref={element => { inputs.current[index] = element; }}
            aria-label={`Crossword row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}${starts[index] ? ", clue " + starts[index] : ""}`}
            aria-invalid={checked && values[index] !== answer ? true : undefined}
            maxLength={1} value={values[index]} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            onKeyDown={event => {
              const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 };
              const offset = offsets[event.key];
              if (!offset) return;
              event.preventDefault();
              const next = index + offset;
              if (Math.abs(offset) === 1 && Math.floor(next / 5) !== Math.floor(index / 5)) return;
              if (solution[next]) focusCell(next);
            }}
            onChange={event => {
              const value = event.target.value.replace(/[^a-z]/gi, "").toUpperCase();
              setValues(current => current.map((entry, cell) => cell === index ? value : entry));
              setChecked(false);
              setMessage("Keep going. Check your answer when you’re ready.");
            }} />
        </div>
      ))}
    </Board>
    <h3>Across</h3>
    <p><S.LinkButton type="button" onClick={() => focusCell(0)}>1. {puzzle.clues[0]} (3 letters)</S.LinkButton></p>
    <p><S.LinkButton type="button" onClick={() => focusCell(12)}>3. {puzzle.clues[2]} (3 letters)</S.LinkButton></p>
    <h3>Down</h3>
    <p><S.LinkButton type="button" onClick={() => focusCell(2)}>2. {puzzle.clues[1]} (3 letters)</S.LinkButton></p>
    <Actions>
      <S.Button type="button" onClick={() => {
        setChecked(true);
        const correct = solution.every((answer, index) => !answer || values[index] === answer);
        setMessage(correct ? "Brilliant! All three words fit." : "Check the marked squares. Use the clues and try again.");
      }}>Check crossword</S.Button>
      <S.Button type="button" $secondary onClick={() => {
        setValues(Array(15).fill("")); setChecked(false); setMessage("Puzzle cleared. Have another go.");
      }}>Clear answers</S.Button>
      <S.Button type="button" $secondary onClick={() => {
        setRound(value => value + 1); setValues(Array(15).fill(""));
        setChecked(false); setMessage("A new set of clues is ready.");
      }}>Next crossword</S.Button>
    </Actions>
    <Feedback role="status">{message}</Feedback>
  </GamePanel>;
}
