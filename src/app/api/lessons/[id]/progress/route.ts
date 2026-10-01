import { z } from "zod";
import { getLesson, saveProgress } from "@/lib/store";
import { isCorrect, scoreAttempts } from "@/lib/lesson";

const input = z.object({
  revision: z.string().uuid(),
  sessionId: z.string().uuid(),
  status: z.enum(["started", "completed"]),
  stage: z.enum(["read", "parts", "words", "retry", "done"]),
  attempts: z
    .array(
      z.object({
        wordId: z.string().max(40),
        round: z.enum(["parts", "words", "retry"]),
        answer: z.string().max(80),
        hinted: z.boolean(),
      }),
    )
    .max(250),
});
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 100_000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const parsed = input.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Invalid practice data." },
        { status: 400 },
      );
    const { id } = await context.params;
    const record = await getLesson(id);
    if (!record)
      return Response.json({ error: "Lesson not found." }, { status: 404 });
    if (record.revision !== parsed.data.revision)
      return Response.json(
        {
          error: "This lesson changed. Reload to practice the updated version.",
        },
        { status: 409 },
      );
    const attempts = parsed.data.attempts.map((a) => {
      const word = record.lesson.words.find((w) => w.id === a.wordId);
      if (!word) throw new Error("Unknown word.");
      return { ...a, correct: isCorrect(word, a.round, a.answer) };
    });
    if (
      parsed.data.status === "completed" &&
      !record.lesson.words.every(
        (w) =>
          attempts.some((a) => a.wordId === w.id && a.round === "parts") &&
          attempts.some((a) => a.wordId === w.id && a.round === "words"),
      )
    )
      return Response.json(
        { error: "Finish both practice rounds before completing the lesson." },
        { status: 400 },
      );
    await saveProgress(id, record.revision, {
      sessionId: parsed.data.sessionId,
      status: parsed.data.status,
      stage: parsed.data.stage,
      attempts,
      points: scoreAttempts(attempts),
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ saved: true });
  } catch {
    return Response.json(
      { error: "Could not save practice results. Try again." },
      { status: 500 },
    );
  }
}
