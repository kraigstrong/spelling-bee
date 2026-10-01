import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  PencilLine,
  Sparkles,
  Trophy,
  WandSparkles,
  Puzzle,
  Check,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { featuredLesson } from "@/lib/featured";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Brand />
        <Link className="quiet-link" href="/connect">
          <Puzzle size={16} /> For your agent <ArrowRight size={15} />
        </Link>
      </header>
      <main>
        <section className="home-hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-spark">✦</span> A LITTLE PRACTICE. A BIG
              ADVENTURE.
            </div>
            <h1>
              Make spelling
              <br />a little more
              <br />
              <em>magical.</em>
              <span className="heading-star">✧</span>
            </h1>
            <p>
              Your words. A wonderful story. Three playful rounds that help
              tricky spellings stick.
            </p>
            <Link href="/play/demo" className="primary-button">
              Let’s go on a word quest <ArrowRight size={19} />
            </Link>
            <div className="hero-note">
              <Check size={15} /> Made for grades 2–5 <span>·</span> No timer,
              no pressure
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustration of a storybook spelling adventure"
          >
            <span className="art-orbit orbit-one" />
            <span className="art-orbit orbit-two" />
            <span className="art-star star-one">✦</span>
            <span className="art-star star-two">✧</span>
            <span className="art-star star-three">✦</span>
            <span className="art-flower">✿</span>
            <div className="floating-tag float-top">
              <Sparkles size={17} /> Small wins. Big smiles.
            </div>
            <div className="storybook">
              <div className="book-binding" />
              <div className="book-top">
                <span>YOUR NEXT ADVENTURE</span>
                <span>✦</span>
              </div>
              <div className="book-scene">
                <div className="moon" />
                <span className="scene-butterfly">🦋</span>
                <span className="scene-castle">♜</span>
                <span className="scene-hill hill-one" />
                <span className="scene-hill hill-two" />
                <span className="scene-path" />
                <span className="scene-spark scene-spark-one">✦</span>
                <span className="scene-spark scene-spark-two">✦</span>
              </div>
              <h2>
                The Secret
                <br />
                Sparkle Parade
              </h2>
              <div className="book-rule" />
              <p>Every word opens a little door.</p>
            </div>
            <div className="floating-tag float-bottom">
              <span className="coin">★</span>
              <span>
                One word closer!<small>+20 adventure points</small>
              </span>
            </div>
          </div>
        </section>
        <section className="how-section">
          <div className="section-kicker">THE QUEST IS SIMPLE</div>
          <h2>One story. Three ways to learn.</h2>
          <div className="steps-grid">
            <div className="step-card">
              <span className="step-icon lavender">
                <BookOpen size={23} />
              </span>
              <span className="step-number">01</span>
              <h3>Meet your words</h3>
              <p>Read a fun story with your spelling words woven right in.</p>
              <span className="step-example">
                A shiny <mark>clue</mark> appeared…
              </span>
            </div>
            <div className="step-card">
              <span className="step-icon peach">
                <PencilLine size={23} />
              </span>
              <span className="step-number">02</span>
              <h3>Find the missing letters</h3>
              <p>Fill in the tricky parts. A little help goes a long way.</p>
              <span className="step-example">
                A shiny{" "}
                <span className="example-blank">
                  cl<span>__</span>
                </span>{" "}
                appeared…
              </span>
            </div>
            <div className="step-card">
              <span className="step-icon mint">
                <Trophy size={23} />
              </span>
              <span className="step-number">03</span>
              <h3>Make it your own</h3>
              <p>
                Spell the whole words, collect points, and try a little review.
              </p>
              <span className="step-example">
                A shiny <span className="example-full-blank">?</span> appeared…
              </span>
            </div>
          </div>
        </section>
        <section className="featured-section">
          <div>
            <div className="section-kicker">READY WHEN YOU ARE</div>
            <h2>A sparkle-filled first quest</h2>
            <p>
              Five little chapters. Twenty-five words. One very important kitten
              rescue.
            </p>
            <div className="word-chips">
              {featuredLesson.words.slice(0, 7).map((w) => (
                <span key={w.id}>{w.spelling}</span>
              ))}
              <span className="more-chip">+18 more</span>
            </div>
          </div>
          <Link href="/play/demo" className="secondary-button">
            Try this quest <ArrowRight size={18} />
          </Link>
        </section>
        <section className="agent-banner">
          <span className="step-icon lavender">
            <WandSparkles size={24} />
          </span>
          <div>
            <h3>A story made just for them.</h3>
            <p>
              Your personal agent can turn any spelling list into a personalized
              quest.
            </p>
          </div>
          <Link href="/connect">
            Connect your agent <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="site-footer">
        <span>Little words, big adventures.</span>
        <span>
          Built for practice, powered by imagination. <Sparkles size={14} />
        </span>
      </footer>
    </div>
  );
}
