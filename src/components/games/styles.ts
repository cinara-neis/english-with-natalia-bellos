import styled from "styled-components";

export const GamePanel = styled.section`
  background: #fffdf8;
  border: 1px solid #d9cfc2;
  border-radius: .65rem;
  padding: clamp(1rem, 4vw, 2rem);
  margin-block: 1.25rem;
  h2 { font-size: 2rem; margin-bottom: .75rem; }
  button { border-radius: 4px; }
  p { max-width: 60ch; }
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .6rem;
  align-items: center;
  margin-block: 1rem;
`;

export const Feedback = styled.p`
  min-height: 1.6rem;
  padding: .7rem 1rem;
  background: #eeeae0;
  border-left: 3px solid #71507e;
  margin-block: 1rem;
`;

export const Board = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.$columns}, minmax(0, 1fr));
  width: 100%;
  max-width: 21rem;
  margin-block: 1rem;
  border: 2px solid #705f65;
  background: #fffdf8;
  > div {
    position: relative;
    min-width: 0;
    aspect-ratio: 1;
    border: 1px solid #cdc4bc;
  }
  input {
    width: 100%;
    height: 100%;
    min-height: 44px;
    min-width: 0;
    padding: .5rem 0 0;
    border: 0;
    border-radius: 0;
    text-align: center;
    font-size: clamp(1.15rem, 5vw, 1.6rem);
    font-weight: 600;
    background: transparent;
  }
  input:read-only { background: #e6e8de; color: #334d3c; }
  input:focus { outline: 3px solid #7a4d8c; outline-offset: -3px; }
  input[aria-invalid="true"] { background: #f9e1dc; color: #8c3026; }
  .blocked { background: #705f65; border-color: #705f65; }
  small { position: absolute; top: 0; left: .2rem; color: #463739; font-size: .65rem; }
  @media (max-width: 23rem) { input { min-height: 0; } }
`;
