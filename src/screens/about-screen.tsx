import { ArrowLeft, BookOpenCheck, ScrollText, ShieldCheck } from 'lucide-react'

import { Logo } from '@/components/logo'
import { APP_VERSION, CHANGELOG_MARKDOWN } from '@/lib/app-info'
import { parseChangelog } from '@/lib/changelog'

export function AboutScreen({ onBack }: { onBack: () => void }) {
  const entries = parseChangelog(CHANGELOG_MARKDOWN)

  return (
    <div className="about-screen">
      <header className="book-screen__header">
        <button type="button" className="lesson-screen__close" aria-label="Back" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div>
          <h1 className="book-screen__title">About Aura</h1>
          <p className="book-screen__author">Version, license and release notes</p>
        </div>
      </header>

      <section className="about-card">
        <Logo size={52} withBackground />
        <div className="about-card__identity">
          <h2 className="about-card__name">Aura</h2>
          <span className="about-card__version">Version {APP_VERSION}</span>
        </div>
        <p className="about-card__tagline">
          Learn English at full power — a Duolingo-style course that is 100% local, free and open
          source.
        </p>
        <dl className="about-card__facts">
          <div>
            <ShieldCheck size={16} aria-hidden="true" />
            <span>MIT license</span>
          </div>
          <div>
            <ScrollText size={16} aria-hidden="true" />
            <span>Fully offline</span>
          </div>
        </dl>
      </section>

      <section className="result-section">
        <h2 className="section-title">
          <BookOpenCheck size={18} aria-hidden="true" /> Changelog
        </h2>
        {entries.length === 0 && (
          <p className="screen-subtitle">No release notes yet. New versions appear here.</p>
        )}
        {entries.map((entry) => (
          <article key={entry.version} className="about-entry">
            <header className="about-entry__header">
              <h3 className="about-entry__title">v{entry.version}</h3>
              {entry.date !== undefined && <time className="about-entry__date">{entry.date}</time>}
            </header>
            {entry.sections.map((section) => (
              <div key={section.heading} className="about-entry__section">
                <h4>{section.heading}</h4>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </article>
        ))}
      </section>
    </div>
  )
}
