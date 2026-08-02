# Story and paper view activity plan

## Status

Proposed implementation plan. This document describes functionality that is not
yet implemented.

## Goal

Persist a durable activity record whenever a signed-in HackerFeed user clicks
the primary link that opens a Hacker News story or a Hugging Face paper.

View tracking is observational only. It must never delay, block, or change the
content-opening behavior.

## Decisions

- Track signed-in users only. Do not create anonymous-user or anonymous-session
  activity.
- A story view occurs when the user clicks the story title or the primary
  `Read article`/`Open post` action.
- A paper view occurs when the user clicks the paper title that opens the paper.
- Do not count card rendering, prefetching, scrolling, feed loading, abstract
  expansion, discussion links, project links, code links, or favorite actions.
- Insert a new view row for every qualifying click, including repeated clicks by
  the same user on the same content.
- Retain view rows indefinitely. Do not add a cleanup or archival job.
- Store activity in D1 only. Do not add an admin screen, read API, dashboard,
  metric, trace, log export, or report in this phase.
- Do not store route templates, trace IDs, request IDs, email addresses, WorkOS
  identifiers, or browser/session metadata in view rows.
- Favorites and future favorite-history tables are outside this plan.
- View tables are append-only and do not use period start/end columns or history
  tables.

## Data model

Add two tables rather than one polymorphic activity table. This preserves
database-enforced foreign keys to the existing story and paper tables.

### `story_views`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | text UUID | Primary key generated automatically by the table's `uuidPrimaryKey()` default during insertion |
| `appUserId` | text | Required foreign key to `app_users.id`; no cascading delete |
| `storyId` | text | Required foreign key to `stories.id`; no cascading delete |
| `viewedAt` | text timestamp | Required; database-generated UTC insertion time |
| `lastUpdatedDate` | text timestamp | Required; database-generated UTC insertion time |
| `lastUpdatedBy` | text | Required internal `app_users.id` value; deliberately not a foreign key |

Add indexes on `(appUserId, viewedAt, id)` and `(storyId, viewedAt, id)` to
support future user timelines and per-story analysis without changing the
schema.

### `paper_views`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | text UUID | Primary key generated automatically by the table's `uuidPrimaryKey()` default during insertion |
| `appUserId` | text | Required foreign key to `app_users.id`; no cascading delete |
| `paperId` | text | Required foreign key to `hf_papers.id`; no cascading delete |
| `viewedAt` | text timestamp | Required; database-generated UTC insertion time |
| `lastUpdatedDate` | text timestamp | Required; database-generated UTC insertion time |
| `lastUpdatedBy` | text | Required internal `app_users.id` value; deliberately not a foreign key |

Add indexes on `(appUserId, viewedAt, id)` and `(paperId, viewedAt, id)`.

`viewedAt` is the business timestamp for the click. `lastUpdatedDate` is the
standard audit timestamp. They receive the same database time on insertion.
`lastUpdatedBy` receives the authenticated user's internal app-user ID. The
server must derive both user fields from the authenticated session; it must not
accept either value from the browser.

Do not add a uniqueness constraint involving the user and content IDs. Repeated
clicks are separate views. Each insert omits `id`, allowing the schema's existing
`uuidPrimaryKey()` default to generate a new primary key automatically.

## Write boundary

Expose authenticated write-only tRPC mutations for recording a story view and a
paper view. Do not add list or reporting procedures.

The browser does not generate or supply the view ID. The mutation input, service,
and repository caller also omit it. The table's `uuidPrimaryKey()` default
generates the UUID as part of insertion. Because a retry could create a second
row after an ambiguous network failure, view mutations must not retry
automatically. Tracking is deliberately best-effort.

The server must:

1. Require a valid signed-in session.
2. Resolve or create the existing internal `app_users` row using the established
   user service.
3. Ignore any browser-supplied user or audit identity.
4. Omit the view ID so the table's primary-key default generates it, and generate
   `viewedAt` and `lastUpdatedDate` in D1 rather than trusting the browser.
5. Insert the view with the authenticated internal user ID in both `appUserId`
   and `lastUpdatedBy`.

## Story click flow

