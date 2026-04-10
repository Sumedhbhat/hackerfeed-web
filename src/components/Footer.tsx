export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer mt-24 px-4 pb-12 pt-8 text-[var(--sea-ink-soft)]">
      <div className="page-wrap">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 mb-1 text-base font-semibold tracking-tight text-[var(--sea-ink)]">
              HackerFeed
            </p>
            <p className="m-0 text-sm leading-relaxed max-w-sm">
              A clean reader for top, new, and best Hacker News stories.
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-sm">
            <a
              href="https://news.ycombinator.com/news"
              target="_blank"
              rel="noreferrer"
              className="nav-link"
            >
              Hacker News
            </a>
            <a
              href="https://github.com/HackerNews/API"
              target="_blank"
              rel="noreferrer"
              className="nav-link"
            >
              HN API
            </a>
            <a
              href="https://www.ycombinator.com/"
              target="_blank"
              rel="noreferrer"
              className="nav-link"
            >
              Y Combinator
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--line)] pt-6">
          <p className="m-0 text-xs tracking-wide opacity-50">
            &copy; {year} HackerFeed
          </p>
        </div>
      </div>
    </footer>
  );
}
