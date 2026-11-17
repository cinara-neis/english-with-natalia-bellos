import catalog from "../../../shared/gameCatalog.json";
export const { vocabulary, catPuzzles, crosswords } = catalog;

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

export function crosswordCells(puzzle: typeof crosswords[number]) {
  const cells = Array<string>(15).fill("");
  [...puzzle.across].forEach((letter, index) => { cells[index] = letter; });
  [...puzzle.down].forEach((letter, index) => { cells[index * 5 + 2] = letter; });
  [...puzzle.bottom].forEach((letter, index) => { cells[12 + index] = letter; });
  return cells;
}
