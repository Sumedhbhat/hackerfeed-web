# Hugging Face Papers Ingestion Questions

This document records the questions answered during planning for the Hugging Face Papers ingestion feature.

## Source And Schedule

### Does Hugging Face Papers have an API?

Yes. The relevant endpoint is:

```txt
GET https://huggingface.co/api/daily_papers
```

The app will use:

```txt
GET https://huggingface.co/api/daily_papers?date={editionDate}&limit=100&sort=publishedAt
```

### Why ingest papers into our database instead of calling Hugging Face from the UI?

To avoid hitting Hugging Face rate limits from user traffic. The app should fetch the daily papers once, persist them, and serve users from the local database.

### When should the job run?

The ingestion job should run every day at 5 AM India time.

Cloudflare cron uses UTC, so the cron expression is:

```txt
30 23 * * *
```

### Which date should the job fetch?

The job should fetch the previous India-local date.

Example:

```txt
Worker instant: 2026-06-12T23:30:00.000Z
India local time: 2026-06-13 05:00 IST
editionDate to fetch: 2026-06-12
```

### Why fetch the previous India date?

Because the current day may still be forming. Fetching yesterday avoids needing to infer whether the current Hugging Face Daily Papers edition is complete.

### Should there be a second reconciliation job later in the morning?

No. A single daily job is enough because it fetches the previous day.

### Should the app use `sort=trending`?

No. The public `huggingface.co/papers` page was verified against the API. The page order matches:

```txt
sort=publishedAt
```

with `limit=100`, not `sort=trending`.

### Why not sort ourselves by upvotes?

The goal is to match the public Hugging Face Papers page. Upvotes correlate with that order, but ties and hidden ranking rules could diverge. The app should preserve Hugging Face's returned array order as `rank`.

### Should `rank` start at 1?

Yes. `rank = array index + 1`, matching the human-facing page position.

### Is one page enough?

Yes. The job should request `limit=100` and not paginate. If Hugging Face returns more than 100 papers, v1 intentionally stores only the first 100.

### Should the Hugging Face base URL be configurable?

No. Hardcode it in the ingestion module:

```txt
https://huggingface.co/api/daily_papers
```

### Should the request include a custom `User-Agent`?

Yes. The request should identify itself:

```txt
User-Agent: hackerfeed-web/1.0
Accept: application/json
```

### Should the fetch retry?

Yes. Use a small retry policy:

```txt
maxAttempts = 3
backoff = 1s, then 3s
retry network errors, HTTP 429, and HTTP 5xx
do not retry other HTTP 4xx responses
```

### Should failed attempts be stored individually?

No. Persist only the final failure message on the ingestion run.

### Should failed HTTP status codes be stored separately?

No. `errorMessage` is enough for v1.

## Runtime And Database Access

### Where should the scheduled job run?

In the same Cloudflare Worker as the app.

### Should there be an admin HTTP endpoint to trigger ingestion?

No. There should be no admin ingestion endpoint, no secret-triggered HTTP path, and no "inject" route.

### How should the scheduled job access the database?

The scheduled handler should write directly through the Cloudflare D1 `DB` binding.

### Are we using Prisma?

No. Prisma was removed from the current repo.

### Are we using Drizzle?

Yes. Drizzle defines the database schema, generates SQL migrations, and provides
the query API for backend repositories. The Worker converts its D1 binding into a
typed Drizzle context before passing it through tRPC and service boundaries.

### Should this feature introduce Drizzle?

Yes. Use Drizzle for the Hugging Face schema and repository work. Wrangler still
applies the generated migrations so local and production migration execution
remain consistent with the existing deployment workflow.

### Should the job use `ctx.waitUntil(...)`?

Yes. The scheduled handler should use the normal Cloudflare scheduled-worker pattern:

```ts
scheduled(controller, env, ctx) {
  ctx.waitUntil(runHuggingFaceDailyPapersIngestion(env.DB));
}
```

### Should all content writes be all-or-nothing?

Yes. Use D1 batch or transaction-style execution for the content writes. If that requires extending the local D1 binding type, do so.

### How should ingestion run audit rows work with transactions?

The run audit should survive failures, while content writes should avoid partial ingestion.

Flow:

```txt
insert hf_ingestion_runs(status = running)
fetch HF
validate response
execute batched content writes
update run to success
```

On fetch, validation, or write failure:

```txt
update run to failed with errorMessage and finishedAt
```

### Should stale `running` rows be cleaned up automatically?

No. Stale `running` rows can indicate crashes or timeouts. No cleanup logic in v1.

## Data Model

### Should there be one canonical paper row?

Yes. `hf_papers` has one canonical row per Hugging Face paper / arXiv ID.

### Should daily appearances be separate from papers?

Yes. `hf_daily_paper_entries` records each appearance in a daily edition.

Uniqueness:

```txt
hf_papers.arxivId unique
hf_daily_paper_entries unique(editionDate, paperId)
```

### What happens if the same paper appears in multiple daily editions?

Keep one canonical `hf_papers` row and one `hf_daily_paper_entries` row per `(editionDate, paperId)`.

### Should papers that are not returned by a later ingestion be updated?

No. Only update papers that appear in the current ingestion response.

### Should missing daily entries be deleted on rerun?

