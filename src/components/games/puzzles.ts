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

export const sudokuSolution = "1234341221434321";
export const sudokuPuzzles = [
  "1004040220030320",
  "0230301001404001",
  "1030001221000301",
];

export function validSudoku(values: string[]) {
  if (values.length !== 16 || values.some(value => !/^[1-4]$/.test(value))) return false;
  const distinct = (indexes: number[]) => new Set(indexes.map(index => values[index])).size === 4;
  for (let n = 0; n < 4; n++) {
    if (!distinct([0, 1, 2, 3].map(column => n * 4 + column))) return false;
    if (!distinct([0, 1, 2, 3].map(row => row * 4 + n))) return false;
    const start = Math.floor(n / 2) * 8 + (n % 2) * 2;
    if (!distinct([start, start + 1, start + 4, start + 5])) return false;
  }
  return true;
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
