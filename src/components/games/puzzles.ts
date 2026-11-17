export const vocabulary = [
  { word: "TEA", clue: "A warm drink made by putting leaves in hot water.", example: "Would you like a cup of tea?" },
  { word: "CAT", clue: "A small animal that purrs and says meow.", example: "The cat is sleeping on the books." },
  { word: "PAINT", clue: "To make a picture using colours and a brush.", example: "I like to paint flowers." },
  { word: "HISTORY", clue: "The study of what happened in the past.", example: "History helps us understand the present." },
  { word: "MUSIC", clue: "Sounds arranged into songs or melodies.", example: "We practise English by listening to music." },
  { word: "BOOK", clue: "An object with pages that you read.", example: "This book tells a wonderful story." },
  { word: "PURPLE", clue: "A colour made by mixing red and blue.", example: "She wears a purple scarf." },
  { word: "MUSEUM", clue: "A place where you can see art and historical objects.", example: "We visited the museum yesterday." },
  { word: "GARDEN", clue: "A place where people grow flowers and plants.", example: "The cat is exploring the garden." },
  { word: "STORY", clue: "An account of real or imagined events.", example: "Tell me your favourite story." },
];

export const catPuzzles = [
  {
    regions: [1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 2, 0, 0, 1, 1, 2, 2, 3, 1, 4, 2, 2, 3],
    solution: [3, 5, 12, 19, 21],
  },
  {
    regions: [0, 0, 1, 1, 1, 0, 0, 2, 1, 1, 3, 3, 2, 1, 1, 3, 4, 4, 4, 1, 3, 3, 4, 4, 1],
    solution: [1, 9, 12, 15, 23],
  },
  {
    regions: [1, 1, 0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 2, 2, 2, 3, 3, 3, 3, 2, 3, 3, 3, 4, 2],
    solution: [2, 5, 14, 16, 23],
  },
];

export function validCatPlacement(regions: number[], cats: number[]) {
  if (regions.length !== 25 || cats.length !== 5 || new Set(cats).size !== 5 ||
      cats.some(index => !Number.isInteger(index) || index < 0 || index >= 25)) return false;
  if (new Set(cats.map(index => Math.floor(index / 5))).size !== 5 ||
      new Set(cats.map(index => index % 5)).size !== 5 ||
      new Set(cats.map(index => regions[index])).size !== 5) return false;
  return cats.every((cell, index) => cats.slice(index + 1).every(other =>
    Math.abs(Math.floor(cell / 5) - Math.floor(other / 5)) > 1 ||
    Math.abs(cell % 5 - other % 5) > 1));
}

export const crosswords = [
  { across: "CAT", down: "TEA", bottom: "ART", clues: ["An animal that says meow.", "A drink made with leaves and hot water.", "Paintings, drawings and sculpture."] },
  { across: "SUN", down: "NAP", bottom: "PEN", clues: ["The star that gives Earth light.", "A short sleep, often enjoyed by cats.", "You write with this using ink."] },
  { across: "PEN", down: "NUT", bottom: "TEA", clues: ["An object for writing in ink.", "An almond or a walnut, for example.", "A warm drink made with leaves."] },
];

export function crosswordCells(puzzle: typeof crosswords[number]) {
  const cells = Array<string>(15).fill("");
  [...puzzle.across].forEach((letter, index) => { cells[index] = letter; });
  [...puzzle.down].forEach((letter, index) => { cells[index * 5 + 2] = letter; });
  [...puzzle.bottom].forEach((letter, index) => { cells[12 + index] = letter; });
  return cells;
}
