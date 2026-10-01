"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  X,
  Flag,
} from "lucide-react";
import { Brand } from "./brand";
import {
  type Lesson,
  type Attempt,
  type Round,
  type Word,
  lessonSchema,
  maskWord,
  expectedAnswer,
  isCorrect,
  retryWords,
  scoreAttempts,
} from "@/lib/lesson";

type Stage = "read" | "parts" | "words" | "retry" | "done";
type Game = {
  sessionId: string;
  stage: Stage;
  chapter: number;
  index: number;
  attempts: Attempt[];
  hinted: boolean;
  feedback: null | { correct: boolean };
};
const newGame = (): Game => ({
  sessionId: crypto.randomUUID(),
  stage: "read",
  chapter: 0,
  index: 0,
  attempts: [],
  hinted: false,
  feedback: null,
});
const stageNames = {
  read: "Read the story",
  parts: "Missing letters",
  words: "Whole words",
  retry: "A little review",
  done: "Quest complete",
};

export function Quest({
  lesson: suppliedLesson,
  lessonId,
  revision: suppliedRevision,
}: {
  lesson: Lesson | null;
  lessonId: string;
  revision: string;
}) {
  const [lesson, setLesson] = useState(suppliedLesson);
  const [revision, setRevision] = useState(suppliedRevision);
  const [game, setGame] = useState<Game | null>(null);
  const [answer, setAnswer] = useState("");
  const [lastSuccess, setLastSuccess] = useState<{
    word: string;
    points: number;
  } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [sync, setSync] = useState<"local" | "saving" | "saved" | "error">(
    "local",
  );
  const [audio, setAudio] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [restartOpen, setRestartOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const saveCounter = useRef(0);
  const remote = lessonId !== "demo" && lessonId !== "local";

  useEffect(() => {
    try {
      let activeLesson = suppliedLesson,
        activeRevision = suppliedRevision;
      if (!activeLesson) {
        const data = JSON.parse(
          localStorage.getItem("spelling-quest-import") ?? "null",
        );
        if (!data)
          throw new Error(
            "No imported lesson. Paste a lesson on the agent page first.",
          );
        activeLesson = lessonSchema.parse(data.lesson);
        activeRevision = data.revision;
        setLesson(activeLesson);
        setRevision(activeRevision);
      }
      const stored = localStorage.getItem(
        `quest:${lessonId}:${activeRevision}`,
      );
      let restored: Game | null = null;
      try {
        const data = stored ? JSON.parse(stored) : null;
        if (
          data &&
          Object.hasOwn(stageNames, data.stage) &&
          Array.isArray(data.attempts) &&
          typeof data.sessionId === "string" &&
          Number.isInteger(data.chapter) &&
          data.chapter >= 0 &&
          data.chapter < activeLesson.chapters.length &&
          Number.isInteger(data.index) &&
          data.index >= 0 &&
          data.index < 25
        )
          restored = data;
      } catch {
        /* A damaged browser save starts a new practice session. */
      }
      setGame(restored ?? newGame());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not open this quest.",
      );
    }
    setAudio("speechSynthesis" in window);
  }, [lessonId, suppliedLesson, suppliedRevision]);

  function enqueueSave(snapshot: Game) {
    if (!remote) return;
    const counter = ++saveCounter.current;
    setSync("saving");
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (counter !== saveCounter.current) return;
        const response = await fetch(`/api/lessons/${lessonId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision,
            sessionId: snapshot.sessionId,
            status: snapshot.stage === "done" ? "completed" : "started",
            stage: snapshot.stage,
            attempts: snapshot.attempts,
          }),
        });
        if (!response.ok) throw new Error("Results could not be saved.");
        if (counter === saveCounter.current) setSync("saved");
      })
      .catch(() => {
        if (counter === saveCounter.current) setSync("error");
      });
  }

  useEffect(() => {
    if (!game) return;
    try {
      localStorage.setItem(
        `quest:${lessonId}:${revision}`,
        JSON.stringify(game),
      );
    } catch {
      setLoadError(
        "Your browser can’t keep practice progress. Enable browser storage, then reload.",
      );
    }
    enqueueSave(game);
    // Saves intentionally run only when the persisted game changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, lessonId, revision]);

  useEffect(() => {
    if (
      game &&
      game.stage !== "read" &&
      game.stage !== "done" &&
      !game.feedback
    )
      inputRef.current?.focus();
  }, [game?.stage, game?.chapter, game?.index, game?.feedback]);
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  if (loadError)
    return (
      <main className="empty-state">
        <span>🧭</span>
        <h1>Let’s find your quest.</h1>
        <p>{loadError}</p>
        <Link href="/connect" className="primary-button">
          Go to agent setup →
        </Link>
      </main>
    );
  if (!lesson || !game)
    return (
      <main className="empty-state" aria-busy="true">
        <span>✦</span>
        <p>Opening your storybook…</p>
      </main>
    );

  const points = scoreAttempts(game.attempts);
  const chapter = lesson.chapters[game.chapter];
  const chapterWords = chapter.tokens.flatMap((token) =>
    "wordId" in token ? [lesson.words.find((w) => w.id === token.wordId)!] : [],
  );
  const reviews = retryWords(lesson, game.attempts).slice(0, 5);
  const currentWord =
    game.stage === "retry" ? reviews[game.index] : chapterWords[game.index];
  const round = game.stage as Round;
  const practiceCount = lesson.words.length * 2;
  const completedCount = new Set(
    game.attempts
      .filter((a) => a.round !== "retry")
      .map((a) => `${a.round}:${a.wordId}`),
  ).size;
  const percent =
    game.stage === "done"
      ? 100
      : Math.round((completedCount / practiceCount) * 100);

  function speak(word: Word) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.spelling);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    utterance.onerror = () =>
      setAudioError(
        "Audio isn’t available right now. Use the story and meaning as clues.",
      );
    setAudioError("");
    window.speechSynthesis.speak(utterance);
  }
  function submit(skip = false) {
    if (!currentWord) return;
    const typed = skip ? "" : answer;
    const correct = isCorrect(currentWord, round, typed);
    const next: Game = {
      ...game!,
      hinted: skip || game!.hinted,
      attempts: [
        ...game!.attempts,
        {
          wordId: currentWord.id,
          round,
          answer: typed,
          correct,
          hinted: skip || game!.hinted,
        },
      ],
      feedback: { correct },
    };
    if (correct) {
      setLastSuccess({
        word: currentWord.spelling,
        points: next.hinted ? 5 : round === "words" ? 20 : 10,
      });
      advance(next);
    } else {
      setLastSuccess(null);
      setAnswer("");
      setGame({ ...next, hinted: true });
      inputRef.current?.focus();
    }
  }
  function advance(snapshot: Game = game!) {
    setAnswer("");
    setAudioError("");
    const clean = { ...snapshot, feedback: null, hinted: false };
    const reviewCount = retryWords(lesson!, snapshot.attempts).slice(
      0,
      5,
    ).length;
    if (snapshot.stage === "read") {
      if (snapshot.chapter < lesson!.chapters.length - 1)
        setGame({ ...clean, chapter: snapshot.chapter + 1 });
      else setGame({ ...clean, stage: "parts", chapter: 0, index: 0 });
    } else if (snapshot.stage === "retry") {
      if (snapshot.index < reviewCount - 1)
        setGame({ ...clean, index: snapshot.index + 1 });
      else setGame({ ...clean, stage: "done", index: 0 });
    } else if (snapshot.index < chapterWords.length - 1)
      setGame({ ...clean, index: snapshot.index + 1 });
    else if (snapshot.chapter < lesson!.chapters.length - 1)
      setGame({ ...clean, chapter: snapshot.chapter + 1, index: 0 });
    else if (snapshot.stage === "parts")
      setGame({ ...clean, stage: "words", chapter: 0, index: 0 });
    else
      setGame({
        ...clean,
        stage: reviewCount ? "retry" : "done",
        index: 0,
        chapter: 0,
      });
  }

  function tokenWord(word: Word, capitalize = false) {
    const display = capitalize
      ? word.spelling[0].toUpperCase() + word.spelling.slice(1)
      : word.spelling;
    if (game!.stage === "read")
      return <mark className="story-word">{display}</mark>;
    const attempted = game!.attempts.some(
      (a) => a.wordId === word.id && a.round === game!.stage,
    );
    const active = word.id === currentWord?.id;
    if (attempted)
      return (
        <mark className={`story-word answered ${active ? "active" : ""}`}>
          {display}
        </mark>
      );
    return (
      <span className={`story-blank ${active ? "active" : ""}`}>
        {game!.stage === "parts" ? (
          capitalize ? (
            maskWord(word)[0].toUpperCase() + maskWord(word).slice(1)
          ) : (
            maskWord(word)
          )
        ) : (
          <span aria-label="Missing word">•••••</span>
        )}
      </span>
    );
  }

  return (
    <div className={`site-shell quest-shell accent-${lesson.theme.accent}`}>
      <header className="site-header">
        <Brand />
        <div className="points-pill">
          <span>★</span>
          <strong>{points}</strong> points
        </div>
      </header>
      <main className="quest-main">
        <div className="quest-topline">
          <Link href="/" className="quiet-link">
            <ArrowLeft size={15} /> Home
          </Link>
          <span className="quest-theme">
            {lesson.theme.emoji} {lesson.theme.name}
          </span>
          <button className="text-button" onClick={() => setRestartOpen(true)}>
            <RotateCcw size={14} /> Start over
          </button>
        </div>
        <div className="round-track" aria-label="Practice rounds">
          {(["read", "parts", "words"] as const).map((stage, i) => {
            const stageIndex = [
              "read",
              "parts",
              "words",
              "retry",
              "done",
            ].indexOf(game.stage);
            return (
              <div
                key={stage}
                className={`round-step ${game.stage === stage ? "current" : ""} ${stageIndex > i ? "complete" : ""}`}
              >
                <span>{stageIndex > i ? <Check size={15} /> : i + 1}</span>
                {stageNames[stage]}
              </div>
            );
          })}
        </div>
        {game.stage === "done" ? (
          <section className="completion-panel">
            <div className="finish-stars">
              ✦ <span>🏆</span> ✦
            </div>
            <div className="section-kicker">YOU DID THE THING!</div>
            <h1>Quest complete.</h1>
            <p>
              You practiced all {lesson.words.length} words. Every try helped
              your spelling grow.
            </p>
            <div className="results-grid">
              <div>
                <strong>{points}</strong>
                <span>adventure points</span>
              </div>
              <div>
                <strong>
                  {
                    lesson.words.filter((w) =>
                      game.attempts.some(
                        (a) =>
                          a.wordId === w.id &&
                          a.round === "words" &&
                          a.correct &&
                          !a.hinted,
                      ),
                    ).length
                  }
                  /{lesson.words.length}
                </strong>
                <span>whole words without hints</span>
              </div>
              <div>
                <strong>
                  {game.attempts.filter((a) => a.round === "retry").length}
                </strong>
                <span>words reviewed</span>
              </div>
            </div>
            <div className="finish-words">
              <h3>
                {retryWords(lesson, game.attempts).length
                  ? "Keep these words in your pocket"
                  : "Your words are looking great!"}
              </h3>
              <p>
                {retryWords(lesson, game.attempts).length
                  ? "A little more practice with these will help. Your agent can make the next quest."
                  : "You spelled every word without needing extra help."}
              </p>
              <div className="word-chips">
                {(retryWords(lesson, game.attempts).length
                  ? retryWords(lesson, game.attempts)
                  : lesson.words
                ).map((w) => (
                  <span key={w.id}>
                    {w.spelling}
                    {game.attempts.some(
                      (a) =>
                        a.wordId === w.id && a.round === "retry" && a.correct,
                    ) && " ✓"}
                  </span>
                ))}
              </div>
            </div>
            <div className="finish-actions">
              <button
                className="primary-button"
                onClick={() => {
                  setGame(newGame());
                  setAnswer("");
                }}
              >
                Play this quest again <RotateCcw size={17} />
              </button>
              <Link href="/" className="secondary-button">
                Back home
              </Link>
            </div>
            <SaveStatus
              remote={remote}
              sync={sync}
              retry={() => enqueueSave(game)}
            />
          </section>
        ) : (
          <>
            <div className="quest-heading">
              <div className="section-kicker">
                {game.stage === "retry"
                  ? "A FEW WORDS GET AN ENCORE"
                  : `CHAPTER ${game.chapter + 1} OF ${lesson.chapters.length} · ${stageNames[game.stage].toUpperCase()}`}
              </div>
              <h1>
                {game.stage === "retry"
                  ? "A little extra sparkle."
                  : chapter.title}
              </h1>
              <p>
                {game.stage === "read"
                  ? "Read the story. Notice the highlighted words—you’ll meet them again!"
                  : game.stage === "parts"
                    ? "The highlighted word is missing a few letters. Can you put them back?"
                    : game.stage === "words"
                      ? "The words have disappeared! Use the story to spell them back into place."
                      : "Let’s give a few tricky words one more friendly try."}
              </p>
            </div>
            <div
              className={`practice-layout ${game.stage === "read" ? "reading-layout" : ""}`}
            >
              <section className="story-panel">
                <div className="story-panel-label">
                  <BookOpen size={16} />
                  <span>{lesson.title}</span>
                  <span className="story-decor">✦</span>
                </div>
                {game.stage === "retry" ? (
                  <div className="review-clue">
                    <span>{lesson.theme.emoji}</span>
                    <h2>What’s the word?</h2>
                    <p>{currentWord?.definition}</p>
                    <div className="review-mask">
                      {currentWord && maskWord(currentWord)}
                    </div>
                    <p className="small-copy">
                      Use the meaning and the letters above. You can listen,
                      too.
                    </p>
                  </div>
                ) : (
                  <p className="story-text">
                    {chapter.tokens.map((token, i) => (
                      <span key={i}>
                        {"text" in token
                          ? token.text
                          : tokenWord(
                              lesson.words.find((w) => w.id === token.wordId)!,
                              token.capitalize,
                            )}
                      </span>
                    ))}
                  </p>
                )}
                {game.stage === "read" && (
                  <div className="read-word-list">
                    <span>Words to notice</span>
                    <div>
                      {chapterWords.map((word) => (
                        <button
                          key={word.id}
                          onClick={() => audio && speak(word)}
                          disabled={!audio}
                          title={
                            audio ? `Hear ${word.spelling}` : word.definition
                          }
                        >
                          {word.spelling}
                          {audio && <Volume2 size={13} />}
                        </button>
                      ))}
                    </div>
                    {audioError && <p role="status">{audioError}</p>}
                  </div>
                )}
              </section>
              {game.stage !== "read" && currentWord && (
                <section
                  className="answer-panel"
                  aria-label="Spelling practice"
                >
                  <div className="answer-top">
                    <span className="section-kicker">
                      {game.stage === "retry"
                        ? `${game.index + 1} OF ${reviews.length} REVIEW WORDS`
                        : `WORD ${game.index + 1} OF ${chapterWords.length}`}
                    </span>
                    <span className="little-star">✦</span>
                  </div>
                  <h2>
                    {game.stage === "parts"
                      ? "Fill in the letters"
                      : "Spell the whole word"}
                  </h2>
                  <div className="answer-mask">
                    {game.stage === "parts"
                      ? maskWord(currentWord)
                      : game.stage === "retry"
                        ? "Your turn ✨"
                        : "?"}
                  </div>
                  <p className="answer-meaning">{currentWord.definition}</p>
                  {lastSuccess && (
                    <div className="quick-success" role="status">
                      <Check size={16} />
                      <span>
                        <strong>{lastSuccess.word}</strong> — nice! +
                        {lastSuccess.points} points
                      </span>
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (game.feedback?.correct) advance();
                      else if (answer.trim()) submit();
                    }}
                  >
                    <label htmlFor="spelling-answer" className="field-label">
                      {game.stage === "parts"
                        ? "Type only the missing letters, from left to right"
                        : "Type the complete word"}
                    </label>
                    <input
                      ref={inputRef}
                      id="spelling-answer"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={80}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder={
                        game.stage === "parts"
                          ? "Missing letters…"
                          : "Your spelling…"
                      }
                      className="spelling-input"
                      aria-describedby="answer-feedback"
                    />
                    <div className="help-actions">
                      {audio && (
                        <button
                          type="button"
                          onClick={() => speak(currentWord)}
                        >
                          <Volume2 size={16} /> Hear the word
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setGame({ ...game, hinted: true })}
                      >
                        <Lightbulb size={16} /> Get a hint
                      </button>
                    </div>
                    {audioError && (
                      <p className="small-copy" role="status">
                        {audioError}
                      </p>
                    )}
                    {game.hinted && !game.feedback && (
                      <div className="hint-box">
                        <Lightbulb size={17} />
                        <span>
                          {currentWord.hint}
                          {game.stage === "words" && (
                            <strong className="hint-mask">
                              {maskWord(currentWord)}
                            </strong>
                          )}
                        </span>
                      </div>
                    )}
                    {game.feedback && (
                      <div
                        id="answer-feedback"
                        className={`feedback ${game.feedback.correct ? "correct" : "try-again"}`}
                        role="status"
                      >
                        {game.feedback.correct ? (
                          <Check size={20} />
                        ) : (
                          <Sparkles size={20} />
                        )}
                        <div>
                          <strong>
                            {game.feedback.correct
                              ? game.hinted
                                ? "You got it—with a little help!"
                                : "That’s it! Nicely done."
                              : "A tricky one. Let’s learn it!"}
                          </strong>
                          <p>
                            {game.feedback.correct ? (
                              `+${game.hinted ? 5 : game.stage === "words" ? 20 : 10} points`
                            ) : (
                              <>
                                {game.stage === "parts"
                                  ? "The missing letters are "
                                  : "The spelling is "}
                                <b>{expectedAnswer(currentWord, round)}</b>.
                                {game.stage === "parts" && (
                                  <>
                                    {" "}
                                    The whole word is{" "}
                                    <b>{currentWord.spelling}</b>.
                                  </>
                                )}{" "}
                                Type it in the box, then press Enter.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    <button
                      type="submit"
                      className="primary-button answer-submit"
                      disabled={!game.feedback?.correct && !answer.trim()}
                    >
                      {game.feedback?.correct
                        ? "Next word"
                        : game.feedback
                          ? "Check my correction"
                          : "Check my answer"}
                      <ArrowRight size={17} />
                    </button>
                    {!game.feedback && (
                      <button
                        type="button"
                        className="skip-button"
                        onClick={() => submit(true)}
                      >
                        Show me this one
                      </button>
                    )}
                  </form>
                </section>
              )}
            </div>
            {game.stage === "read" && (
              <div className="reading-actions">
                <span>
                  <Sparkles size={17} /> Take your time. This is your adventure.
                </span>
                <button className="primary-button" onClick={() => advance()}>
                  {game.chapter < lesson.chapters.length - 1
                    ? "Next chapter"
                    : "Ready for missing letters"}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
            <div className="quest-progress">
              <div>
                <span>
                  <Flag size={14} />{" "}
                  {game.stage === "read"
                    ? "Getting to know your words"
                    : `${completedCount} of ${practiceCount} practice words`}
                </span>
                <span>{percent}%</span>
              </div>
              <div className="progress-track">
                <div style={{ width: `${percent}%` }} />
              </div>
            </div>
            <SaveStatus
              remote={remote}
              sync={sync}
              retry={() => enqueueSave(game)}
            />
          </>
        )}
        {restartOpen && (
          <div className="modal-scrim">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="restart-title"
              className="restart-dialog"
            >
              <button
                className="modal-close"
                aria-label="Keep practicing"
                onClick={() => setRestartOpen(false)}
              >
                <X size={20} />
              </button>
              <RotateCcw size={30} />
              <h2 id="restart-title">Start a fresh quest?</h2>
              <p>
                Your points and place will reset for a new practice session.
              </p>
              <div>
                <button
                  autoFocus
                  className="secondary-button"
                  onClick={() => setRestartOpen(false)}
                >
                  Keep practicing
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    setGame(newGame());
                    setAnswer("");
                    setRestartOpen(false);
                  }}
                >
                  Start over
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <span>No timer. No lost points. Just practice.</span>
        <span>
          {lesson.theme.emoji} {lesson.theme.name}
        </span>
      </footer>
    </div>
  );
}

function SaveStatus({
  remote,
  sync,
  retry,
}: {
  remote: boolean;
  sync: string;
  retry: () => void;
}) {
  return (
    <div
      className={`save-status ${sync === "error" ? "save-error" : ""}`}
      role="status"
    >
      {!remote ? (
        "Sample and preview progress stays in this browser. Your agent can read results from lessons it submits."
      ) : sync === "error" ? (
        <>
          <span>
            Saved in this browser. Results haven’t reached your agent yet.
          </span>
          <button className="text-button" onClick={retry}>
            Retry saving
          </button>
        </>
      ) : sync === "saving" ? (
        "Saving practice results…"
      ) : (
        "Practice saved. Your agent can check your results."
      )}
    </div>
  );
}
