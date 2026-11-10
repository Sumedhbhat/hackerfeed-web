# Demo data

What previews show: a snapshot of real public data, so the UI is judged on
what readers actually see. Nothing here comes from production (no user data);
the content is public Hacker News and Hugging Face data.

- `snapshot/hacker-news.json`: the first 20 top, new and best stories, with a
  sample of each top story's comments (up to 4 top-level comments and 2
  replies each). `descendants` is Hacker News's real count, so a story can
  show more comments than the snapshot holds.
- `snapshot/papers.json`: one day's 20 most upvoted Hugging Face daily papers,
  validated with production ingestion's own validator
  (`packages/backend/src/huggingface-papers/schema.ts`), keeping what the app
  shows: titles, summaries, AI summaries, author names, organizations and
  keywords.
- `hacker-news.ts` serves the Hacker News snapshot in the API's response
  shape; preview builds (`VITE_DEMO_DATA=true`) answer Hacker News requests
  from it (`src/lib/hacker-news/demo-api.ts`).
- `database/<table>.ts`: every row of every D1 table, typed from
  `packages/backend/src/database/schema.ts` and built from the snapshots
  (papers, authors, organizations, keywords, the day's edition) plus the demo
  reader's own rows (saved stories and papers, activity). `database/index.ts`
  lists them all. `defaults.ts` dates everything on the snapshot's edition day.

## Refreshing

`bun run demo-data:refresh` (from `apps/web`) fetches the live APIs and
rewrites both snapshot files. Commit the result; previews then show it.

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

Only `dist/client` is uploaded, as an undeployed version of `hackerfeed-web`
using `wrangler.preview.jsonc`. Its SPA
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

So adding a column usually means mapping it in that table's builder (from the
snapshot where the data has it, otherwise a default), and refreshing the
snapshot if ingestion now stores a new Hugging Face field.

## Checking against the live APIs

`bun run demo-data:compare` fetches a few live Hacker News items and reports
fields the live API returns that no demo item has, or whose type differs.
