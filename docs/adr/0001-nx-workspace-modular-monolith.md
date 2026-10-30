---
status: accepted
---

# Nx and Bun workspaces, one Worker, boundaries from existing tools

HackerFeed stays one deployed Worker, but its code is split into Bun workspace packages (`ui`, `contracts`, `hacker-news`, `runtime`, `backend`, `api-client`) and infrastructure projects, with Nx as the project graph and task runner. We wanted boundaries a tool can enforce, checks selected by dependency instead of by path filter, and room for a second app to reuse `ui` and `contracts`. Nx fit that better than moon (smaller ecosystem), Turborepo (experimental boundary rules) or Bazel (rule and toolchain cost). Separate repositories would have added publishing and version coordination with no owner or access reason to justify them.

## Considered options

- **Nx's `@nx/enforce-module-boundaries` ESLint rule.** Rejected because typescript-eslint needs the TypeScript compiler's JS API (`typescript <6.1.0`), and TypeScript 7 ships only the native `tsc`.
- **A custom checker over the Nx graph.** Built, then removed: the rules that mattered are covered by tools already in the repo. Bun's isolated installs make each package's declared `dependencies` its allowed imports, `tsc` rejects undeclared packages and unexported subpaths, TanStack Start's import protection keeps backend code out of the client build, and Biome holds `api-client` to the backend's types. Left to review: relative imports into another project, root devDependencies resolving from any package, Terraform module edges, and cycles. There are few packages, so these are cheap to catch in review.
- **Only `ui`, `contracts`, `backend` and `api-client`.** `runtime` and `hacker-news` were added because both the browser and the backend use the logger, trace headers, HTTP client and HN record helpers, and the backend may not import the app.

## Consequences

- The browser depends on the backend in exactly one place: `api-client` imports types from `@hackerfeed/backend/api-types`, so tRPC can infer its client. A backend change therefore rechecks `api-client` and `web`. Removing that edge would take a generated API-types package or OpenAPI, not a folder move.
- Packages don't read env. `apps/web/src/backend.ts` passes config into `createBackend`.
- Production still reconciles the state server, then Terraform, then migrations, then the deploy on every run. Affected selection only chooses PR checks, and runs in shadow mode until its recorded selections have been compared with full runs.
- Terraform state names (`prod`, `deploy`) and resource addresses are stable identities. Moving a root's directory changes only the stage map in `tools/infra-ci/state_proxy.py`.
