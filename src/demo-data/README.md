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

Rows that reference other rows take the row, rather than its id, so the files import
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

Cloudflare PR previews and `bun run preview:private` build a static SPA with
`VITE_DEMO_DATA=true`. The demo tRPC link (`src/lib/trpc/demo.ts`) projects
these rows into the same API shapes used by the app. Hacker News requests
use `src/lib/hacker-news/demo-api.ts`.

Every page starts as Demo Reader (`demo@example.com`) with seeded story and
paper favorites. Changes live in browser memory, shared across client
instances on that page. Refreshing or choosing **Reset demo** restores the
fixtures. There is no WorkOS sign-in, database, browser SQL engine, or AI
connection. AI stays disabled. Local favorites from an earlier app session
are not imported.

Only `dist/client` is deployed, using `wrangler.preview.jsonc`. Its SPA
fallback supports direct links to stories, papers, favorites, and profiles.
Production keeps SSR, WorkOS, and D1; production builds exclude demo fixtures.

These previews check UI behavior with fixed data. They do not rehearse
migrations, validate D1 queries, or test authentication and AI providers.
Run the backend tests and review the production Terraform plan separately.

## When the schema changes

`tsc` flags rows missing a new column, since every row is typed from the
schema. `bun run test` also checks the rows (`src/demo-data/fixtures.test.ts`)
and fails, naming the table, row and column, when:

- a column is added and some row lacks it (use `null` only if the column is
  nullable),
- a value has the wrong type, is not one of an enum's values, or is not a
  date in a `...At` / `...Date` column,
- a row references a row that does not exist,
- a table is missing from `database/index.ts`.

So adding a column usually means adding a default to that table's factory, and
overriding it on the rows that should show the feature off.

## Checking against the live APIs

`bun run demo-data:compare` fetches a few live Hacker News items and reports
fields the live API returns that no demo item has, or whose type differs. It
only compares shapes; nothing live is saved.
