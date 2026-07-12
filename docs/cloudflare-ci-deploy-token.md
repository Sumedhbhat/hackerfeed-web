# Cloudflare CI deploy token

This runbook creates the least-privilege Cloudflare API token used by
`.github/workflows/deploy.yaml`. It is for GitHub Actions only; do not reuse a
developer's local Wrangler OAuth session or put its credentials in GitHub.

## What the workflow does

On pushes to `master` (and manual dispatch), the workflow:

1. Applies remote D1 migrations with `wrangler d1 migrations apply DB --remote`.
2. Uploads the Worker, its `DB` binding, the cron trigger, and Worker settings.
3. Uploads the Worker secrets listed in the workflow.

The Worker is `hackerfeed-web` and its D1 database is configured as `DB` in
`wrangler.jsonc`.

## Create the token

1. Sign in to Cloudflare with an account that can manage API tokens for the
   target account.
2. Go to **My Profile** > **API Tokens** > **Create Token** > **Custom token**.
3. Give it a descriptive name such as `github-hackerfeed-web-production-deploy`.
4. Add exactly these account permissions:

   | Permission | Why it is needed |
   | --- | --- |
   | **Workers Scripts: Edit** | Deploys the Worker and updates its bindings, cron trigger, observability settings, and Worker secrets. Cloudflare may label this permission **Write** in some API documentation. |
   | **D1: Edit** | Applies the remote SQL migrations before deployment. |

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

1. In GitHub, open this repository's **Settings** > **Environments** > `dev`.
2. Add or update the environment secret named `CLOUDFLARE_API_TOKEN` with the
   token value.
3. Confirm `CLOUDFLARE_ACCOUNT_ID` is also present in the same `dev`
   environment. It is an identifier, not a secret, but keeping it alongside the
   deployment configuration is fine.
4. Do not commit either value to `.env*`, `.dev.vars`, or the repository.

The workflow reads both values from the `dev` GitHub environment. Configure
GitHub environment protection rules there if deployments should require an
approval.

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
2. Replace `CLOUDFLARE_API_TOKEN` in the GitHub `dev` environment.
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
