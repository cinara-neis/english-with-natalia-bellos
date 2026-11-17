import { useState } from "react";
import { Cat, Heart } from "lucide-react";
import styled from "styled-components";
import * as S from "../../styles";
import { vocabulary } from "./puzzles";
import { Actions, Feedback, GamePanel } from "./styles";

const Letters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
  max-width: 32rem;
  button { width: 44px; min-height: 44px; padding: .3rem; }
  button:disabled { cursor: default; opacity: .55; }
`;
const Word = styled.p`
  font: 600 clamp(1.5rem, 5vw, 2rem) "DM Sans", sans-serif;
  letter-spacing: .15em;
  overflow-wrap: anywhere;
`;

export default function Hangman() {
  const [round, setRound] = useState(0);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [letter, setLetter] = useState("");
  const [notice, setNotice] = useState("");
  const puzzle = vocabulary[round % vocabulary.length];
  const wrong = guesses.filter(value => !puzzle.word.includes(value));
  const won = [...puzzle.word].every(value => guesses.includes(value));
  const lost = wrong.length >= 6;
  const finished = won || lost;
  const displayed = [...puzzle.word].map(value => guesses.includes(value) || lost ? value : "_");
  function guess(value: string) {
    const next = value.toUpperCase();
    if (!/^[A-Z]$/.test(next) || finished) return;
    if (guesses.includes(next)) { setNotice(`You already tried ${next}.`); return; }
    setGuesses(current => [...current, next]);
    setNotice(puzzle.word.includes(next) ? `${next} is in the word.` : `${next} is not in the word.`);
  }
  return <GamePanel aria-labelledby="hangman-title">
    <h2 id="hangman-title">Hangman</h2>
    <p>Guess the English word. You have six incorrect guesses. Use the clue, type a letter, or choose one below.</p>
    <p><strong>Clue</strong> · {puzzle.clue}</p>
    <Cat size={40} aria-hidden="true" />
    <Word aria-label={`Word: ${displayed.map(value => value === "_" ? "blank" : value).join(", ")}`}>{displayed.join(" ")}</Word>
    <p>{6 - wrong.length} incorrect guesses remaining <span aria-hidden="true">{Array.from({ length: 6 - wrong.length }, (_, index) => <Heart key={index} size={14} />)}</span></p>
    <form onSubmit={event => { event.preventDefault(); guess(letter); setLetter(""); }}>
      <label htmlFor="hangman-letter">Your letter</label>
      <Actions>
        <input id="hangman-letter" value={letter} maxLength={1} autoComplete="off" autoCapitalize="characters"
          disabled={finished} style={{ width: "5rem" }}
          onChange={event => setLetter(event.target.value.replace(/[^a-z]/gi, "").toUpperCase())} />
        <S.Button disabled={finished || !letter}>Guess letter</S.Button>
      </Actions>
    </form>
    <Letters aria-label="Choose a letter">
      {[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(value => (
        <S.Button type="button" key={value} $secondary
          disabled={finished || guesses.includes(value)} aria-label={`Guess ${value}`}
          onClick={() => guess(value)}>{value}</S.Button>
      ))}
    </Letters>
    <Feedback role="status">
      {won ? `You found it! ${puzzle.word}. ${puzzle.example}` :
        lost ? `The word was ${puzzle.word}. ${puzzle.example}` : notice || "Ready when you are."}
    </Feedback>
    <S.Button type="button" $secondary onClick={() => {
      setRound(value => value + 1); setGuesses([]); setLetter(""); setNotice("");
    }}>Next word</S.Button>
  </GamePanel>;
}
