// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemoryMatch from "../src/components/games/MemoryMatch";
import { memoryCategories, memoryDeck } from "../src/components/games/memoryWords";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("builds one word and one picture for every pair in all topics and board sizes", () => {
  for (const category of Object.keys(memoryCategories)) {
    for (const size of [12, 16, 24]) {
      const cards = memoryDeck(category, size);
      expect(cards).toHaveLength(size);
      expect(new Set(cards.map(card => card.id)).size).toBe(size);
      const words = new Set(cards.map(card => card.word));
      expect(words.size).toBe(size / 2);
      for (const word of words) {
        expect(cards.filter(card => card.word === word).map(card => card.side).sort()).toEqual(["picture", "word"]);
      }
    }
  }
});

it("counts completed turns, hides mismatches, locks matched cards and completes a round", async () => {
  vi.spyOn(Math, "random").mockReturnValue(.999);
  const user = userEvent.setup();
  render(<MemoryMatch />);
  await user.click(screen.getByRole("button", { name: "Turn card 1" }));
  await user.click(screen.getByRole("button", { name: "Turn card 3" }));
  expect(screen.getByText("0 of 6 pairs found · 1 turn")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Turn card 5" }));
  expect(screen.getByRole("button", { name: "Turn card 5" })).toBeTruthy();
  await waitFor(() => expect(screen.getByRole("button", { name: "Turn card 1" })).toBeTruthy(), { timeout: 3000 });
  for (let index = 1; index <= 12; index++) await user.click(screen.getByRole("button", { name: "Turn card " + index }));
  expect(screen.getByRole("status").textContent).toContain("all 6 pairs in 7 turns");
  expect(screen.getByRole("button", { name: "Matched: Word: cat" }).getAttribute("aria-disabled")).toBe("true");
  await user.click(screen.getByRole("button", { name: "Matched: Word: cat" }));
  expect(screen.getByText("6 of 6 pairs found · 7 turns")).toBeTruthy();
}, 30000);

it("resets pending turns on topic and size changes and supports colours and 24 cards", async () => {
  vi.spyOn(Math, "random").mockReturnValue(.999);
  const user = userEvent.setup();
  render(<MemoryMatch />);
  await user.click(screen.getByRole("button", { name: "Turn card 1" }));
  await user.click(screen.getByRole("button", { name: "Turn card 3" }));
  await user.selectOptions(screen.getByRole("combobox", { name: "Vocabulary topic" }), "colours");
  await user.selectOptions(screen.getByRole("combobox", { name: "Number of cards" }), "24");
  expect(screen.getAllByRole("button", { name: /^Turn card/ })).toHaveLength(24);
  await user.click(screen.getByRole("button", { name: "Turn card 1" }));
  await user.click(screen.getByRole("button", { name: "Turn card 2" }));
  expect(screen.getByRole("status").textContent).toContain("red");
  await new Promise(resolve => setTimeout(resolve, 1600));
  expect(screen.getByRole("status").textContent).toContain("red");
  expect(screen.getByText("1 of 12 pairs found · 1 turn")).toBeTruthy();
  await user.selectOptions(screen.getByRole("combobox", { name: "Vocabulary topic" }), "professions");
  expect(screen.getByText("0 of 12 pairs found · 0 turns")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Turn card 1" }));
  expect(screen.getByRole("button", { name: "Word: doctor" })).toBeTruthy();
}, 30000);
