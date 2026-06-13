# Hugging Face Papers Daily Ingestion Issues

Source PRD: `docs/paper/prd.md`

## Proposed Breakdown

1. **Add Hugging Face Papers D1 schema** - AFK - blocked by none
2. **Add ingestion date, keyword, and response helpers** - AFK - blocked by none
3. **Add Hugging Face Daily Papers fetch client** - AFK - blocked by issue 2
4. **Add ingestion run lifecycle and scheduled worker hook** - AFK - blocked by issues 1 and 3
5. **Persist one idempotent daily paper ingestion end to end** - AFK - blocked by issue 4
6. **Serve paper editions and popular keywords from D1** - AFK - blocked by issue 5
7. **Render Hugging Face Papers from local data** - AFK - blocked by issue 6
8. **Harden ingestion failure behavior and verification** - AFK - blocked by issues 5, 6, and 7

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

## Issue 2: Add Ingestion Date, Keyword, And Response Helpers

## What to build

Add the pure helper layer for Hugging Face Papers ingestion: compute the previous India-local edition date, normalize keywords, and validate Hugging Face Daily Papers API responses before database writes happen.

## Acceptance criteria

- [ ] `src/server/huggingface-papers/edition-date.ts` computes the previous Asia/Kolkata local date in `YYYY-MM-DD` format without adding a date library.
- [ ] Keyword normalization trims, lowercases, and collapses internal whitespace.
- [ ] Hugging Face Daily Papers response validation rejects malformed payloads before persistence.
- [ ] Validation preserves enough typed data for organizations, papers, authors, keywords, and daily entry metadata required by the PRD.
- [ ] Focused tests cover the previous India date helper, keyword normalization, and response validation success/failure cases.
- [ ] `bun run test` passes for the new tests.

## Blocked by

None - can start immediately.

---

## Issue 3: Add Hugging Face Daily Papers Fetch Client

## What to build

Add a server-only fetch client for the Hugging Face Daily Papers API that requests one daily edition with `limit=100` and `sort=publishedAt`, sends the required headers, retries only retryable failures, and returns validated paper data.

## Acceptance criteria

- [ ] The client requests `https://huggingface.co/api/daily_papers?date={editionDate}&limit=100&sort=publishedAt`.
- [ ] Requests include `User-Agent: hackerfeed-web/1.0` and `Accept: application/json`.
- [ ] The retry policy uses at most three attempts with 1s then 3s backoff.
- [ ] Network errors, HTTP 429, and HTTP 5xx responses are retried.
- [ ] Other HTTP 4xx responses fail without retry.
- [ ] The client does not paginate beyond the first `limit=100` response.
- [ ] Unit tests cover retryable and non-retryable responses with mocked `fetch`.

## Blocked by

- Issue 2: Add ingestion date, keyword, and response helpers

---

## Issue 4: Add Ingestion Run Lifecycle And Scheduled Worker Hook

## What to build

Wire the Cloudflare scheduled event into the existing Worker and add ingestion run audit behavior. Each scheduled run should compute the previous India-local edition date, insert a `running` audit row, call the ingestion pipeline, and update the audit row to `success` or `failed`.

## Acceptance criteria

- [ ] `wrangler.jsonc` includes the cron trigger `30 23 * * *`.
- [ ] The Worker exports a Cloudflare `scheduled` handler that calls `ctx.waitUntil(runHuggingFaceDailyPapersIngestion(env.DB))`.
- [ ] No admin HTTP endpoint, secret-triggered route, or manual ingestion HTTP path is added.
- [ ] Each run inserts a `hf_ingestion_runs` row with `status = running`, `editionDate`, `startedAt`, `sourceUrl`, `limitValue = 100`, and `sortValue = publishedAt`.
- [ ] Successful runs set `status = success`, `finishedAt`, and processed counts.
- [ ] Failed runs set `status = failed`, `finishedAt`, and `errorMessage`.
- [ ] Multiple runs for the same `editionDate` are allowed.

## Blocked by

- Issue 1: Add Hugging Face Papers D1 schema
- Issue 3: Add Hugging Face Daily Papers fetch client

---

## Issue 5: Persist One Idempotent Daily Paper Ingestion End To End

## What to build

Implement the D1 repository and ingestion service that transforms one validated Hugging Face Daily Papers response into normalized database rows. A rerun for the same edition date should be safe and should update returned records without deleting missing daily entries.

