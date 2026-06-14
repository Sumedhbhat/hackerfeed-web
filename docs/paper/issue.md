# Hugging Face Papers Daily Ingestion Issues

Source PRD: `docs/paper/prd.md`

## Proposed Breakdown

1. **Add Hugging Face Papers D1 schema** - AFK - blocked by none
2. **Fetch and validate one Hugging Face Daily Papers edition** - AFK - blocked by none
3. **Run one idempotent scheduled daily paper ingestion** - AFK - blocked by issues 1 and 2
4. **Serve and render the latest successful paper edition** - AFK - blocked by issue 3

---

## Issue 1: Add Hugging Face Papers D1 Schema

## What to build

Add the Cloudflare D1 migration for the Hugging Face Papers domain model so the app can store canonical papers separately from their daily edition appearances. The schema should support organizations, papers, authors, paper-author ordering, normalized paper keywords, daily paper entries, and ingestion run audit rows.

## Acceptance criteria

- [ ] A new migration creates `hf_organizations`, `hf_papers`, `hf_authors`, `hf_paper_authors`, `hf_paper_keywords`, `hf_daily_paper_entries`, and `hf_ingestion_runs`.
- [ ] The migration matches the PRD column names, uniqueness constraints, foreign keys, and indexes.
- [ ] `hf_daily_paper_entries` enforces one entry per `(editionDate, paperId)` and one rank per edition date.
- [ ] `hf_paper_authors` and `hf_paper_keywords` preserve positions starting at `1`.
- [ ] The local D1 binding type supports the D1 operations needed for batched or transaction-style ingestion writes.
- [ ] `bun run check` passes after the schema and type changes.

## Blocked by

None - can start immediately.

---

## Issue 2: Fetch And Validate One Hugging Face Daily Papers Edition

## What to build

Add the server-only fetch and validation path for one Hugging Face Daily Papers edition. The slice should compute the previous India-local edition date, request the first 100 papers from Hugging Face with the required headers, retry only retryable failures, normalize keywords, validate the response shape, and return typed data that is ready for ingestion.

## Acceptance criteria

- [ ] The previous Asia/Kolkata local date is computed in `YYYY-MM-DD` format without adding a date library.
- [ ] The client requests `https://huggingface.co/api/daily_papers?date={editionDate}&limit=100&sort=publishedAt`.
- [ ] Requests include `User-Agent: hackerfeed-web/1.0` and `Accept: application/json`.
- [ ] The retry policy uses at most three attempts with 1s then 3s backoff.
- [ ] Network errors, HTTP 429, and HTTP 5xx responses are retried.
- [ ] Other HTTP 4xx responses fail without retry.
- [ ] The client does not paginate beyond the first `limit=100` response.
- [ ] Keyword normalization trims, lowercases, and collapses internal whitespace.
- [ ] Hugging Face Daily Papers response validation rejects malformed payloads before persistence.
- [ ] Validation preserves enough typed data for organizations, papers, authors, keywords, and daily entry metadata required by the PRD.
- [ ] Focused tests cover edition date calculation, keyword normalization, validation success and failure, retryable responses, and non-retryable responses.
- [ ] `bun run test` passes for the new tests.

## Blocked by

None - can start immediately.

---

## Issue 3: Run One Idempotent Scheduled Daily Paper Ingestion

## What to build

Wire the Cloudflare scheduled event into the existing Worker and implement the ingestion service that turns one validated Hugging Face Daily Papers response into normalized D1 rows. Each scheduled run should insert a running audit row, fetch and validate the edition, persist content idempotently, and update the audit row to success or failed.

## Acceptance criteria

