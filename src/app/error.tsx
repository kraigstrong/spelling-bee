"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state">
      <span>🌧️</span>
      <h1>A little hiccup.</h1>
      <p>We couldn’t load this quest. Your browser keeps your practice safe.</p>
      <button className="primary-button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
