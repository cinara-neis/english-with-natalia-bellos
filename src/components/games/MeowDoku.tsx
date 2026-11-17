import { useState } from "react";
import { Cat } from "lucide-react";
import * as S from "../../styles";
import { sudokuPuzzles, validSudoku } from "./puzzles";
import { Actions, Board, Feedback, GamePanel } from "./styles";

const entries = (puzzle: string) => [...puzzle].map(value => value === "0" ? "" : value);

export default function MeowDoku() {
  const [round, setRound] = useState(0);
  const [values, setValues] = useState(() => entries(sudokuPuzzles[0]));
  const [message, setMessage] = useState("A little logic, a little patience.");
  const puzzle = sudokuPuzzles[round % sudokuPuzzles.length];
  return <GamePanel aria-labelledby="doku-title">
    <h2 id="doku-title"><Cat size={26} aria-hidden="true" /> Meow-doku</h2>
    <p>A mini 4 × 4 Sudoku. Fill each row, column and outlined 2 × 2 box with the numbers 1, 2, 3 and 4. Each number appears once in each.</p>
    <Board $columns={4} aria-label="Meow-doku puzzle">
      {values.map((value, index) => {
        const fixed = puzzle[index] !== "0";
        return <div key={index} style={{
          borderRightWidth: index % 4 === 1 ? 3 : 1,
          borderBottomWidth: Math.floor(index / 4) === 1 ? 3 : 1,
        }}>
          <input aria-label={`Row ${Math.floor(index / 4) + 1}, column ${index % 4 + 1}${fixed ? ", given number" : ""}`}
            readOnly={fixed} value={value} inputMode="numeric" pattern="[1-4]" maxLength={1} autoComplete="off"
            onChange={event => {
              const next = event.target.value;
              if (!/^[1-4]?$/.test(next)) return;
              setValues(current => current.map((entry, cell) => cell === index ? next : entry));
              setMessage("Keep going. Check your answer when you’re ready.");
            }} />
        </div>;
      })}
    </Board>
    <Actions>
      <S.Button type="button" onClick={() => setMessage(
        values.some(value => !value) ? "Some squares are still empty. Fill all sixteen squares." :
          validSudoku(values) ? "Purr-fect! Every row, column and box is correct." :
            "A number repeats in a row, column or box. Take another look.",
      )}>Check Meow-doku</S.Button>
      <S.Button type="button" $secondary onClick={() => {
        setValues(entries(puzzle)); setMessage("Puzzle reset. Try again.");
      }}>Reset puzzle</S.Button>
      <S.Button type="button" $secondary onClick={() => {
        const next = round + 1; setRound(next);
        setValues(entries(sudokuPuzzles[next % sudokuPuzzles.length]));
        setMessage("New puzzle. You can do this!");
      }}>Next puzzle</S.Button>
    </Actions>
    <Feedback role="status">{message}</Feedback>
  </GamePanel>;
}
