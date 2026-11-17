// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Rankings from "../src/components/games/Rankings";
import { createRankings } from "../server/rankings.mjs";
import catalog from "../shared/gameCatalog.json";

let service: ReturnType<typeof createRankings>;
let stored: { visitors: Record<string, unknown>; profiles: Record<string, unknown>; results: Record<string, unknown> };

vi.mock("../src/community", () => ({
  communityBase: "https://community.test/__community",
  communityRequest: async (route: string, body: unknown, session: string) => {
    const result = await service.handle(route.replace("/ranking", ""), body, {
      headers: { authorization: "Bearer " + session }, socket: { remoteAddress: "test-client" },
    });
    if (result.status >= 400) throw Object.assign(Error(result.data.error), { status: result.status });
    return result.data;
  },
}));

beforeEach(() => {
  stored = { visitors: {}, profiles: {}, results: {} };
  service = createRankings({
    storage: { read: async () => stored, update: async (change: (current: typeof stored) => typeof stored) => {
      stored = change(stored); return stored;
    } },
    authenticateStudent: async (req: { headers: { authorization: string } }) =>
      req.headers.authorization === "Bearer student-token" ? { id: "learner" } : null,
  });
});
afterEach(() => { cleanup(); service.close(); vi.restoreAllMocks(); });

it("joins with a student nickname and records a server-checked round in the student board", async () => {
  const user = userEvent.setup();
  render(<Rankings studentSession="student-token" />);
  await user.click(await screen.findByRole("button", { name: "Use my student account" }));
  await user.type(screen.getByRole("textbox", { name: "Choose your public nickname" }), "Blue Cat");
  await user.click(screen.getByRole("checkbox", { name: /Show my nickname/ }));
  await user.click(screen.getByRole("button", { name: "Join with this nickname" }));
  await screen.findByRole("button", { name: "Start ranked round" });
  await user.selectOptions(screen.getByRole("combobox", { name: "Game" }), "hangman");
  await user.click(screen.getByRole("button", { name: "Start ranked round" }));
  await screen.findByRole("button", { name: "Ranked guess A" });
  const current = (await service.handle("/current", {}, {
    headers: { authorization: "Bearer student-token" }, socket: { remoteAddress: "test-client" },
  })).data;
  const word = catalog.vocabulary.find(item => item.clue === current.clue)!.word;
  for (const letter of new Set(word)) await user.click(screen.getByRole("button", { name: "Ranked guess " + letter }));
  await screen.findByText("Well done! Your win was saved to the ranking.");
  expect(await screen.findByRole("row", { name: /^1 Blue Cat 1 0 / })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Hide my ranking" }));
  await waitFor(() => expect(screen.queryByRole("row", { name: /^1 Blue Cat 1 0 / })).toBeNull());
}, 60000);

it("creates a separate visitor account and requests a ranked memory round with its selected topic and size", async () => {
  const user = userEvent.setup();
  render(<Rankings />);
  await user.click(await screen.findByText("Visitor player sign-in", { selector: "summary" }));
  await user.click(screen.getByRole("button", { name: "Create visitor account" }));
  await user.type(screen.getByRole("textbox", { name: "Player username" }), "guest-one");
  await user.type(screen.getByLabelText("Player password"), "a-private-visitor-password");
  await user.type(screen.getByRole("textbox", { name: "Public nickname" }), "Purple Tea");
  await user.click(screen.getByRole("checkbox", { name: /public visitor ranking/ }));
  await user.click(screen.getByRole("button", { name: "Create player account" }));
  await screen.findByRole("button", { name: "Start ranked round" });
  expect((screen.getByRole("combobox", { name: "Ranking group" }) as HTMLSelectElement).value).toBe("visitors");
  await user.selectOptions(screen.getByRole("combobox", { name: "Memory topic" }), "fruits");
  await user.selectOptions(screen.getByRole("combobox", { name: "Ranked cards" }), "24");
  await user.click(screen.getByRole("button", { name: "Start ranked round" }));
  expect(await screen.findAllByRole("button", { name: /^Turn ranked card/ })).toHaveLength(24);
  expect(Object.keys(stored.visitors)).toEqual(["guest-one"]);
  expect(Object.values(stored.profiles).every((profile: unknown) => (profile as { cohort: string }).cohort === "visitors")).toBe(true);
}, 60000);

it("shows a real unavailable state when online ranking storage is missing", async () => {
  service.close();
  service = createRankings({ authenticateStudent: async () => null });
  render(<Rankings />);
  expect(await screen.findByText(/Online rankings are not available/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start ranked round" })).toBeNull();
});

it("clears the previous group’s rows if loading another group fails", async () => {
  service.close();
  let unavailable = false;
  stored = {
    visitors: {},
    profiles: { "student:one": { cohort: "students", nickname: "Quiet Learner", enabled: true } },
    results: { "student:one": { "memory-animals-12": { wins: 2, best: 8, milliseconds: 10000 } } },
  };
  service = createRankings({
    storage: { read: async () => { if (unavailable) throw Error("Connection lost"); return stored; } },
    authenticateStudent: async () => null,
  });
  const user = userEvent.setup();
  render(<Rankings />);
  expect(await screen.findByRole("row", { name: "1 Quiet Learner 2 8 10.00 s" })).toBeTruthy();
  unavailable = true;
  await user.selectOptions(screen.getByRole("combobox", { name: "Ranking group" }), "visitors");
  await screen.findByRole("alert");
  expect(screen.queryByRole("row", { name: /Quiet Learner/ })).toBeNull();
}, 30000);
