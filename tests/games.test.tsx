// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Games from "../src/components/Games";
import { crosswordCells, crosswords, sudokuPuzzles, sudokuSolution, validSudoku } from "../src/components/games/puzzles";

afterEach(cleanup);

it("opens Hangman, checks letters, ends a round and preserves it when switching games", async () => {
  const user = userEvent.setup();
  render(<Games />);
  await user.click(screen.getByRole("button", { name: /Hangman/ }));
  for (const letter of ["T", "E", "A"]) {
    await user.click(screen.getByRole("button", { name: "Guess " + letter }));
  }
  expect(screen.getByRole("status").textContent).toContain("You found it! TEA");
  expect((screen.getByRole("button", { name: "Guess Z" }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "All games" }));
  await user.click(screen.getByRole("button", { name: /Hangman/ }));
  expect(screen.getByRole("status").textContent).toContain("You found it! TEA");
  await user.click(screen.getByRole("button", { name: "Next word" }));
  for (const letter of ["B", "D", "E", "F", "G", "H"]) {
    await user.click(screen.getByRole("button", { name: "Guess " + letter }));
  }
  expect(screen.getByRole("status").textContent).toContain("The word was CAT");
}, 30000);

it("checks Sudoku boxes and keeps given cells read-only", async () => {
  const user = userEvent.setup();
  render(<Games />);
  await user.click(screen.getByRole("button", { name: /Meow-doku/ }));
  expect((screen.getByRole("textbox", { name: "Row 1, column 1, given number" }) as HTMLInputElement).readOnly).toBe(true);
  await user.click(screen.getByRole("button", { name: "Check Meow-doku" }));
  expect(screen.getByRole("status").textContent).toContain("still empty");
  const cells = screen.getAllByRole("textbox");
  for (const [index, cell] of cells.entries()) {
    if (!(cell as HTMLInputElement).readOnly) await user.type(cell, sudokuSolution[index]);
  }
  await user.click(screen.getByRole("button", { name: "Check Meow-doku" }));
  expect(screen.getByRole("status").textContent).toContain("Purr-fect");
  await user.click(screen.getByRole("button", { name: "Next puzzle" }));
  expect(screen.getAllByRole("textbox").some(cell => !(cell as HTMLInputElement).value)).toBe(true);
}, 30000);

it("checks a crossword and starts a new puzzle with new clues", async () => {
  const user = userEvent.setup();
  render(<Games />);
  await user.click(screen.getByRole("button", { name: /English crossword/ }));
  await user.click(screen.getByRole("button", { name: "Check crossword" }));
  expect(screen.getAllByRole("textbox").every(cell => cell.getAttribute("aria-invalid") === "true")).toBe(true);
  const answers = crosswordCells(crosswords[0]).filter(Boolean);
  for (const [index, cell] of screen.getAllByRole("textbox").entries()) await user.type(cell, answers[index]);
  await user.click(screen.getByRole("button", { name: "Check crossword" }));
  expect(screen.getByRole("status").textContent).toContain("Brilliant!");
  await user.click(screen.getByRole("button", { name: "Next crossword" }));
  expect(screen.getByRole("button", { name: /The star that gives Earth light/ })).toBeTruthy();
}, 30000);

it("ships solvable Sudoku and consistently intersecting crossword puzzles", () => {
  for (const puzzle of sudokuPuzzles) {
    expect(puzzle).toHaveLength(16);
    for (const [index, value] of [...puzzle].entries()) {
      if (value !== "0") expect(value).toBe(sudokuSolution[index]);
    }
  }
  expect(validSudoku([...sudokuSolution])).toBe(true);
  expect(validSudoku([..."1111222233334444"])).toBe(false);
  // Rows and columns can be valid while a 2 by 2 box is wrong.
  expect(validSudoku([..."1234234134124123"])).toBe(false);
  for (const puzzle of crosswords) {
    expect(puzzle.across[2]).toBe(puzzle.down[0]);
    expect(puzzle.down[2]).toBe(puzzle.bottom[0]);
  }
});
