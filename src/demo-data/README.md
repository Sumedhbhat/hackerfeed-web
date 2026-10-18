# Demo data

Dummy data that previews show instead of anything real. Nothing here comes
from production, Hacker News or Hugging Face.

- `database/<table>.ts`: every row of every D1 table, typed from
  `src/server/database/schema.ts`. `database/index.ts` lists them all.
- `hacker-news.ts`: stories, comments and feed orderings, in the Hacker News
  API's response shape. Preview builds (`VITE_DEMO_DATA=true`) answer Hacker
  News requests from it (`src/lib/hacker-news/demo-api.ts`).

## Writing rows

Each table has a factory that fills in defaults, so a row only states what
makes it different:

```ts
export const smallModels = paper({
	arxivId: "2601.00003",
	title: "Training Small Models on Dummy Data",
	summary: "…",
	paperPublishedAt: "2026-01-12T09:00:00.000Z",
	upvotes: 90,
});
```

Rows that reference other rows take the row, not its id, so the files import
each other and the data stays linked:

```ts
paperFavorite(smallModels, { createdAt: sqliteAt("10:45:00") });
paperAuthors(smallModels, [chen, dana]);
```

Some values are derived rather than written: stored stories (`stories.ts`) are
built from the Hacker News threads, comment `parent`/`kids`/`descendants` from
the nesting, feed orders from score and time, and ingestion counts from the
row lists. Shared dates and timestamp helpers live in `defaults.ts`.

## Where it is used

- **Cloudflare PR previews** (`.github/workflows/preview.yaml`): each push
  applies the PR's migrations to the PR's database, then replaces every row
  with `database/`. The Hacker News data is built into the preview.
- **Private preview** (`bun run preview:private`): the same, on a local
  database. See `docs/private-preview.md`.

Production builds never include this data; `build.yaml` and `deploy.yaml`
fail if they do.

## The demo user

Rows for `demoUser` (`database/app-users.ts`) are copied to anyone who signs in
to a preview, so a new account starts with favorites, saved papers and history.
Give every per-user table at least one `demoUser` row.

## When the schema changes

`tsc` flags rows missing a new column, since every row is typed from the
schema. `bun run test` also checks the rows (`src/demo-data/fixtures.test.ts`)
and fails, naming the table, row and column, when:

- a column is added and some row lacks it (use `null` only if the column is
  nullable),
- a value has the wrong type, is not one of an enum's values, or is not a
  date in a `...At` / `...Date` column,
- a row references a row that does not exist,
- a table is missing from `database/index.ts`,
- the rows cannot be loaded into a database built from `migrations/`.

So adding a column usually means adding a default to that table's factory, and
overriding it on the rows that should show the feature off.

## Checking against the live APIs

`bun run demo-data:compare` fetches a few live Hacker News items and reports
fields the live API returns that no demo item has, or whose type differs. It
only compares shapes; nothing live is saved.
