// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Games from "../src/components/Games";
import { crosswordCells, crosswords, catPuzzles, validCatPlacement } from "../src/components/games/puzzles";

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

it("marks X without losing lives, charges mistakes and completes the cat puzzle", async () => {
  const user = userEvent.setup();
  render(<Games />);
  await user.click(screen.getByRole("button", { name: /Meow-doku/ }));
  await user.click(screen.getByRole("button", { name: "Row 1, column 1, Mint region, empty" }));
  expect(screen.getByText("3 hearts remaining")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Row 1, column 1, Mint region, X" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Place cat" }));
  await user.click(screen.getByRole("button", { name: "Row 1, column 1, Mint region, X" }));
  expect(screen.getByText("2 hearts remaining")).toBeTruthy();
  for (const index of catPuzzles[0].solution) {
    const row = Math.floor(index / 5) + 1;
    const column = index % 5 + 1;
    await user.click(screen.getByRole("button", { name: new RegExp(`^Row ${row}, column ${column},.*empty$`) }));
  }
  expect(screen.getByRole("status").textContent).toContain("Purr-fect!");
  await user.click(screen.getByRole("button", { name: "Next puzzle" }));
  expect(screen.getByText("3 hearts remaining")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Place cat" }));
  for (const index of [0, 2, 3]) {
    await user.click(screen.getByRole("button", { name: new RegExp(`^Row 1, column ${index + 1},.*empty$`) }));
  }
  expect(screen.getByRole("status").textContent).toContain("No hearts left");
  await user.click(screen.getByRole("button", { name: "Restart Meow-doku" }));
  expect(screen.getByText("3 hearts remaining")).toBeTruthy();
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

it("ships uniquely solvable cat boards and consistently intersecting crosswords", () => {
  for (const puzzle of catPuzzles) {
    expect(puzzle.regions).toHaveLength(25);
    expect(validCatPlacement(puzzle.regions, puzzle.solution)).toBe(true);
    let solutions = 0;
    const search = (row: number, cats: number[]) => {
      if (row === 5) {
        if (validCatPlacement(puzzle.regions, cats)) solutions++;
        return;
      }
      for (let column = 0; column < 5; column++) search(row + 1, [...cats, row * 5 + column]);
    };
    search(0, []);
    expect(solutions).toBe(1);
  }
  expect(validCatPlacement(catPuzzles[0].regions, [0, 6, 12, 18, 24])).toBe(false);
  for (const puzzle of crosswords) {
    expect(puzzle.across[2]).toBe(puzzle.down[0]);
    expect(puzzle.down[2]).toBe(puzzle.bottom[0]);
  }
});
