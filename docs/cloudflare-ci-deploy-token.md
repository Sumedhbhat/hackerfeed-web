# Cloudflare CI tokens

GitHub stores one Cloudflare token: the Terraform token, in the `production`
environment. Terraform uses it to mint every other token CI needs, so they are
created, scoped, rotated and revoked in `infra/terraform`. This runbook creates
the Terraform token. It is for GitHub Actions only; do not reuse a developer's
local Wrangler OAuth session or put its credentials in GitHub.

| Token | Defined in | Stored in | Used by |
| --- | --- | --- | --- |
| Terraform | this runbook | GitHub `production` secret `CLOUDFLARE_API_TOKEN` | Terraform, state server deploy |
| `hackerfeed-ci-deploy` | `infra/terraform/deploy` | `deploy` state (production only) | migrations, Worker deploy |
| `hackerfeed-ci-preview` | `infra/terraform` | `prod` state (PRs can read it) | PR version uploads, PR plans |

Jobs read the minted tokens from Terraform outputs with
`infra/cloudflare-token.sh`, which signs in through GitHub OIDC like every
Terraform command. Never put a production-only token in the `prod` state:
every PR job can read it.

## What the workflow does

On pushes to `master` (and manual dispatch), the workflow:

1. Deploys the Terraform state server (`infra/state-backend`) with Wrangler.
2. Plans and applies the `prod` root (the database `hackerfeed` and the preview
   token) and the `deploy` root (the deploy token) through Terraform.
3. Reads the database identity from Terraform outputs and configures Wrangler
   before building the app.
4. Reads the deploy token, then applies remote migrations with the generated
   `dist/server/wrangler.json`.
5. Deploys `hackerfeed-web` with the same config and its production secrets.

`.github/workflows/preview.yaml` uses the `preview` environment for same-repo,
non-Dependabot pull requests. It builds a static fixture demo and uploads only
`dist/client` as a version of `hackerfeed-web` using `wrangler.preview.jsonc`.
The version is never deployed; the upload returns a stable PR alias and
immutable commit URL, which CI reports on the PR.

The demo version has no Worker script or database bindings, so it cannot read
the Worker's secrets.
It uses a fixed demo session and browser memory that resets on refresh.
It does not validate migrations, database queries, or real sign-in. A separate
read-only production Terraform plan appears in the workflow summary.

Legacy preview databases and state remain untouched. Their retirement requires
a separate operation; there is no preview database cleanup workflow now.
See [private previews](private-preview.md) to run the same static demo locally.

## Create the Terraform token

1. Sign in to Cloudflare with an account that can manage API tokens for the
   target account.
2. Go to **Manage Account** > **Account API Tokens** > **Create Token** >
   **Custom token**. An account-owned token survives its creator leaving.
3. Give it a descriptive name such as `github-hackerfeed-terraform`.
4. Add exactly these account permissions:

   | Permission | Why it is needed |
   | --- | --- |
   | **Account API Tokens: Edit** | Mints, rotates and revokes the deploy and preview tokens. |
   | **Workers Scripts: Edit** | Deploys the state server, and lets Terraform grant Workers access to the minted tokens. Cloudflare may label this permission **Write** in some API documentation. |
   | **D1: Edit** | Manages the D1 database through Terraform, applies the state server's migrations, and lets Terraform grant D1 access. |

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
- `preview`: `preview.yaml`, for pull requests.

1. In GitHub, open this repository's **Settings** > **Environments**.
2. In `production`, add or update the secret `CLOUDFLARE_API_TOKEN` with the
   token value. It must never be added to `preview`: it can mint any token.
3. In both environments, add `CLOUDFLARE_ACCOUNT_ID`. The account id is an
   identifier, not a secret, but keeping it alongside the deployment
   configuration is fine.
4. Only `production` needs `VITE_SENTRY_DSN`, `VITE_WORKOS_CLIENT_ID`,
   `SENTRY_AUTH_TOKEN`, and `AI_TOKEN_ENCRYPTION_KEY`. Preview builds receive
   none of these secrets.
5. Do not commit any of these values to `.env*`, `.dev.vars`, or the
   repository.

The minted tokens' permissions live in Terraform: the deploy token has Workers
Scripts Write and D1 Write; the preview token has Workers Scripts Write, D1
Read and Account API Tokens Read, the last two for PR plans. Cloudflare cannot
limit a Workers token to one script or to version uploads, so the preview
token can still deploy `hackerfeed-web`; it cannot write D1 or mint tokens.

Terraform state needs no secret: CI signs in to the state server with a GitHub
OIDC token (see README > Infrastructure). Configure environment protection
rules on `production` if deployments should require an approval.

## Verify without deploying

Before saving the token to GitHub, Cloudflare's token summary should show only
the three account permissions above and one account resource. After adding it,
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

Terraform rotates the minted tokens: the first production run 30 days after a
token was made replaces it, and each expires after 90 days. A token only lapses
if production goes 90 days without a run; run the deploy workflow to renew it.
To replace one now, for example after exposure, delete it in Cloudflare and
run the deploy workflow: Terraform sees it is gone and mints a new one.

Rotate the Terraform token by hand before its 90-day expiry:

1. Create a replacement token with the same permissions and account scope.
2. Replace `CLOUDFLARE_API_TOKEN` in the GitHub `production` environment.
3. Run the workflow and confirm it completes.
4. Revoke the old token in Cloudflare.

It also keys the encryption of Terraform recovery files, so keep the old token
until any pending recovery is done. If a token is exposed, revoke it
immediately, replace it as above, and review recent workflow runs and
Cloudflare audit activity.

## When this must change

Update the `permissions` of the minted tokens in Terraform whenever a workflow
uses a new Cloudflare resource. For example, custom-domain routes require
Workers Routes edit access; KV, R2, Queues, or Pages each need their own
corresponding account permission. The Terraform token needs any permission it
grants, and its own permissions change here, by hand.

## References

- [Cloudflare: GitHub Actions deployments](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Cloudflare: D1 API token permissions](https://developers.cloudflare.com/d1/platform/release-notes/)
- [Cloudflare: Worker secret API permission](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/secrets/methods/update/)