- [ ] `wrangler.jsonc` includes the cron trigger `30 23 * * *`.
- [ ] The Worker exports a Cloudflare `scheduled` handler that calls `ctx.waitUntil(runHuggingFaceDailyPapersIngestion(env.DB))`.
- [ ] No admin HTTP endpoint, secret-triggered route, or manual ingestion HTTP path is added.
- [ ] Each run inserts a `hf_ingestion_runs` row with `status = running`, `editionDate`, `startedAt`, `sourceUrl`, `limitValue = 100`, and `sortValue = publishedAt`.
- [ ] Organizations are upserted when present, excluding organization avatar URLs.
- [ ] Canonical papers are upserted by `arxivId`, excluding the fields listed as excluded in the PRD.
- [ ] Returned papers without an organization set `hf_papers.organizationId` to `null`.
- [ ] Authors are upserted by `hfAuthorId`, excluding `isPro`.
- [ ] Paper-author joins are reconciled with ordered positions starting at `1`.
- [ ] Paper keywords are reconciled with original and normalized values plus ordered positions starting at `1`.
- [ ] Daily paper entries are upserted by `(editionDate, paperId)` with ranks derived from returned array order starting at `1`.
- [ ] Reruns do not delete daily entries that are missing from the current response.
- [ ] Reruns do not create duplicate papers, duplicate author joins, duplicate keywords, or duplicate daily entries.
- [ ] Content writes use D1 batch or equivalent transaction-style execution so partial content ingestion is avoided.
- [ ] Successful runs set `status = success`, `finishedAt`, and processed counts.
- [ ] Failed fetch, validation, or D1 write attempts set `status = failed`, `finishedAt`, and `errorMessage`.
- [ ] Multiple runs for the same `editionDate` are allowed.
- [ ] Ingestion counts are returned for papers, authors, organizations, and daily entries.
- [ ] Project documentation or developer notes describe how to run local migrations and how the scheduled ingestion is triggered in production.
- [ ] `bun run check` and `bun run test` pass.

## Blocked by

- Issue 1: Add Hugging Face Papers D1 schema
- Issue 2: Fetch and validate one Hugging Face Daily Papers edition

---

## Issue 4: Serve And Render The Latest Successful Paper Edition

## What to build

Update the user-facing feed experience so readers see Hugging Face Daily Papers served from the app database instead of live Hugging Face API calls. The slice should read the most recent successful edition from D1, compute popular keywords on read, and render the paper feed through the app's existing server boundary.

## Acceptance criteria

- [ ] A server-only repository can read the most recent successful `hf_ingestion_runs.editionDate`.
- [ ] If the latest ingestion attempt failed, user-facing reads still serve the most recent successful edition.
- [ ] Paper edition reads join daily entries to canonical papers and return papers ordered by `rank`.
- [ ] Reads return the default summary text as `aiSummary` when present and `summary` otherwise.
- [ ] Reads include enough data for the UI to offer a "Show abstract" action when `aiSummary` differs from `summary`.
- [ ] Reads do not expose `aiSummaryModel`, organization display data, or submitter data to the initial UI.
- [ ] Popular keywords are computed on read from daily entries and paper keywords.
- [ ] Popular keywords are ranked by `paperCount DESC`, then `totalUpvotes DESC`, then `keyword ASC`.
- [ ] The feed route loads paper data through the app's server boundary rather than calling Hugging Face from browser-rendered code.
- [ ] Papers render in the stored daily edition rank order.
- [ ] Each paper shows the title, default summary text, upvotes, publication metadata needed by the design, and available external paper/project links.
- [ ] When an AI summary is shown, a "Show abstract" button replaces it with the original abstract for that paper.
- [ ] The initial UI does not show `aiSummaryModel`, organization, or submitter details.
- [ ] Empty, loading, and error states are handled for the paper feed.
- [ ] Existing backend boundaries are preserved: React code does not import D1 bindings, database client modules, or repositories directly.
- [ ] Tests verify the latest-failed-ingestion fallback and keyword ranking tie-breaks.
- [ ] `bun run check` and `bun run test` pass.

## Blocked by

- Issue 3: Run one idempotent scheduled daily paper ingestion
