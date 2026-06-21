# Hugging Face Papers Daily Ingestion PRD

## Overview

HackerFeed should ingest Hugging Face Daily Papers once per day into Cloudflare D1, then serve paper data from its own database. This avoids issuing Hugging Face API requests from user-facing page loads and gives the app stable local data for papers, authors, organizations, keywords, and daily edition rankings.

## Goals

- Run a daily scheduled ingestion at 5 AM Asia/Kolkata.
- Fetch the previous India-local Hugging Face Daily Papers edition.
- Store the first 100 papers in the order shown on `huggingface.co/papers`.
- Preserve canonical paper records separately from daily edition appearances.
- Store authors, organizations, and keywords as relational data, not JSON blobs.
- Use the existing Cloudflare Worker and D1 database binding.
- Keep ingestion idempotent so reruns for the same date are safe.
- Track ingestion runs with simple operational status and counts.

## Non-Goals

- No admin HTTP endpoint for ingestion.
- No secret-triggered manual inject route.
- No Prisma.
- No raw Hugging Face JSON persistence.
- No pagination beyond the first `limit=100` response.
- No derived daily keyword stats table in v1.
- No user-facing organization display in v1.
- No full D1 integration test requirement in v1.

## Users And Use Cases

### Reader

As a reader, I want to see Hugging Face Daily Papers without the app depending on live Hugging Face API calls during my page load.

### Operator

As the app operator, I want to know whether the daily ingestion succeeded or failed, and how many records it processed.

### Future Product Work

As a future feature builder, I want normalized papers, authors, organizations, and keywords so the app can add topic filters, author displays, organization filters, and paper pages without backfilling from raw JSON.

## External API

Use Hugging Face Daily Papers:

```txt
GET https://huggingface.co/api/daily_papers?date={editionDate}&limit=100&sort=publishedAt
```

Request headers:

```txt
User-Agent: hackerfeed-web/1.0
Accept: application/json
```

The `editionDate` is the previous India-local date in `YYYY-MM-DD` format.

## Schedule

Cloudflare cron:

```jsonc
"triggers": {
  "crons": ["30 23 * * *"]
}
```

This runs at 23:30 UTC, which corresponds to 5 AM Asia/Kolkata.

## Runtime Architecture

The scheduled job lives in the same Cloudflare Worker as the app.

High-level flow:

```txt
Cloudflare scheduled event
  -> ctx.waitUntil(runHuggingFaceDailyPapersIngestion(env.DB))
  -> compute previous India-local edition date
  -> insert ingestion run with status=running
  -> fetch Hugging Face Daily Papers with retries
  -> validate response
  -> batch D1 content writes
  -> update ingestion run to success or failed
```

There is no HTTP route for triggering ingestion.

## Data Model

### `hf_organizations`

Stores Hugging Face organization metadata attached to papers.

```txt
id TEXT PRIMARY KEY
hfOrganizationId TEXT NOT NULL UNIQUE
name TEXT NOT NULL
fullname TEXT
createdAt TEXT NOT NULL
updatedAt TEXT NOT NULL
```

Do not store organization avatar URLs.

### `hf_papers`

Stores one canonical row per Hugging Face paper / arXiv ID.

```txt
id TEXT PRIMARY KEY
arxivId TEXT NOT NULL UNIQUE
organizationId TEXT REFERENCES hf_organizations(id)
title TEXT NOT NULL
summary TEXT NOT NULL
aiSummary TEXT
aiSummaryModel TEXT
paperPublishedAt TEXT NOT NULL
upvotes INTEGER NOT NULL DEFAULT 0
discussionId TEXT NOT NULL
projectPage TEXT
githubRepo TEXT
thumbnailUrl TEXT
withdrawnAt TEXT
createdAt TEXT NOT NULL
updatedAt TEXT NOT NULL
```

Excluded fields:

```txt
rawPaperJson
githubStars
githubRepoAddedBy
submittedBy
submittedOnDailyBy
submittedOnDailyAt
mediaUrls
numComments
```

### `hf_authors`

Stores Hugging Face paper authors.

```txt
id TEXT PRIMARY KEY
hfAuthorId TEXT NOT NULL UNIQUE
name TEXT NOT NULL
hidden INTEGER NOT NULL DEFAULT 0
status TEXT
statusLastChangedAt TEXT
hfUserId TEXT
hfUsername TEXT
hfFullname TEXT
avatarUrl TEXT
createdAt TEXT NOT NULL
updatedAt TEXT NOT NULL
```

Do not store `isPro`.

### `hf_paper_authors`

Stores ordered paper-author relationships.

```txt
id TEXT PRIMARY KEY
paperId TEXT NOT NULL REFERENCES hf_papers(id) ON DELETE CASCADE
authorId TEXT NOT NULL REFERENCES hf_authors(id) ON DELETE CASCADE
position INTEGER NOT NULL
createdAt TEXT NOT NULL
updatedAt TEXT NOT NULL
UNIQUE (paperId, authorId)
UNIQUE (paperId, position)
```

