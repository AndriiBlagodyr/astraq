# Changesets

Each file here records one change to a package and the version bump it needs. Run `pnpm changeset` to add one with your PR.

`pnpm version-packages` folds the pending changesets into each package's `version` and `CHANGELOG.md`, then deletes them. Packages stay `private`, so nothing is published to npm; see the Distribution section of [docs/design-system-plan.md](../docs/design-system-plan.md).
