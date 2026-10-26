// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { Manifest } from "../shared/content";
import fixture from "../public/content/manifest.json";
import LearningUpdates from "../src/components/LearningUpdates";
import TeacherPostEditor from "../src/components/TeacherPostEditor";
import StudentProgressEditor from "../src/components/StudentProgressEditor";
afterEach(cleanup);
describe("Learning progress and teacher journal", () => {
  it("shows a named goal, actual percentage and escaped teacher text", () => {
    const data = structuredClone(fixture) as Manifest;
    data.students[0].progress = {
      percent: 65,
      goal: "Introduce myself",
      note: "Well done.",
    };
    data.posts = [
      {
        id: "note",
        title: "This week",
        body: "<script>unsafe()</script>",
        date: "2026-10-21",
      },
    ];
    const { container } = render(
      <LearningUpdates data={data} student={data.students[0]} />,
    );
    const progress = screen.getByRole("progressbar", {
      name: "Goal progress: 65%",
    });
    expect(progress.getAttribute("value")).toBe("65");
    expect(screen.queryByRole("heading", { name: "Matheus Lima" })).toBeNull();
    expect(screen.getByText("<script>unsafe()</script>")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
  });
  it("edits progress and a public journal draft through the labelled forms", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [data, setData] = useState<Manifest>(
        structuredClone(fixture) as Manifest,
      );
      return (
        <>
          <StudentProgressEditor
            student={data.students[0]}
            onChange={(student) =>
              setData({
                ...data,
                students: [student, ...data.students.slice(1)],
              })
            }
          />
          <TeacherPostEditor
            draft={data}
            onChange={setData}
            onNotice={() => {}}
          />
          <LearningUpdates data={data} />
        </>
      );
    }
    render(<Harness />);
    await user.click(
      screen.getByRole("button", { name: "Set a learning goal" }),
    );
    const percentage = screen.getByRole("spinbutton", {
      name: "Progress percentage (0–100)",
    });
    await user.clear(percentage);
    await user.type(percentage, "65");
    expect(
      screen.getByRole("progressbar", { name: "Goal progress: 65%" }),
    ).toBeTruthy();
    await user.type(
      screen.getByRole("textbox", { name: "Post title (required)" }),
      "Weekly practice",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Post text (required)" }),
      "Read for ten minutes.",
    );
    await user.click(screen.getByRole("button", { name: "Add post to draft" }));
    expect(
      screen.getByRole("heading", { name: "Weekly practice" }),
    ).toBeTruthy();
    expect(screen.getByText("Read for ten minutes.")).toBeTruthy();
  });
});
