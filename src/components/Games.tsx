import { useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Cat, Grid2X2, SpellCheck, Copy } from "lucide-react";
import styled from "styled-components";
import * as S from "../styles";
import Hangman from "./games/Hangman";
import MeowDoku from "./games/MeowDoku";
import Crossword from "./games/Crossword";
import MemoryMatch from "./games/MemoryMatch";

const games = [
  { id: "memory", title: "Word & picture memory", description: "Match words and pictures. Animals, fruits, colours and professions.", icon: Copy },
  { id: "hangman", title: "Hangman", description: "Follow the clue and discover the English word.", icon: SpellCheck },
  { id: "doku", title: "Meow-doku", description: "Find each cat’s home with coloured regions, X marks and three hearts.", icon: Cat },
  { id: "crossword", title: "English crossword", description: "Connect words about art, tea and everyday life.", icon: Grid2X2 },
] as const;
type Game = typeof games[number]["id"];

const Choices = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: 1rem;
  margin-block: 2rem;
`;
const Choice = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 1.5rem;
  border: 1px solid #d1c3b3;
  border-top: 3px solid #75425d;
  border-radius: 5px;
  background: #fffdf8;
  color: #382d30;
  font: inherit;
  strong { font: 600 1.8rem "Cormorant Garamond", Georgia, serif; margin-block: 1rem .5rem; }
  span { font-size: .9rem; line-height: 1.6; }
  > svg:last-child { align-self: flex-end; margin-top: 1rem; }
  &:hover { background: #eee8ed; border-color: #75425d; }
`;

export default function Games() {
  const [game, setGame] = useState<Game>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  return <>
    <S.Eyebrow>A LITTLE PLAY, A LITTLE PRACTICE</S.Eyebrow>
    <h1 ref={headingRef} tabIndex={-1}>The playroom</h1>
    {!game ? <>
      <p>Take a tea break. Try a word, solve a puzzle and learn something along the way.</p>
      <Choices>
        {games.map(({ id, title, description, icon: Icon }) => <Choice key={id} type="button"
          onClick={() => { setGame(id); requestAnimationFrame(() => headingRef.current?.focus()); }}>
          <Icon size={27} aria-hidden="true" />
          <strong>{title}</strong><span>{description}</span>
          <ArrowUpRight size={19} aria-hidden="true" />
        </Choice>)}
      </Choices>
    </> : (
      <S.Button type="button" $secondary onClick={() => { setGame(undefined); headingRef.current?.focus(); }}>
        <ArrowLeft size={16} aria-hidden="true" /> All games
      </S.Button>
    )}
    <div hidden={game !== "memory"}><MemoryMatch /></div>
    <div hidden={game !== "hangman"}><Hangman /></div>
    <div hidden={game !== "doku"}><MeowDoku /></div>
    <div hidden={game !== "crossword"}><Crossword /></div>
  </>;
}