Feed stories are fetched from Hacker News and may not yet exist in the local
`stories` table. The story-view mutation therefore accepts the validated story
snapshot already available to the card, but no view UUID.

In one database transaction:

1. Upsert the story using its unique Hacker News story ID and the existing story
   persistence mapping.
2. Resolve the local `stories.id`.
3. Insert the `story_views` row without an ID so its primary-key default
   generates the UUID.

The upsert ensures that every view has a valid story foreign key. Reuse the
existing story persistence behavior used by favorites instead of introducing a
second mapping of Hacker News fields.

## Paper click flow

Papers displayed by HackerFeed are read from `hf_papers`, so the paper-view
mutation accepts only the stable arXiv ID already available to the paper row.

The server resolves the matching local paper and inserts `paper_views`. If the
paper does not exist, the tracking mutation fails silently from the user's
perspective; it must not create an incomplete paper record or interfere with
opening the external paper.

## Browser behavior

Attach tracking only to the primary content-opening controls:

- Story title and `Read article`/`Open post` actions.
- Paper title link.

When the user is signed in:

1. Start the appropriate mutation without awaiting it and with automatic retry
   disabled.
2. Open or navigate to the external content immediately using the existing
   behavior.
3. Suppress tracking errors from the UI.

When the user is signed out, open the content normally and do not call the view
mutation.

The browser must not call `preventDefault` merely to wait for tracking. Story
popup creation must remain in the synchronous click handler so popup blockers
do not mistake it for an unsolicited window.

## Failure and deletion behavior

- A tracking failure never prevents the external page from opening.
- Story persistence and story-view insertion succeed or fail together.
- The browser sends at most one tracking mutation for each click. An uncertain
  or failed write is not retried because the backend-generated UUID cannot make
  a second request idempotent.
- A later click invokes a new write and therefore creates a new view row.
- Foreign keys do not cascade. A referenced app user, story, or paper cannot be
  deleted while view rows refer to it. Any future deletion/privacy workflow must
  make an explicit policy decision rather than silently erasing activity.
- No background reconciliation, cleanup, or retention process is included.

## Implementation sequence

1. Add the two Drizzle table definitions, restrictive foreign keys, timestamp
   defaults, and indexes.
2. Generate and inspect the D1 migration.
3. Add repository methods that omit the ID and insert story and paper views,
   allowing the primary-key default to generate each UUID.
4. Add a view-activity service that resolves the authenticated app user, reuses
   existing story persistence, resolves papers, and owns the transactions.
5. Add validated, authenticated, write-only tRPC mutations.
6. Add a small browser hook/helper that dispatches the correct mutation once and
   never exposes an error to the reader.
7. Wire the helper to only the qualifying story and paper click controls.
8. Add focused schema, repository, service, router, and browser tests.

## Verification

The implementation is complete when the following scenarios pass:

1. A signed-out story or paper click opens the target and writes no activity.
2. A signed-in story title click opens the target and creates one `story_views`
   row.
3. A signed-in primary story action creates the same kind of view row.
4. Viewing a story that is absent from `stories` saves the story and its view in
   one transaction.
5. A signed-in paper-title click creates one `paper_views` row referencing the
   existing paper.
6. Rendering cards, loading feeds, prefetching, expanding a paper abstract, and
   using secondary links create no view rows.
7. Two intentional clicks create two rows.
8. A failed request is not retried automatically and shows no error to the user.
9. A server or network failure does not delay, cancel, or replace the external
   navigation and shows no tracking error to the user.
10. The server ignores or rejects attempts to supply another user's identity.
11. Deleting a referenced user, story, or paper is rejected rather than
    cascading into view deletion.
12. The view ID is omitted from the insert and generated by `uuidPrimaryKey()`,
    `viewedAt` and `lastUpdatedDate` are database-generated timestamps, and
    `lastUpdatedBy` is plain text with no foreign-key constraint.

## Explicitly deferred

- Reading or displaying stored activity.
- Active-user definitions and reports.
- Aggregation, dashboards, and analytics exports.
- Grafana, Sentry, OpenTelemetry, traces, and correlation identifiers.
- Favorite activity and favorite history.
- Anonymous activity.
- Retention limits, cleanup, archival, and table partitioning.
- Privacy-driven user deletion or anonymization policy.
