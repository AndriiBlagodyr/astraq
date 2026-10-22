# ADR 0003: pnpm + Turborepo, and how Python lives in the monorepo

- Status: Accepted
- Date: 2026-10-03

## Context

Veracand is one repo with three runtimes' worth of code:

- Node workspaces: `apps/web` (Next.js), `apps/api` (NestJS), `packages/ui`, and later `packages/shared` and `packages/sdk`.
- A Python service, `services/ml` (FastAPI, later BullMQ workers), and later `services/ingest`.
- Local infra in `infra/docker/compose.yml`.

Phase 0 needs three things to hold together: a fresh clone boots with `pnpm install && pnpm infra:up && pnpm dev`, CI checks every package, and each language keeps its own tools without a second build system wrapped around them.

### Options considered

| Option | Verdict |
|---|---|
| **pnpm workspaces + Turborepo** | **Chosen.** pnpm's strict `node_modules` catches undeclared imports, and its lockfile is fast to install in CI. Turborepo adds only a task graph (`^build` ordering) and a cache on top of the `package.json` scripts we already have. |
| pnpm alone (`pnpm -r run`) | Works today, but has no cache and no "build my dependencies first" rule. `packages/ui` must build before `web` can typecheck or test. |
| Nx | Has a Python plugin and more features, but brings generators, project.json files, and its own concepts. Too much framework for a repo this size, and it hides the scripts. |
| npm / Yarn workspaces | No advantage over pnpm here; npm's hoisting hides missing dependencies. |
| Separate repo for Python | Breaks "one PR changes a contract and both sides", which matters from Phase 5 when the strategy DSL is shared. |
| Poetry or pip + venv for Python | `uv` is faster, manages the Python version from `.python-version`, and its `uv.lock` is checked with `--locked` in CI. |

## Decision

### 1. Node

- **pnpm workspaces** (`pnpm-workspace.yaml`) with the version pinned in the root `packageManager` field. Node's version is pinned in `.nvmrc`.
- **Turborepo** runs `build`, `dev`, `lint`, `typecheck`, and `test:unit`. Each package owns its scripts; `turbo.json` declares only ordering (`^build`) and cached outputs.
- Internal packages are consumed as `workspace:*` and build to `dist/` (ADR 0002), so apps import built code the same way an outside consumer would.

### 2. Python

- Each Python service is a self-contained **uv project**: its own `pyproject.toml`, `uv.lock`, and `.python-version`. pnpm and Turborepo don't manage Python dependencies.
- Ruff, mypy, and pytest run through `uv run` in the service directory. Python is not part of Turborepo's `lint`, `typecheck`, or `test:unit`: those scripts are Node-shaped, and `uv` already caches environments.
- A service joins the pnpm workspace only through a minimal `package.json` with a `dev` script (`services/ml/package.json`). That is enough for `pnpm dev` (`turbo dev`) to start it next to web and api. It declares no Node dependencies and no other scripts.
- The root `test:unit:ml` script stays as a convenience for running pytest from the repo root.

### 3. CI

GitHub Actions has two parallel jobs:

- **node** — `pnpm install --frozen-lockfile`, the token drift check, then `turbo run lint typecheck test:unit` with the Turborepo cache in `actions/cache`.
- **ml** — `uv sync --locked`, then ruff (lint + format check), mypy, and pytest, with uv's cache keyed on `uv.lock`.

A Node-only change still runs the ml job. It takes well under a minute, so path filters aren't worth their failure modes yet.

### 4. Dependency updates

Renovate (`renovate.json`) runs weekly. Patch and minor updates come grouped, one PR per ecosystem (Node, Python, GitHub Actions, compose images); majors come one per package. Renovate's `pep621` manager updates `pyproject.toml` and `uv.lock` together.

## Consequences

- `pnpm dev` needs `uv` on `PATH`. Without it the ml task fails and Turborepo stops the other dev tasks. `pnpm dev:web` and `pnpm dev:api` still work without uv.
- A future `services/ingest` follows the same pattern: a uv project plus a `dev`-only `package.json`, and its own CI job.
- Cross-language contracts can't rely on Turborepo ordering. From Phase 5 a CI check fails when the generated Pydantic models drift from the JSON Schema exported by `packages/shared`.
- Turborepo's cache lives in GitHub's Actions cache, not Vercel's remote cache. Moving to a remote cache is a config change if CI gets slow.
