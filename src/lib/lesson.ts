import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/);
export const wordSchema = z
  .object({
    id,
    spelling: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[a-zA-Z]+(?:['-][a-zA-Z]+)*$/),
    trickySpans: z
      .array(
        z.object({
          start: z.number().int().min(0),
          end: z.number().int().min(1),
        }),
      )
      .min(1)
      .max(8),
    hint: z.string().min(1).max(240),
    definition: z.string().min(1).max(240),
  })
  .strict();

export const tokenSchema = z.union([
  z.object({ text: z.string().min(1).max(2000) }).strict(),
  z.object({ wordId: id, capitalize: z.boolean().optional() }).strict(),
]);

export const lessonInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().min(1).max(100),
    grade: z.number().int().min(2).max(5),
    theme: z
      .object({
        name: z.string().min(1).max(60),
        emoji: z.string().min(1).max(12),
        accent: z.enum(["violet", "ocean", "forest", "sunset"]),
      })
      .strict(),
    words: z.array(wordSchema).min(1).max(25),
    chapters: z
      .array(
        z
          .object({
            title: z.string().min(1).max(80),
            tokens: z.array(tokenSchema).min(1).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();

export const lessonSchema = lessonInputSchema.superRefine((lesson, ctx) => {
  const seenIds = new Set<string>();
  const seenWords = new Set<string>();
  for (const [i, word] of lesson.words.entries()) {
    const spelling = word.spelling.toLowerCase();
    if (seenIds.has(word.id) || seenWords.has(spelling))
      ctx.addIssue({
        code: "custom",
        path: ["words", i],
        message: "Word IDs and spellings must be unique.",
      });
    seenIds.add(word.id);
    seenWords.add(spelling);
    let lastEnd = -1;
    for (const [j, span] of word.trickySpans.entries()) {
      if (
        span.start >= span.end ||
        span.end > word.spelling.length ||
        span.start < lastEnd
      )
        ctx.addIssue({
          code: "custom",
          path: ["words", i, "trickySpans", j],
          message:
            "Spans use zero-based, end-exclusive character indexes, must be sorted, non-overlapping, and within the word.",
        });
      lastEnd = span.end;
    }
    if (
      word.trickySpans.reduce((sum, s) => sum + s.end - s.start, 0) >=
      word.spelling.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["words", i, "trickySpans"],
        message: "Leave at least one letter visible in the partial-word round.",
      });
  }
  const counts = new Map<string, number>();
  lesson.chapters.forEach((chapter, i) => {
    let references = 0;
    chapter.tokens.forEach((token, j) => {
      if ("wordId" in token) {
        references++;
        if (!seenIds.has(token.wordId))
          ctx.addIssue({
            code: "custom",
            path: ["chapters", i, "tokens", j],
            message: "Unknown wordId.",
          });
        counts.set(token.wordId, (counts.get(token.wordId) ?? 0) + 1);
      } else {
        const rawWords =
          token.text.toLowerCase().match(/[a-z]+(?:['-][a-z]+)*/g) ?? [];
        if (rawWords.some((w) => seenWords.has(w)))
          ctx.addIssue({
            code: "custom",
            path: ["chapters", i, "tokens", j],
            message: "Target words must be wordId tokens, not plain text.",
          });
      }
    });
    if (references < 1 || references > 5)
      ctx.addIssue({
        code: "custom",
        path: ["chapters", i],
        message: "Each chapter must contain 1–5 target words.",
      });
  });
  lesson.words.forEach((word, i) => {
    if (counts.get(word.id) !== 1)
      ctx.addIssue({
        code: "custom",
        path: ["words", i],
        message:
          "Every target word must appear exactly once as a wordId story token.",
      });
  });
});

export type Lesson = z.infer<typeof lessonSchema>;
export type Word = Lesson["words"][number];
export type Round = "parts" | "words" | "retry";
export type Attempt = {
  wordId: string;
  round: Round;
  answer: string;
  correct: boolean;
  hinted: boolean;
};
export type Progress = {
  sessionId: string;
  status: "started" | "completed";
  stage: string;
  points: number;
  attempts: Attempt[];
  updatedAt: string;
};

export function maskWord(word: Word): string {
  return Array.from(word.spelling)
    .map((letter, i) =>
      word.trickySpans.some((s) => i >= s.start && i < s.end) ? "_" : letter,
    )
    .join("");
}

export function expectedAnswer(word: Word, round: Round): string {
  return round === "parts"
    ? word.trickySpans.map((s) => word.spelling.slice(s.start, s.end)).join("")
    : word.spelling;
}

export function isCorrect(word: Word, round: Round, answer: string): boolean {
  return (
    answer.trim().toLowerCase() === expectedAnswer(word, round).toLowerCase()
  );
}

export function scoreAttempts(attempts: Attempt[]): number {
  const rewarded = new Set<string>();
  return attempts.reduce((score, attempt) => {
    const key = `${attempt.round}:${attempt.wordId}`;
    if (!attempt.correct || rewarded.has(key)) return score;
    rewarded.add(key);
    return score + (attempt.hinted ? 5 : attempt.round === "words" ? 20 : 10);
  }, 0);
}

export function retryWords(lesson: Lesson, attempts: Attempt[]): Word[] {
  return lesson.words.filter((word) =>
    attempts.some(
      (a) =>
        a.wordId === word.id && a.round !== "retry" && (!a.correct || a.hinted),
    ),
  );
}

export const authoringInstructions = `Create a spelling lesson for grades 2–5. You generate the content; this app never calls an LLM. Submit 1–25 unique words, precise trickySpans, helpful spelling hints, and short definitions. Use 1–8 short, coherent story chapters with 1–5 target words each. Every target word must occur exactly once as a {wordId} token; never put a target word in a plain {text} token. Keep whitespace and punctuation in text tokens. Tokens concatenate into natural story prose. Do not change a target word into a plural or another inflection. Use capitalize:true for a capitalized story appearance. trickySpans use zero-based character indexes with exclusive end, sorted and non-overlapping; leave at least one letter visible. Choose spelling patterns the learner must remember, not just a single predictable vowel. Target digraphs (ch, ck, sh, th), consonant blends, doubled consonants (such as the tt in attitude and ss in tissue), silent letters (mb in crumb), vowel teams, and tricky unstressed syllables. Usually hide 2–4 letters, leaving enough context to identify the word; prefer meaningful groups over arbitrary large chunks. Include doubled letters wherever relevant. If there are multiple spans, the child types the missing groups together in order. Provide theme.name, theme.emoji, and accent (violet/ocean/forest/sunset). The app runs read → missing letters → missing words → at most 5 review words. Call validate_lesson before create_lesson. Keep the lessonId returned by create_lesson for get_results or replace_lesson. Avoid personal identifying information in content.`;
