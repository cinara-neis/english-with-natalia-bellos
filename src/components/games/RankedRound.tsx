import { useState } from "react";
import { Cat, Sparkles, X } from "lucide-react";
import * as S from "../../styles";
import { Actions, Board, Feedback } from "./styles";
import { MemoryCards, MemoryTile } from "./MemoryMatch";
import { CatBoard, territories } from "./MeowDoku";
import type { RankedRun } from "./rankingTypes";

export default function RankedRound({ run, busy, onMove }: {
  run: RankedRun;
  busy: boolean;
  onMove: (action: Record<string, unknown>) => void;
}) {
  const [answers, setAnswers] = useState<string[]>(() => Array(15).fill(""));
  const [mode, setMode] = useState<"mark" | "cat">("mark");
  const ended = run.won || run.lost;
  return <section aria-label="Your ranked round">
    <fieldset disabled={busy || ended} style={{ border: 0, padding: 0, margin: 0 }}>
      <S.ScreenReaderOnly as="legend">Play your ranked round</S.ScreenReaderOnly>
      {run.config.game === "memory" && <>
        <p>Match each word to its picture. Turns used: {run.metric}.</p>
        <MemoryCards aria-label="Ranked memory cards">
          {run.cards?.map((card, index) => {
            const matched = !!run.matched?.[index];
            return <MemoryTile key={index} type="button" $open={!!card} $matched={matched}
              aria-disabled={matched || !!run.needsCover || !!card}
              aria-label={card ? `${matched ? "Matched: " : ""}${card.side === "word" ? "Word" : "Picture"}: ${card.word}` : `Turn ranked card ${index + 1}`}
              onClick={() => { if (!card && !run.needsCover) onMove({ type: "flip", cell: index }); }}>
              {!card ? <Sparkles size={22} aria-hidden="true" /> : card.side === "word" ? <span>{card.word}</span> :
                card.colour ? <span className="swatch" style={{ background: card.colour }} aria-hidden="true" /> :
                  <span className="picture" aria-hidden="true">{card.picture}</span>}
              {matched && <small aria-hidden="true">Matched</small>}
            </MemoryTile>;
          })}
        </MemoryCards>
        {run.needsCover && <S.Button type="button" onClick={() => onMove({ type: "cover" })}>Turn cards back</S.Button>}
      </>}
      {run.config.game === "hangman" && <>
        <p><strong>Clue</strong> · {run.clue}</p>
        <p aria-label={`Word: ${run.word?.replaceAll("_", "blank")}`} style={{ fontSize: "1.8rem", letterSpacing: ".12em" }}>{run.word}</p>
        <p>{run.remaining} incorrect guesses remaining.</p>
        <Actions aria-label="Choose a ranked letter">
          {[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(letter => <S.Button type="button" $secondary key={letter}
            disabled={run.guesses?.includes(letter)} aria-label={`Ranked guess ${letter}`}
            onClick={() => onMove({ type: "guess", letter })}>{letter}</S.Button>)}
        </Actions>
      </>}
      {run.config.game === "doku" && <>
        <p>One cat per row, column and region. Cats cannot touch, even diagonally.</p>
        <p>{run.lives} hearts remaining · {run.cats?.length} of 5 cats found.</p>
        <Actions>
          <S.Button type="button" $secondary={mode !== "mark"} aria-pressed={mode === "mark"} onClick={() => setMode("mark")}>Mark X</S.Button>
          <S.Button type="button" $secondary={mode !== "cat"} aria-pressed={mode === "cat"} onClick={() => setMode("cat")}>Place cat</S.Button>
        </Actions>
        <CatBoard aria-label="Ranked cat puzzle">
          {run.regions?.map((region, index) => {
            const cat = run.cats?.includes(index), marked = run.marks?.includes(index);
            return <button type="button" key={index}
              style={{ background: territories[region].colour,
                borderRight: index % 5 < 4 && run.regions?.[index + 1] !== region ? "2px solid #66565e" : undefined,
                borderBottom: index < 20 && run.regions?.[index + 5] !== region ? "2px solid #66565e" : undefined }}
              aria-label={`Ranked row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}, region ${region + 1}, ${cat ? "cat" : marked ? "X" : "empty"}`}
              disabled={cat} onClick={() => onMove({ type: mode, cell: index })}>
              <small aria-hidden="true">{region + 1}</small>
              {cat ? <Cat aria-hidden="true" /> : marked ? <X aria-hidden="true" /> : null}
            </button>;
          })}
        </CatBoard>
      </>}
      {run.config.game === "crossword" && <>
        <p>Across: 1. {run.clues?.[0]} (3 letters) · 3. {run.clues?.[2]} (3 letters)</p>
        <p>Down: 2. {run.clues?.[1]} (3 letters)</p>
        <Board $columns={5} aria-label="Ranked crossword">
          {run.cells?.map((active, index) => !active ? <div key={index} className="blocked" aria-hidden="true" /> :
            <div key={index}>
              {[0, 2, 12].includes(index) && <small aria-hidden="true">{index === 0 ? 1 : index === 2 ? 2 : 3}</small>}
              <input aria-label={`Ranked crossword row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}`}
                aria-invalid={run.incorrect?.includes(index) || undefined}
                value={answers[index]} maxLength={1} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                onChange={event => {
                  const value = event.target.value.replace(/[^a-z]/gi, "").toUpperCase();
                  setAnswers(current => current.map((entry, cell) => cell === index ? value : entry));
                }} />
            </div>)}
        </Board>
        <S.Button type="button" onClick={() => onMove({ type: "solve", answers })}>Check ranked crossword</S.Button>
      </>}
    </fieldset>
    <Feedback role="status">{run.message}{run.lost ? " This round has ended." : ""}</Feedback>
  </section>;
}