Positions start at `1`.

### `hf_paper_keywords`

Stores normalized AI keywords per paper.

```txt
id TEXT PRIMARY KEY
paperId TEXT NOT NULL REFERENCES hf_papers(id) ON DELETE CASCADE
keywordOriginal TEXT NOT NULL
keywordNormalized TEXT NOT NULL
position INTEGER NOT NULL
createdAt TEXT NOT NULL
updatedAt TEXT NOT NULL
UNIQUE (paperId, keywordNormalized)
UNIQUE (paperId, position)
```

Indexes:

```txt
index(keywordNormalized)
index(paperId)
```

Keyword normalization:

```txt
trim
lowercase
collapse internal whitespace
```

### `hf_daily_paper_entries`

Stores one paper appearance in one Hugging Face Daily Papers edition.

```txt
id TEXT PRIMARY KEY
editionDate TEXT NOT NULL
paperId TEXT NOT NULL REFERENCES hf_papers(id) ON DELETE CASCADE
entryPublishedAt TEXT NOT NULL
isAuthorParticipating INTEGER NOT NULL DEFAULT 0
rank INTEGER NOT NULL
createdAt TEXT NOT NULL
updatedAt TEXT NOT NULL
UNIQUE (editionDate, paperId)
UNIQUE (editionDate, rank)
```

Indexes:

```txt
index(editionDate, rank)
index(paperId)
```

Rank starts at `1` and means the paper position in the `limit=100&sort=publishedAt` response.

Do not store duplicated title, summary, thumbnail, upvotes snapshot, comments, media URLs, submitter data, or raw entry JSON on daily entries.

### `hf_ingestion_runs`

Stores one audit row per ingestion attempt.

```txt
id TEXT PRIMARY KEY
editionDate TEXT NOT NULL
status TEXT NOT NULL
startedAt TEXT NOT NULL
finishedAt TEXT
sourceUrl TEXT NOT NULL
limitValue INTEGER NOT NULL
sortValue TEXT NOT NULL
fetchedCount INTEGER
upsertedPaperCount INTEGER
upsertedAuthorCount INTEGER
upsertedOrganizationCount INTEGER
upsertedDailyEntryCount INTEGER
errorMessage TEXT
createdAt TEXT NOT NULL
updatedAt TEXT NOT NULL
```

Allowed statuses:

```txt
running
success
failed
```

Multiple runs for the same `editionDate` are allowed.

## Ingestion Behavior

For each returned daily paper item:

1. Upsert organization if present.
2. Upsert canonical paper by `arxivId`.
3. Upsert authors by `hfAuthorId`.
4. Reconcile the returned paper's author joins and positions.
5. Reconcile the returned paper's keywords and positions.
6. Upsert daily paper entry by `(editionDate, paperId)`.

For papers not returned by the current ingestion:

```txt
do nothing
```

For daily entries missing on rerun:

```txt
do not delete
```

For returned papers whose organization is missing:

```txt
set hf_papers.organizationId = null
```

## Error Handling

Fetch retry policy:

```txt
maxAttempts = 3
backoff = 1s, then 3s
retry network errors, HTTP 429, and HTTP 5xx
do not retry other HTTP 4xx responses
```

If fetch, validation, or D1 writes fail:

```txt
mark hf_ingestion_runs.status = failed
set finishedAt
set errorMessage
serve the most recent successful edition in user-facing reads
```

Do not persist per-attempt retry rows or separate HTTP status fields in v1.

## UI Requirements

Default paper summary behavior:

```txt
show aiSummary if present
otherwise show summary
```

A "Show abstract" button should replace the displayed AI summary with the original abstract.

Do not show:

```txt
aiSummaryModel
organization
submitter
```

in the initial UI.

## Keyword Queries

Popular keywords for a day should be computed on read from daily entries and paper keywords.

Ranking:

```txt
paperCount DESC
totalUpvotes DESC
keyword ASC
```

No `hf_daily_keyword_stats` table in v1.

## Tests

Add focused tests for:

```txt
previous India date helper
Hugging Face response validation/schema
keyword normalization
```

The previous India date helper should live under:

```txt
src/server/huggingface-papers/edition-date.ts
```

No date library should be added.

## Open Implementation Notes

- The shared database client uses Cloudflare's official D1 binding type, including
  `batch()` for transaction-style ingestion writes.
- The D1 schema uses text timestamps because existing migrations use text timestamp fields.
- Define the schema and generate migrations with Drizzle. Wrangler remains
  responsible for applying the generated SQL migrations to D1.
- Backend repositories receive the shared Drizzle `DatabaseContext`. Only the
  Worker composition boundary accesses the raw D1 binding.
