# Cloudflare CI deploy token

This runbook creates the least-privilege Cloudflare API token used by
`.github/workflows/deploy.yaml`. It is for GitHub Actions only; do not reuse a
developer's local Wrangler OAuth session or put its credentials in GitHub.

## What the workflow does

On pushes to `master` (and manual dispatch), the workflow:

1. Deploys the Terraform state server (`infra/state-backend`) with wrangler
   when the push changes it.
2. Applies the `prod` stage of `infra/terraform` when the push changes
   `infra/` (manual runs always apply). It stops if the plan would delete or
   replace the production D1 database.
3. Applies remote D1 migrations with `wrangler d1 migrations apply DB --remote`.
4. Uploads the Worker, its `DB` binding, the cron trigger, and Worker settings.
5. Uploads the Worker secrets listed in the workflow.

The Worker is `hackerfeed-web` and its D1 database is `hackerfeed`, bound as
`DB` in `wrangler.jsonc`.

`.github/workflows/preview.yaml` uses the `preview` environment on every
same-repo, non-Dependabot pull request. It:

1. Applies the `pr-<number>` Terraform stage on the PR's first push, and
   again whenever the PR changes `infra/`. That stage is a D1 database
   named `hackerfeed-web-pr-<number>`. A PR that changes `infra/` also plans
   `prod` and shows the plan in its job summary.
2. Rebinds `DB` to the PR's database in the generated
   `dist/server/wrangler.json`, applies all migrations to it, then replaces
   every row with the dummy data in `src/demo-data/database`. The PR's
   migrations are rehearsed there on the previous push's fixture rows;
   production data is never touched by preview code. The build also serves
   Hacker News from `src/demo-data/hacker-news.ts`.
3. Runs `wrangler versions upload --preview-alias pr-<number>`. This uploads a
   Worker version without deploying it, so production traffic is unaffected.
4. Fails the job if the uploaded version is bound to the production database.
5. Comments the preview URLs on the PR.

`.github/workflows/preview-cleanup.yaml` destroys the PR's stage and deletes
its Terraform state when the PR closes. Previews still share the production Worker secrets (Sentry, the AI
token key). Sign-in on a preview returns to its alias URL, so WorkOS must allow
`https://pr-<number>-hackerfeed-web.kgqk4vdcfq.workers.dev/auth/callback`. The same
data can be run locally, tailnet-only, with `docs/private-preview.md`.

Because a preview upload makes the latest Worker version an undeployed one,
the production deploy passes secrets with `wrangler deploy --secrets-file`.
`wrangler secret bulk` refuses to edit secrets in that state.

## Create the token

1. Sign in to Cloudflare with an account that can manage API tokens for the
   target account.
2. Go to **My Profile** > **API Tokens** > **Create Token** > **Custom token**.
3. Give it a descriptive name such as `github-hackerfeed-web-production-deploy`.
4. Add exactly these account permissions:

   | Permission | Why it is needed |
   | --- | --- |
   | **Workers Scripts: Edit** | Deploys the Worker and updates its bindings, cron trigger, observability settings, and Worker secrets. Cloudflare may label this permission **Write** in some API documentation. |
   | **D1: Edit** | Creates and deletes the D1 databases through Terraform, and applies the remote SQL migrations before deployment. |

5. Under **Account Resources**, include only the Cloudflare account that owns
   `hackerfeed-web` and its D1 database. Do not select all accounts.
6. Leave **Zone Resources** empty. This Worker is deployed to `workers.dev` and
   the repository has no custom-domain Worker route to manage.
7. Set the token expiration to **90 days**. Do not create a non-expiring CI
   token.
8. Create the token and copy it immediately. Cloudflare displays the secret only
   once.

Do not add DNS, Workers Routes, KV, R2, Pages, Account Settings, or broad
read-all permissions unless the workflow is changed to use those services.

## Store it in GitHub

The workflows use two GitHub environments:

- `production`: `deploy.yaml`. Only `master` may deploy from it.
- `preview`: `preview.yaml` and `preview-cleanup.yaml`, for pull requests.

1. In GitHub, open this repository's **Settings** > **Environments**.
2. In each environment, add or update the secret `CLOUDFLARE_API_TOKEN` with
   the token value, and `CLOUDFLARE_ACCOUNT_ID`. The account id is an
   identifier, not a secret, but keeping it alongside the deployment
   configuration is fine.
3. Both environments also need `VITE_SENTRY_DSN`, `VITE_WORKOS_CLIENT_ID` and
   `AI_TOKEN_ENCRYPTION_KEY`; `production` also needs `SENTRY_AUTH_TOKEN`.
4. Do not commit any of these values to `.env*`, `.dev.vars`, or the
   repository.

Terraform state needs no secret: CI signs in to the state server with a GitHub
OIDC token (see README > Infrastructure). Configure environment protection
rules on `production` if deployments should require an approval.

## Verify without deploying

Before saving the token to GitHub, Cloudflare's token summary should show only
the two account permissions above and one account resource. After adding it,
use **Run workflow** in the GitHub Actions UI if you want an explicit deployment
test; do not test a CI token by setting it in a local shell.

For local developer authentication only, this command shows the active Wrangler
OAuth session and its granted scopes without revealing a token:

```sh
./node_modules/.bin/wrangler whoami
```

That local OAuth login is not the GitHub Actions credential and must not be
copied into GitHub secrets.

## Rotate or revoke

Rotate the token before its 90-day expiry:

1. Create a replacement token with the same two permissions and account scope.
2. Replace `CLOUDFLARE_API_TOKEN` in the GitHub `production` and `preview`
   environments.
3. Run the workflow and confirm it completes.
4. Revoke the old token in Cloudflare.

If a token is exposed, revoke it immediately, create a replacement, update the
GitHub secret, and review recent workflow runs and Cloudflare audit activity.

## When this must change

Update this runbook and the token permissions whenever the deploy workflow adds
a Cloudflare resource. For example, custom-domain routes require Workers Routes
edit access; KV, R2, Queues, or Pages each need their own corresponding account
permission.

## References

- [Cloudflare: GitHub Actions deployments](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Cloudflare: D1 API token permissions](https://developers.cloudflare.com/d1/platform/release-notes/)
- [Cloudflare: Worker secret API permission](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/secrets/methods/update/)
