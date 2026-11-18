// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WalkingCat from "../src/components/WalkingCat";
import { Global } from "../src/styles";

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("opens the companion, saves the coat and restores focus when dismissed", async () => {
  const user = userEvent.setup();
  const first = render(<><Global /><WalkingCat /></>);
  const trigger = screen.getByRole("button", { name: "Open cat companion" });
  await user.click(trigger);
  expect(screen.getByRole("dialog", { name: "Your study cat" })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your study cat" }));
  await user.click(screen.getByRole("button", { name: "Ginger", pressed: false }));
  expect(localStorage.getItem("natalia-cat-colour")).toBe("ginger");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  first.unmount();
  render(<><Global /><WalkingCat /></>);
  await user.click(screen.getByRole("button", { name: "Open cat companion" }));
  expect(screen.getByRole("button", { name: "Ginger", pressed: true })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Pause walking cat" }));
  expect(screen.getByRole("button", { name: "Resume walking cat" })).toBeTruthy();
}, 30000);

it("replaces feeding with play, clears reaction timers and closes on navigation", () => {
  vi.useFakeTimers();
  render(<><Global /><WalkingCat /></>);
  fireEvent.click(screen.getByRole("button", { name: "Open cat companion" }));
  fireEvent.click(screen.getByRole("button", { name: "Feed the cat" }));
  expect(screen.getByRole("status").textContent).toContain("The cat is eating.");
  expect(screen.getAllByText("Yum!")).toHaveLength(2);
  act(() => { vi.advanceTimersByTime(2000); });
  fireEvent.click(screen.getByRole("button", { name: "Play with the cat" }));
  expect(screen.getByRole("status").textContent).toContain("The cat is playing with a ball.");
  expect(screen.queryByText("Yum!")).toBeNull();
  act(() => { vi.advanceTimersByTime(2500); });
  expect(screen.getAllByText("Meow!")).toHaveLength(2);
  act(() => { vi.advanceTimersByTime(1800); });
  expect(screen.queryByText("Meow!")).toBeNull();
  fireEvent(window, new Event("hashchange"));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("allows colour changes when browser storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw Error("Storage blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("Storage blocked"); });
  render(<><Global /><WalkingCat /></>);
  fireEvent.click(screen.getByRole("button", { name: "Open cat companion" }));
  expect(screen.getByRole("button", { name: "Tuxedo", pressed: true })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ginger", pressed: false }));
  expect(screen.getByRole("button", { name: "Ginger", pressed: true })).toBeTruthy();
});
