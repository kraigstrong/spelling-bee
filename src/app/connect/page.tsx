import Link from "next/link";
import { ArrowLeft, ArrowRight, Puzzle, Check, FileJson } from "lucide-react";
import { Brand } from "@/components/brand";
import { ImportLesson } from "@/components/import-lesson";

export default function Connect() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Brand />
        <Link className="quiet-link" href="/">
          <ArrowLeft size={16} /> Back to quests
        </Link>
      </header>
      <main className="connect-main">
        <span className="step-icon lavender">
          <Puzzle size={26} />
        </span>
        <div className="section-kicker">YOUR AGENT BRINGS THE IMAGINATION</div>
        <h1>
          From spelling list
          <br />
          to story quest.
        </h1>
        <p className="connect-intro">
          Muse writes the story. Spelling Quest brings it to life.
        </p>
        <div className="connect-grid">
          <section className="panel">
            <h2>Use MCP from Muse’s VM</h2>
            <ol className="connection-steps">
              <li>
                Give Muse this site’s <code>/api/mcp</code> endpoint and the app
                owner’s access token separately. Requests use an{" "}
                <code>Authorization: Bearer</code> header.
              </li>
              <li>
                Muse can use the downloadable client script below to call{" "}
                <code>get_lesson_schema</code> and write a lesson from your
                spelling list.
              </li>
              <li>
                Muse validates it with <code>validate_lesson</code> and sends it
                with <code>create_lesson</code>.
              </li>
              <li>
                Open the lesson link. After practice, ask Muse to call{" "}
                <code>get_results</code> for words to review.
              </li>
            </ol>
            <div className="info-box">
              <Check size={18} />
              <span>
                The app does no AI generation. Your agent supplies the words,
                story, letter patterns, hints, and theme.
              </span>
            </div>
            <p className="small-copy">
              Muse has no generic native MCP connection. Its VM can make these
              calls when you ask it to. Keep the token private; share only the
              child’s lesson link.
            </p>
            <div className="connect-downloads">
              <a className="quiet-link" href="/muse-client.py" download>
                <FileJson size={16} /> Download Muse client{" "}
                <ArrowRight size={15} />
              </a>
              <a
                className="quiet-link"
                href="/api/schema"
                target="_blank"
                rel="noreferrer"
              >
                View lesson schema <ArrowRight size={15} />
              </a>
            </div>
          </section>
          <section className="panel">
            <h2>Try an agent’s JSON lesson</h2>
            <p className="small-copy">
              You can also ask Muse for JSON using the schema, then paste it
              here. This preview stays in this browser; results are not
              available to Muse.
            </p>
            <ImportLesson />
          </section>
        </div>
      </main>
    </div>
  );
}
