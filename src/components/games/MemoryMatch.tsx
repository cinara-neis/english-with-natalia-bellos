import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import styled from "styled-components";
import * as S from "../../styles";
import { Actions, Feedback, GamePanel } from "./styles";
import { memoryCategories, memoryDeck } from "./memoryWords";

const Setup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .5rem 1.25rem;
  > div { flex: 1 1 12rem; }
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(.35rem, 1.5vw, .75rem);
  max-width: 44rem;
  margin-block: 1.25rem;
  @media (min-width: 52rem) { grid-template-columns: repeat(6, minmax(0, 1fr)); }
`;

const Card = styled.button<{ $open: boolean; $matched: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-width: 0;
  min-height: 5.5rem;
  aspect-ratio: 1;
  padding: .4rem;
  border: 2px solid ${p => p.$matched ? "#42654c" : p.$open ? "#8d647d" : "#cab6c4"};
  border-radius: .5rem !important;
  color: ${p => p.$open ? "#3b2e35" : "#fffdf8"};
  background: ${p => p.$matched ? "#e4ecdf" : p.$open ? "#fffdf8" : "#71435c"};
  font-size: clamp(.7rem, 2.3vw, 1rem);
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
  .picture { font-size: clamp(1.8rem, 4.5vw, 3rem); line-height: 1.2; }
  .swatch { width: 65%; aspect-ratio: 1; border-radius: 50%; border: 1px solid #61535a; }
  small { margin-top: .3rem; font-size: .65rem; color: #33533b; }
  @media (prefers-reduced-motion: no-preference) {
    transition: background-color .15s ease, transform .15s ease;
    &:hover { transform: translateY(-2px); }
  }
  @media (max-width: 23rem) { min-height: 4.5rem; }
`;

export default function MemoryMatch() {
  const [category, setCategory] = useState("animals");
  const [size, setSize] = useState(12);
  const [cards, setCards] = useState(() => memoryDeck("animals", 12));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState("Turn over two cards. Match the English word to its picture.");
  const won = matched.length === size / 2;
  const waiting = flipped.length === 2;

  useEffect(() => {
    if (flipped.length !== 2) return;
    const timer = window.setTimeout(() => {
      setFlipped([]);
      setMessage("Try another pair. Remember the cards you have seen.");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [flipped]);

  function restart(nextCategory = category, nextSize = size) {
    setCategory(nextCategory); setSize(nextSize);
    setCards(memoryDeck(nextCategory, nextSize));
    setFlipped([]); setMatched([]); setMoves(0);
    setMessage("New cards. Match each English word to its picture.");
  }

  function turn(id: string) {
    const card = cards.find(value => value.id === id)!;
    if (waiting || won || flipped.includes(id) || matched.includes(card.word)) return;
    if (!flipped.length) {
      setFlipped([id]);
      setMessage(card.side === "word" ? `Find the picture for “${card.word}”.` : "Now find the matching English word.");
      return;
    }
    const first = cards.find(value => value.id === flipped[0])!;
    setMoves(value => value + 1);
    if (first.word === card.word && first.side !== card.side) {
      setMatched(current => [...current, card.word]);
      setFlipped([]);
      setMessage(matched.length + 1 === size / 2 ?
        `Well done! You matched all ${size / 2} pairs in ${moves + 1} ${moves + 1 === 1 ? "turn" : "turns"}.` :
        `A match! ${card.word}. Say the word out loud.`);
    } else {
      setFlipped(current => [...current, id]);
      setMessage("Different meanings. Take a moment to remember these cards.");
    }
  }

  return <GamePanel aria-labelledby="memory-title">
    <h2 id="memory-title">Word & picture memory</h2>
    <p>Find each English word and its matching picture. Choose a topic and the number of cards. Changing either starts a new game.</p>
    <Setup>
      <div>
        <label htmlFor="memory-category">Vocabulary topic</label>
        <select id="memory-category" value={category} onChange={event => restart(event.target.value)}>
          {Object.entries(memoryCategories).map(([id, value]) => <option key={id} value={id}>{value.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="memory-size">Number of cards</label>
        <select id="memory-size" value={size} onChange={event => restart(category, Number(event.target.value))}>
          <option value={12}>12 cards · 6 pairs</option>
          <option value={16}>16 cards · 8 pairs</option>
          <option value={24}>24 cards · 12 pairs</option>
        </select>
      </div>
    </Setup>
    <p style={{ marginTop: "1rem" }}>{matched.length} of {size / 2} pairs found · {moves} {moves === 1 ? "turn" : "turns"}</p>
    <Cards aria-label={`${memoryCategories[category].label} memory cards`}>
      {cards.map((card, index) => {
        const isMatched = matched.includes(card.word);
        const open = isMatched || flipped.includes(card.id);
        return <Card type="button" key={card.id} $open={open} $matched={isMatched}
          aria-disabled={isMatched || waiting || won}
          aria-label={open ? `${isMatched ? "Matched: " : ""}${card.side === "word" ? "Word" : "Picture"}: ${card.word}` : `Turn card ${index + 1}`}
          onClick={() => turn(card.id)}>
          {!open ? <Sparkles size={22} aria-hidden="true" /> :
            card.side === "word" ? <span>{card.word}</span> :
              card.colour ? <span className="swatch" aria-hidden="true" style={{ background: card.colour }} /> :
                <span className="picture" aria-hidden="true">{card.picture}</span>}
          {isMatched && <small aria-hidden="true">Matched</small>}
        </Card>;
      })}
    </Cards>
    <Feedback role="status">{message}</Feedback>
    <Actions><S.Button type="button" $secondary onClick={() => restart()}>Shuffle & restart</S.Button></Actions>
  </GamePanel>;
}
