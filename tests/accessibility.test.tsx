// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import App from "../src/App";
import AccessibilityControls from "../src/components/AccessibilityControls";
import manifest from "../public/content/manifest.json";
vi.mock("../src/lib", () => ({
  localEditing: false,
  base: "/",
  api: "https://admin.test",
  repoUrl: "https://github.com/teacher/blog",
  branch: "main",
  loadPublic: async () => structuredClone(manifest),
  login: async () => "test-session",
  adminRequest: async () => ({
    head: "abc",
    manifest: structuredClone(manifest),
  }),
}));
beforeEach(() => {
  window.history.replaceState({}, "", "/");
  localStorage.clear();
  document.documentElement.lang = "en";
  document.documentElement.removeAttribute("data-large-text");
  document.documentElement.removeAttribute("data-high-contrast");
  // jsdom has no native dialog interaction/layout; verify our use of its API.
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => null,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
async function start() {
  const result = render(<App />);
  await screen.findByRole("heading", { name: /Small steps/ });
  return result;
}
async function audit(container: HTMLElement) {
  // A real browser is still needed for contrast, reflow and native modal focus.
  const result = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.html),
    })),
  ).toEqual([]);
}
describe("English interface and accessibility", () => {
  it("has named navigation, a keyboard skip link and named material actions", async () => {
    const user = userEvent.setup();
    const { container } = await start();
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "OUR STUDENTS" }),
    ).toBeTruthy();
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: "Skip to main content" }),
    );
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("main"));
    expect(
      screen.getByRole("button", { name: "Preview A little about me" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Download Everyday words/ }),
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(
      /Visualizar|Baixar|professora|alunos|Materiais/,
    );
    await audit(container);
  });
  it("announces student selection and filters with keyboard input", async () => {
    const user = userEvent.setup();
    await start();
    const student = screen.getByRole("button", { name: "Ana Beatriz" });
    student.focus();
    await user.keyboard("{Enter}");
    expect(student.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("2 materials found for Ana Beatriz.")).toBeTruthy();
    await user.type(
      screen.getByRole("textbox", { name: "Search materials" }),
      "not available",
    );
    expect(screen.getByText("0 materials found for Ana Beatriz.")).toBeTruthy();
    expect(
      screen.getByText("No materials found. Try another search."),
    ).toBeTruthy();
  });
  it("persists display preferences and resets their pressed states", async () => {
    const user = userEvent.setup();
    const result = render(<AccessibilityControls />);
    await user.click(screen.getByRole("button", { name: "Larger text" }));
    await user.click(screen.getByRole("button", { name: "High contrast" }));
    expect(document.documentElement.dataset.largeText).toBe("true");
    expect(document.documentElement.dataset.highContrast).toBe("true");
    result.unmount();
    render(<AccessibilityControls />);
    expect(
      screen
        .getByRole("button", { name: "Larger text" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await user.click(screen.getByRole("button", { name: "Reset display" }));
    expect(document.documentElement.dataset.largeText).toBe("false");
    expect(document.documentElement.dataset.highContrast).toBe("false");
  });
  it("opens a named native modal and returns focus when it is cancelled", async () => {
    const user = userEvent.setup();
    const { container } = await start();
    const trigger = screen.getByRole("button", {
      name: "Preview A little about me",
    });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "A little about me" });
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "A little about me", level: 2 }),
    );
    await audit(container);
    fireEvent(
      dialog,
      new Event("cancel", { cancelable: true, bubbles: false }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
  it("moves focus after navigation and gives admin forms accessible labels", async () => {
    const user = userEvent.setup();
    const { container } = await start();
    await user.click(screen.getByRole("link", { name: "Teacher’s desk" }));
    await screen.findByRole("heading", { name: "Hello, teacher." });
    expect(document.activeElement).toBe(screen.getByRole("main"));
    await user.click(
      screen.getByRole("button", { name: "Sign in with GitHub" }),
    );
    const studentSelect = await screen.findByRole("combobox", {
      name: "Student to manage",
    });
    await user.selectOptions(studentSelect, "matheus");
    expect(screen.getByRole("textbox", { name: "Blog name" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Blog management" })).toBeTruthy();
    expect(
      screen
        .getByLabelText("PDF, Word or image • up to 2 MiB")
        .getAttribute("aria-describedby"),
    ).toBe("upload-help");
    const image = new File(["image"], "photo.png", { type: "image/png" });
    await user.upload(
      screen.getByLabelText("PDF, Word or image • up to 2 MiB"),
      image,
    );
    expect(
      screen.getByRole("textbox", { name: "Image description (required)" }),
    ).toBeTruthy();
    await audit(container);
  });
});
