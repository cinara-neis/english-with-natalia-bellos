// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeacherPortrait from "../src/components/TeacherPortrait";
import { btsPhotos } from "../shared/btsMedia";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("opens the microphone playlist, loads only the chosen video and restores focus on close", async () => {
  const user = userEvent.setup();
  const { container } = render(<TeacherPortrait stickers={["music"]} />);
  const microphone = screen.getByRole("button", { name: "K-pop microphone" });
  await user.click(microphone);
  const dialog = screen.getByRole("dialog", { name: "BTS listening corner" });
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "BTS listening corner" }));
  expect(container.querySelector("iframe")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Dynamite" }));
  expect(screen.getByTitle("BTS — Dynamite").getAttribute("src")).toContain("/gdZLi9oWNZg");
  await user.click(screen.getByRole("button", { name: "Butter" }));
  expect(screen.queryByTitle("BTS — Dynamite")).toBeNull();
  expect(screen.getByTitle("BTS — Butter").getAttribute("src")).toContain("/WMweEpGlu_U");
  expect(screen.getByRole("link", { name: "Watch Butter on YouTube (opens in a new tab)" }).getAttribute("href")).toBe("https://www.youtube.com/watch?v=WMweEpGlu_U");
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(container.querySelector("iframe")).toBeNull();
  expect(document.activeElement).toBe(microphone);
}, 30000);

it("opens real photo stickers with attribution and a source link", async () => {
  const user = userEvent.setup();
  render(<TeacherPortrait stickers={["btsCarpet", "btsStage", "btsTogether"]} />);
  await user.click(screen.getByRole("button", { name: "BTS red carpet photo" }));
  expect(screen.getByRole("dialog", { name: "BTS on the red carpet" })).toBeTruthy();
  expect(screen.getByRole("img", { name: btsPhotos.carpet.alt }).getAttribute("src")).toContain("images/bts/red-carpet.jpg");
  expect(screen.getByRole("link", { name: "CC BY 3.0 (opens in a new tab)" }).getAttribute("href")).toBe(btsPhotos.carpet.licenceUrl);
  await user.click(screen.getByRole("button", { name: "Close sticker window" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  await user.click(screen.getByRole("button", { name: "BTS concert photo" }));
  expect(screen.getByRole("img", { name: btsPhotos.stage.alt })).toBeTruthy();
  fireEvent(window, new Event("hashchange"));
  expect(screen.queryByRole("dialog")).toBeNull();
}, 30000);
