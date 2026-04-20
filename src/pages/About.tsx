import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './About.module.css';

const About: FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.page}>
      {/* Ambient glow */}
      <div className={styles.glow} aria-hidden="true" />

      {/* Sticky header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            className={styles.headerLink}
            onClick={() => navigate('/login')}
            type="button"
          >
            Sign In
          </button>
          <div className={styles.brand}>Quizly</div>
          <a
            className={styles.headerLink}
            href="https://quizly.me"
            target="_blank"
            rel="noreferrer"
          >
            quizly.me
          </a>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <img
            src={`${import.meta.env.BASE_URL}icons/mrquizly.png`}
            alt="Mr. Quizly"
            className={styles.heroMascot}
            decoding="async"
          />
          <h1 className={styles.heroTitle}>Quizly</h1>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1600 220"
            role="img"
            aria-label="it's not a test!"
            className={styles.taglineSvg}
          >
            <style>{`
              text {
                font-family: "Pacifico", "Lobster", "Brush Script MT", "Segoe Script",
                             "Snell Roundhand", "Dancing Script", cursive;
                font-size: 94px;
                font-weight: 700;
                fill: #f5f5f7;
                letter-spacing: 3px;
                paint-order: stroke fill;
                stroke: #f5f5f7;
                stroke-width: 1px;
                dominant-baseline: middle;
                text-anchor: middle;
              }
            `}</style>
            <text x="50%" y="120">it's not a test!</text>
          </svg>
          <p className={styles.heroLede}>
            A flashcard engine built for multi-sided cards, spaced repetition,
            and real mastery. Four study modes, per-card audio, and offline-first
            sync across every device.
          </p>
          <button
            className={styles.ctaButton}
            onClick={() => navigate('/login')}
            type="button"
          >
            Get Started
          </button>
        </section>

        {/* Multi-Sided Cards */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Cards</div>
          <div className={styles.featureCard}>
            <div className={styles.featureCardGlow} aria-hidden="true" />
            <div className={styles.featureGrid}>
              <div>
                <h2 className={styles.h2}>Up to six sides per card.</h2>
                <p className={styles.body}>
                  Go beyond front-and-back. Each card can carry a term,
                  definition, pronunciation, characters, context sentence, and
                  notes. Configure which sides appear in each study mode.
                </p>
              </div>
              <div>
                <div className={styles.sideDemo}>
                  <div className={styles.sidePill} data-side="a">side_a</div>
                  <div className={styles.sidePill} data-side="b">side_b</div>
                  <div className={styles.sidePill} data-side="c">side_c</div>
                  <div className={styles.sidePill} data-side="d">side_d</div>
                  <div className={styles.sidePill} data-side="e">side_e</div>
                  <div className={styles.sidePill} data-side="f">side_f</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Four Learning Modes */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Study Modes</div>
          <div className={styles.modeGrid}>
            {/* Flashcards */}
            <div className={styles.modeCard} data-mode="flashcards">
              <div className={styles.modeIcon}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <rect x="4" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                  <rect x="10" y="12" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h3 className={styles.modeTitle}>Flashcards</h3>
                <span className={styles.modeTag}>Flip & Review</span>
              </div>
              <p className={styles.modeDesc}>
                Tap to flip, swipe to advance. Configurable side groupings and
                audio playback on reveal.
              </p>
            </div>

            {/* Learn */}
            <div className={styles.modeCard} data-mode="learn">
              <div className={styles.modeIcon}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 16l3 3 6-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className={styles.modeTitle}>Learn</h3>
                <span className={styles.modeTag}>Guided Mastery</span>
              </div>
              <p className={styles.modeDesc}>
                Multiple choice and free-text questions with level-based
                progression. Cards advance through mastery tiers.
              </p>
            </div>

            {/* Match */}
            <div className={styles.modeCard} data-mode="match">
              <div className={styles.modeIcon}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                  <rect x="19" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="19" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                  <rect x="19" y="19" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h3 className={styles.modeTitle}>Match</h3>
                <span className={styles.modeTag}>Speed Drill</span>
              </div>
              <p className={styles.modeDesc}>
                Pair terms to definitions against the clock. Best times are
                tracked per deck.
              </p>
            </div>

            {/* Read */}
            <div className={styles.modeCard} data-mode="read">
              <div className={styles.modeIcon}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path d="M5 6h9c2 0 3 1 3 3v17c0-1.5-1-2.5-3-2.5H5V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M27 6h-9c-2 0-3 1-3 3v17c0-1.5 1-2.5 3-2.5h9V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className={styles.modeTitle}>Read</h3>
                <span className={styles.modeTag}>Context</span>
              </div>
              <p className={styles.modeDesc}>
                In-deck reading passages with interactive translation. Tap any
                word for pinyin, meaning, and audio.
              </p>
            </div>
          </div>
        </section>

        {/* Audio & Sync */}
        <section className={styles.section}>
          <div className={styles.twoCol}>
            <div className={styles.featureCard}>
              <div className={styles.sectionLabel}>Audio</div>
              <h2 className={styles.h2}>Per-card pronunciation.</h2>
              <ul className={styles.list}>
                <li>Native-speaker TTS for every card side</li>
                <li>Dialogue tracks with vocabulary blocks</li>
                <li>Adjustable playback speed and repeat</li>
                <li>Audio player with full playlist controls</li>
              </ul>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.sectionLabel}>Sync</div>
              <h2 className={styles.h2}>Your data, everywhere.</h2>
              <ul className={styles.list}>
                <li>Self-hosted sync server with automatic delta sync</li>
                <li>Offline-first with queue and retry</li>
                <li>Progress, mastery, and decks travel between devices</li>
                <li>Guest mode with no account required</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PWA & Tech */}
        <section className={styles.section}>
          <div className={styles.twoCol}>
            <div>
              <div className={styles.sectionLabel}>PWA</div>
              <h2 className={styles.h2}>Install it. Use it offline.</h2>
              <p className={styles.body}>
                Add to home screen on iOS, Android, or desktop. Service worker
                caching keeps everything available without a connection. No app
                store, no updates to manage.
              </p>
            </div>
            <div>
              <div className={styles.sectionLabel}>Stack</div>
              <div className={styles.stackRow}>
                <span>React</span>
                <span className={styles.dot} />
                <span>Vite</span>
                <span className={styles.dot} />
                <span>TypeScript</span>
                <span className={styles.dot} />
                <span>Zustand</span>
                <span className={styles.dot} />
                <span>IndexedDB</span>
                <span className={styles.dot} />
                <span>Vitest</span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className={styles.finalCta}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Ready to study?</h2>
            <button
              className={styles.ctaButton}
              onClick={() => navigate('/login')}
              type="button"
            >
              Get Started
            </button>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          Built by{' '}
          <a href="https://wabbazzar.com" target="_blank" rel="noreferrer">
            Wesley Beckner
          </a>
        </div>
        <div>quizly.me</div>
      </footer>
    </div>
  );
};

export default About;
