import test from "node:test";
import assert from "node:assert/strict";
import {
  lessonSchema,
  maskWord,
  expectedAnswer,
  isCorrect,
  scoreAttempts,
  retryWords,
  type Attempt,
} from "../src/lib/lesson";
import { featuredLesson } from "../src/lib/featured";
import { demoLesson } from "../src/lib/demo";

test("the supplied 25 words appear exactly once across five manageable chapters", () => {
  assert.equal(featuredLesson.words.length, 25);
  assert.equal(featuredLesson.chapters.length, 5);
  const expected =
    "bunch fruit argue crumb crew tune juice refuse truth young clue trunk amuse suit rude trust dew stuck rescue brush computer mustard tissue customer attitude".split(
      " ",
    );
  assert.deepEqual(
    featuredLesson.words.map((w) => w.spelling),
    expected,
  );
  assert.equal(lessonSchema.safeParse(featuredLesson).success, true);
  assert.equal(lessonSchema.safeParse(demoLesson).success, true);
});

test("the sample practices consonant patterns, silent letters, and double letters rather than single-vowel blanks", () => {
  const expected = {
    bunch: "nch",
    stuck: "ck",
    brush: "sh",
    truth: "th",
    crumb: "mb",
    attitude: "tt",
    tissue: "ssue",
  };
  for (const [spelling, letters] of Object.entries(expected)) {
    const word = featuredLesson.words.find((w) => w.spelling === spelling)!;
    assert.equal(expectedAnswer(word, "parts"), letters);
  }
  assert.ok(
    featuredLesson.words.every((w) => expectedAnswer(w, "parts").length >= 2),
  );
});

test("invalid content cannot silently drop, duplicate, or expose a target word", () => {
  for (const kind of [
    "missing",
    "duplicate",
    "unknown",
    "plaintext",
  ] as const) {
    const lesson = structuredClone(demoLesson);
    if (kind === "missing")
      lesson.chapters[0].tokens = lesson.chapters[0].tokens.filter(
        (t) => !("wordId" in t && t.wordId === "because"),
      );
    if (kind === "duplicate")
      lesson.chapters[0].tokens.push({ wordId: "because" });
    if (kind === "unknown") lesson.chapters[0].tokens.push({ wordId: "oops" });
    if (kind === "plaintext")
      lesson.chapters[0].tokens.push({ text: " The FRIEND was there." });
    assert.equal(lessonSchema.safeParse(lesson).success, false, kind);
  }
});

test("tricky spans must be ordered, non-overlapping, in bounds, and leave visible letters", () => {
  for (const spans of [
    [{ start: 3, end: 3 }],
    [{ start: 1, end: 20 }],
    [{ start: 0, end: 7 }],
    [
      { start: 3, end: 5 },
      { start: 2, end: 4 },
    ],
  ]) {
    const lesson = structuredClone(demoLesson);
    lesson.words[0].trickySpans = spans;
    assert.equal(lessonSchema.safeParse(lesson).success, false);
  }
});

test("missing letters and whole words use different answers; casing and outer whitespace are ignored", () => {
  const word = featuredLesson.words.find((w) => w.spelling === "fruit")!;
  assert.equal(maskWord(word), "fr__t");
  assert.equal(expectedAnswer(word, "parts"), "ui");
  assert.equal(isCorrect(word, "parts", " UI "), true);
  assert.equal(isCorrect(word, "parts", "fruit"), false);
  assert.equal(isCorrect(word, "words", " Fruit "), true);
  assert.equal(isCorrect(word, "words", "fr uit"), false);
});

test("multiple spans concatenate in order", () => {
  const word = {
    ...demoLesson.words[0],
    trickySpans: [
      { start: 1, end: 2 },
      { start: 4, end: 6 },
    ],
  };
  assert.equal(maskWord(word), "b_ca__e");
  assert.equal(expectedAnswer(word, "parts"), "eus");
});

test("points cannot be farmed by resubmitting and hints or misses trigger review", () => {
  const attempts: Attempt[] = [
    {
      wordId: "bunch",
      round: "parts",
      answer: "nch",
      correct: true,
      hinted: false,
    },
    {
      wordId: "bunch",
      round: "parts",
      answer: "nch",
      correct: true,
      hinted: false,
    },
    {
      wordId: "fruit",
      round: "parts",
      answer: "oo",
      correct: false,
      hinted: false,
    },
    {
      wordId: "bunch",
      round: "words",
      answer: "bunch",
      correct: true,
      hinted: true,
    },
    {
      wordId: "fruit",
      round: "retry",
      answer: "fruit",
      correct: true,
      hinted: false,
    },
  ];
  assert.equal(scoreAttempts(attempts), 25);
  assert.deepEqual(
    retryWords(featuredLesson, attempts).map((w) => w.id),
    ["bunch", "fruit"],
  );
});