No. Ingestion should upsert returned entries only. Do not delete missing daily entries.

### Should title and summary be duplicated on daily entries?

No. Store title and summary only on `hf_papers`.

### Should upvotes be stored on daily entries?

No. Store `upvotes` only on `hf_papers`.

### Should `discussionId` be stored?

Yes. Store it on `hf_papers`.

### Should `projectPage` and `githubRepo` use a link table?

No. Store them as nullable string columns on `hf_papers`.

### Should `githubRepoAddedBy` be stored?

No.

### Should `githubStars` be stored?

No.

### Should `withdrawnAt` be stored?

Yes. Store it as nullable on `hf_papers`.

### Should thumbnails be stored?

Yes, as `thumbnailUrl` on `hf_papers`.

The observed thumbnail is a URL derived from paper ID:

```txt
https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/{paperId}.png
```

There was no evidence that it changes per daily entry.

### Should raw Hugging Face JSON be stored?

No. Do not store raw paper JSON or raw entry JSON.

### Should media URLs be stored?

No.

### Should comment counts be stored?

No.

### Should submitter data be stored?

No. Do not store `submittedBy`, `submittedOnDailyBy`, `submittedByUserId`, or a submitter/user table.

### Should `submittedOnDailyAt` be stored?

No. Keep:

```txt
hf_papers.paperPublishedAt
hf_daily_paper_entries.entryPublishedAt
hf_daily_paper_entries.editionDate
hf_ingestion_runs.startedAt
hf_ingestion_runs.finishedAt
```

### Should `isAuthorParticipating` be stored?

Yes. Store it on `hf_daily_paper_entries`.

### Should organization data be stored?

Yes. Store organizations in a separate table and reference them from papers.

### Should organization avatars be stored?

No.

### Should authors be stored in a separate table?

Yes. Do not store authors as JSON.

### Does Hugging Face return author IDs?

Yes. The OpenAPI marks author `_id` as required, and sampled responses had author `_id` even when no Hugging Face user account was linked.

### Should author avatars be stored?

Yes.

### Should author `isPro` be stored?

No.

### Should hidden authors be stored and linked?

Yes. Preserve hidden authors and their order. UI can decide later whether to display them.

### Should authors be updated when a paper reappears?

Yes. For returned papers, upsert authors by `hfAuthorId` and update mutable fields.

### Should stale paper-author joins be removed when a returned paper's author list changes?

Yes. Reconcile author joins for returned papers only.

### Should author positions start at 1?

Yes.

### Should keywords be stored?

Yes. Store `ai_keywords` in a separate table.

### Should keyword stats have a separate derived table?

No for v1. Compute popular keywords on read by joining daily entries and paper keywords.

### How should popular keywords be ranked?

Use:

```txt
paperCount DESC
totalUpvotes DESC
keyword ASC
```

### How should keywords be normalized?

Use conservative normalization:

```txt
trim
lowercase
collapse internal whitespace
```

No stemming, synonym mapping, or singular/plural merging.

### Should keywords be updated when a paper reappears?

Yes. For returned papers, upsert current keywords and delete stale keywords for that paper.

### Should keyword positions start at 1?

Yes.

### Should `ai_summary` and `summary` both be stored?

Yes. Store both separately:

```txt
summary
aiSummary
aiSummaryModel
```

### What is `aiSummaryModel`?

It is the model Hugging Face used to generate the AI summary. Sampled responses showed:

```txt
Qwen/Qwen2.5-Coder-32B-Instruct
```

Store it but do not show it in the UI.

## UI Decisions

### Which summary should be shown first?

Show `aiSummary` first if present. Otherwise fall back to `summary`.

### How should users see the abstract?

Show a "Show abstract" button. Clicking it replaces the displayed AI summary with the original abstract.

Optionally, a second click can switch back to "Show AI summary" later.

### Should organization be shown?

Not initially. Store it in the database but do not show it.

### Should `aiSummaryModel` be shown?

No. Store it as provenance only.

## Ingestion Runs

### Should duplicate runs for the same edition date be allowed?

Yes. Allow multiple `hf_ingestion_runs` rows for the same `editionDate`. Domain tables remain idempotent through unique constraints and upserts.

### Should the ingestion run row be inserted before the fetch starts?

Yes. Insert `running` before fetch and validation so failed fetches and malformed responses are recorded.

### What counts should ingestion runs store?

Keep simple counts:

```txt
fetchedCount
upsertedPaperCount
upsertedAuthorCount
upsertedOrganizationCount
upsertedDailyEntryCount
```

### Should keyword and paper-author reconciliation counts be tracked?

No.

### Should `editionDate` be a date or timestamp?

Prefer a date-only value if D1/schema handling is clean. It represents a calendar edition, not an instant. If date-only is awkward, use a `YYYY-MM-DD` string.

## Tests

### How should previous India date be computed?

Use built-in JavaScript date/time APIs. Do not add a date library.

Create a small helper:

```txt
src/server/huggingface-papers/edition-date.ts
```

with tests:

```txt
src/server/huggingface-papers/edition-date.test.ts
```

### What should v1 tests cover?

Add focused tests for:

```txt
previous India date helper
HF response validation/schema
keyword normalization
```

Do not add full D1 integration tests in v1 unless they become cheap during implementation.
