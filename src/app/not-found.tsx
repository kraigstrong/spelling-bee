import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty-state">
      <span>🧭</span>
      <h1>This quest wandered off.</h1>
      <p>Check your lesson link or try the sample adventure.</p>
      <Link className="primary-button" href="/">
        Back to Spelling Quest →
      </Link>
    </main>
  );
}