## Acceptance criteria

- [ ] Organizations are upserted when present, excluding organization avatar URLs.
- [ ] Canonical papers are upserted by `arxivId`, excluding the fields listed as excluded in the PRD.
- [ ] Returned papers without an organization set `hf_papers.organizationId` to `null`.
- [ ] Authors are upserted by `hfAuthorId`, excluding `isPro`.
- [ ] Paper-author joins are reconciled with ordered positions starting at `1`.
- [ ] Paper keywords are reconciled with original and normalized values plus ordered positions starting at `1`.
- [ ] Daily paper entries are upserted by `(editionDate, paperId)` with ranks derived from returned array order starting at `1`.
- [ ] Reruns do not delete daily entries that are missing from the current response.
- [ ] Content writes use D1 batch or equivalent transaction-style execution so partial content ingestion is avoided.
- [ ] Ingestion counts are returned for papers, authors, organizations, and daily entries.

## Blocked by

- Issue 4: Add ingestion run lifecycle and scheduled worker hook

---

## Issue 6: Serve Paper Editions And Popular Keywords From D1

## What to build

Add the server read model for user-facing paper data. Reads should serve the most recent successful Hugging Face edition from D1, expose paper records in daily rank order, and compute popular keywords on read from daily entries and paper keywords.

## Acceptance criteria

- [ ] A server-only repository can read the most recent successful `hf_ingestion_runs.editionDate`.
- [ ] Paper edition reads join daily entries to canonical papers and return papers ordered by `rank`.
- [ ] Reads return the default summary text as `aiSummary` when present and `summary` otherwise.
- [ ] Reads include enough data for the UI to offer a "Show abstract" action when `aiSummary` differs from `summary`.
- [ ] Reads do not expose `aiSummaryModel`, organization display data, or submitter data to the initial UI.
- [ ] Popular keywords are computed on read from daily entries and paper keywords.
- [ ] Popular keywords are ranked by `paperCount DESC`, then `totalUpvotes DESC`, then `keyword ASC`.
- [ ] If the latest ingestion attempt failed, user-facing reads still serve the most recent successful edition.

## Blocked by

- Issue 5: Persist one idempotent daily paper ingestion end to end

---

## Issue 7: Render Hugging Face Papers From Local Data

## What to build

Update the user-facing feed experience so readers see Hugging Face Daily Papers served from the app database instead of live Hugging Face API calls. The UI should keep the first version focused on paper content and avoid exposing v1 non-goals.

## Acceptance criteria

- [ ] The feed route loads paper data through the app's server boundary rather than calling Hugging Face from browser-rendered code.
- [ ] Papers render in the stored daily edition rank order.
- [ ] Each paper shows the title, default summary text, upvotes, publication metadata needed by the design, and available external paper/project links.
- [ ] When an AI summary is shown, a "Show abstract" button replaces it with the original abstract for that paper.
- [ ] The initial UI does not show `aiSummaryModel`, organization, or submitter details.
- [ ] Empty, loading, and error states are handled for the paper feed.
- [ ] Existing backend boundaries are preserved: React code does not import D1 bindings, database client modules, or repositories directly.

## Blocked by

- Issue 6: Serve paper editions and popular keywords from D1

---

## Issue 8: Harden Ingestion Failure Behavior And Verification

## What to build

Finish the feature with focused regression coverage and operational checks around failure paths, idempotency, and the user-facing fallback to the latest successful edition.

## Acceptance criteria

- [ ] Tests verify a failed fetch, failed validation, or failed D1 write marks the ingestion run as `failed` with `finishedAt` and `errorMessage`.
- [ ] Tests verify rerunning the same edition does not create duplicate papers, duplicate author joins, duplicate keywords, or duplicate daily entries.
- [ ] Tests verify a failed latest ingestion does not prevent reads from returning the most recent successful edition.
- [ ] Tests verify keyword ranking tie-breaks by `paperCount`, `totalUpvotes`, and keyword text.
- [ ] Project documentation or developer notes describe how to run local migrations and how the scheduled ingestion is triggered in production.
- [ ] `bun run check` and `bun run test` pass.

## Blocked by

- Issue 5: Persist one idempotent daily paper ingestion end to end
- Issue 6: Serve paper editions and popular keywords from D1
- Issue 7: Render Hugging Face Papers from local data
