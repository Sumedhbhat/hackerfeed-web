export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer mt-20 px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div>
          <p className="island-kicker m-0">HackerFeed</p>
          <p className="m-0 mt-2 text-sm">
            Read top, new, and best Hacker News stories without losing your place.
          </p>
        </div>
        <p className="m-0 text-sm">Updated for the {year} web reader rebuild.</p>
      </div>
      <div className="page-wrap mt-4 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
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
          API Docs
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
    </footer>
  )
}
