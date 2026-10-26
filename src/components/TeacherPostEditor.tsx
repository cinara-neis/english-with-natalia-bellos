import { useState } from "react";
import type { Manifest } from "../../shared/content";
import * as S from "../styles";
export default function TeacherPostEditor({
  draft,
  onChange,
  onNotice,
}: {
  draft: Manifest;
  onChange: (m: Manifest) => void;
  onNotice: (s: string) => void;
}) {
  const [editing, setEditing] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState("");
  const reset = () => {
    setEditing("");
    setTitle("");
    setBody("");
  };
  return (
    <S.Panel aria-labelledby="journal-editor-heading">
      <h2 id="journal-editor-heading" tabIndex={-1}>
        Write on the homepage
      </h2>
      <p>
        Share a lesson note, announcement or story with everyone. Journal posts
        are public and appear in Teacher’s journal on the home page.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !body.trim()) return;
          const previous = (draft.posts || []).find((p) => p.id === editing);
          const post = {
            id: editing || crypto.randomUUID(),
            title: title.trim(),
            body: body.trim(),
            date: previous?.date || new Date().toLocaleDateString("sv-SE"),
          };
          onChange({
            ...draft,
            posts: editing
              ? (draft.posts || []).map((p) => (p.id === editing ? post : p))
              : [post, ...(draft.posts || [])],
          });
          reset();
          onNotice(
            "Journal post added to draft. Save your changes to make it visible on the homepage.",
          );
        }}
      >
        <label htmlFor="post-title">Post title (required)</label>
        <input
          id="post-title"
          required
          maxLength={150}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="post-body">Post text (required)</label>
        <textarea
          id="post-body"
          required
          maxLength={20000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <S.Row style={{ marginTop: 16 }}>
          <S.Button
            type="submit"
            disabled={!editing && (draft.posts || []).length >= 100}
          >
            {editing ? "Update post draft" : "Add post to draft"}
          </S.Button>
          {editing && (
            <S.Button type="button" $secondary onClick={reset}>
              Cancel editing
            </S.Button>
          )}
        </S.Row>
      </form>
      {(draft.posts || []).map((p) => (
        <S.Row key={p.id}>
          <strong>{p.title}</strong>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <S.Button
              type="button"
              $secondary
              aria-label={`Edit post ${p.title}`}
              onClick={() => {
                setEditing(p.id);
                setTitle(p.title);
                setBody(p.body);
                document.getElementById("post-title")?.focus();
              }}
            >
              Edit
            </S.Button>
            <S.Button
              type="button"
              $secondary
              aria-label={`Delete post ${p.title}`}
              onClick={() => {
                if (confirm(`Remove “${p.title}” from the homepage?`)) {
                  onChange({
                    ...draft,
                    posts: (draft.posts || []).filter((a) => a.id !== p.id),
                  });
                  if (editing === p.id) reset();
                  onNotice(
                    "Post removed from draft. Save your changes to confirm.",
                  );
                }
              }}
            >
              Delete
            </S.Button>
          </div>
        </S.Row>
      ))}
    </S.Panel>
  );
}
