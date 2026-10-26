// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageContentEditor from "../src/components/PageContentEditor";
import MaterialEditor from "../src/components/MaterialEditor";
import type { Manifest, Material } from "../shared/content";
import manifest from "../public/content/manifest.json";
afterEach(cleanup);
it("edits homepage text as a draft with a preview, without changing contacts or other content", async () => {
  const user = userEvent.setup();
  let latest: Manifest = structuredClone(manifest);
  function Editor() {
    const [draft, setDraft] = useState(latest);
    return <PageContentEditor draft={draft} onChange={next => { latest = next; setDraft(next); }} />;
  }
  render(<Editor />);
  await user.click(screen.getByText("Home texts"));
  const headline = screen.getByLabelText("Main headline");
  await user.clear(headline); await user.type(headline, "Welcome to your English journey");
  expect(latest.pageContent?.homeTitle).toBe("Welcome to your English journey");
  expect(latest.students).toEqual(manifest.students);
  expect(latest.email).toBe(manifest.email);
  await user.click(screen.getByText("Preview homepage text draft"));
  expect(screen.getByRole("heading", { name: "Welcome to your English journey" })).toBeTruthy();
});
it("edits an existing text without changing its identity and cancels unsaved edits", async () => {
  const user = userEvent.setup();
  const material: Material = { id: "lesson-1", kind: "text", title: "Old lesson", text: "Original text", date: "2026-10-26" };
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<MaterialEditor material={material} onSave={onSave} />);
  await user.click(screen.getByRole("button", { name: "Edit material Old lesson" }));
  await user.clear(screen.getByLabelText("Material text"));
  await user.type(screen.getByLabelText("Material text"), "Updated classroom activity");
  await user.click(screen.getByRole("button", { name: "Update material draft" }));
  expect(onSave).toHaveBeenCalledWith({ ...material, text: "Updated classroom activity" }, undefined);
  await user.click(screen.getByRole("button", { name: "Edit material Old lesson" }));
  await user.click(screen.getByRole("button", { name: "Cancel material editing" }));
  expect(onSave).toHaveBeenCalledTimes(1);
});
it("hands the replacement document to publication instead of pretending to edit a PDF in the browser", async () => {
  const user = userEvent.setup();
  const material: Material = { id: "pdf-1", kind: "pdf", title: "Reading", path: "content/uploads/old.pdf", date: "2026-10-26" };
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<MaterialEditor material={material} onSave={onSave} />);
  await user.click(screen.getByRole("button", { name: "Edit material Reading" }));
  const file = new File(["%PDF-1.4 new version"], "updated.pdf", { type: "application/pdf" });
  await user.upload(screen.getByLabelText("Replace file (optional, up to 2 MiB)"), file);
  await user.click(screen.getByRole("button", { name: "Update material draft" }));
  expect(onSave).toHaveBeenCalledWith(material, file);
});
