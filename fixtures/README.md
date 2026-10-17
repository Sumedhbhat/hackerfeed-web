# Demo data

Dummy data that previews show instead of anything real. Nothing here comes
from production, Hacker News or Hugging Face.

- `database/<table>.json`: every row of every D1 table, one file per table.
  Keys are the column names in `src/server/database/schema.ts`.
- `hacker-news/items.json` and `feeds.json`: stories, comments and feed
  orderings, in the Hacker News API's response shape. Preview builds
  (`VITE_DEMO_DATA=true`) answer Hacker News requests from these files
  (`src/lib/hacker-news/demo-api.ts`).

## Where it is used

- **Cloudflare PR previews** (`.github/workflows/preview.yaml`): each push
  applies the PR's migrations to the PR's database, then replaces every row
  with `database/`. The Hacker News files are built into the preview.
- **Private preview** (`bun run preview:private`): the same, on a local
  database. See `docs/private-preview.md`.

Production builds never include these files; `build.yaml` and `deploy.yaml`
fail if they do.

## The demo user

Rows for the `demo-user` app user are copied to anyone who signs in to a
preview, so a new account starts with favorites, saved papers and history. Give
every per-user table at least one `demo-user` row.

## When the schema changes

`bun run test` checks the fixtures against the Drizzle schema and the
migrations (`src/demo-data/fixtures.test.ts`). It fails, naming the file, row
and column, when:

- a column is added and some row lacks it (use `null` only if the column is
  nullable),
- a value has the wrong type, is not one of an enum's values, or is not a
  date in a `...At` / `...Date` column,
- a row references a row that does not exist,
- a table has no fixture file,
- the rows cannot be loaded into a database built from `migrations/`,
- the Hacker News items and the stored `stories.json` copies disagree.

So adding a column means adding it to every row of that table's file, with a
value that shows the feature off.

## Checking against the live APIs

`bun run demo-data:compare` fetches a few live Hacker News items and reports
fields the live API returns that no fixture has, or whose type differs. It only
compares shapes; nothing live is saved.
