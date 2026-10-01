"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { lessonSchema } from "@/lib/lesson";
export function ImportLesson() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        try {
          const parsed = lessonSchema.safeParse(JSON.parse(value));
          if (!parsed.success) {
            setError(
              parsed.error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("\n"),
            );
            return;
          }
          localStorage.setItem(
            "spelling-quest-import",
            JSON.stringify({
              lesson: parsed.data,
              revision: crypto.randomUUID(),
            }),
          );
          router.push("/play/local");
        } catch {
          setError(
            "Paste valid JSON. If Muse supplied a code block, remove its opening and closing fences.",
          );
        }
      }}
    >
      <label htmlFor="lesson-json" className="field-label">
        Lesson JSON
      </label>
      <textarea
        id="lesson-json"
        className="json-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={'{ "schemaVersion": 1, "title": "…", … }'}
        required
      />
      <button className="primary-button" type="submit">
        Preview this quest →
      </button>
      {error && (
        <pre className="import-error" role="alert">
          {error}
        </pre>
      )}
    </form>
  );
}
