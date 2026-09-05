# Contributing

Thanks for contributing to IBR Tetfund Server.

## Project structure

- `backend/`: API service

## Code of conduct

Please follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Setup

Prerequisites:

- Node.js 20+
- pnpm 10.23.0+
- mongo 7+

Install dependencies:

```bash
cd backend && pnpm install
```

Environment files:

- `backend/.env` (database + auth/email/service settings)

Run locally:

```bash
cd backend && pnpm dev
```

## Branches and PRs

- `staging` is the active development branch.
- Branch from `staging` by default.
- Open PRs to `staging` unless maintainers explicitly ask for `main`.
- Use descriptive branch names (for example `feat/user-onboarding`, `fix/auth-redirect`).
- Keep PRs focused and small when possible.
- Link issues in PRs using `Closes #<issue-number>`.

## Issue claim flow (automation)

This repository includes issue/PR comment automation in `.github/workflows/` for claiming and tracking work items.

### 1) Claim an issue

Comment exactly:

```text
claim
```

If the issue is in the correct project status, you will be assigned and the status moves to **Claimed**.

### 2) Disclaim an issue

If you cannot continue, comment exactly:

```text
disclaim
```

If you are the assignee, automation unassigns you and moves status back to **Unclaimed**.

### 3) Link a PR to the issue

You can link by putting `Closes #<issue-number>` in the PR body, or by commenting on the issue:

```text
propose #<pr-number>
```

Examples accepted by automation:

```text
propose #123
propose PR #123
```

### 4) Unlink a PR from an issue

Comment on the issue:

```text
withdraw #<pr-number>
```

### 5) Review state labels on PRs

On a PR, comment one of:

```text
awaiting-review
awaiting-author
```

This updates PR labels and, when linked, can update issue project status.

## Pre-commit hook

This repo includes a tracked hook at `.githooks/pre-commit`.

Enable once per clone:

```bash
./scripts/setup-hooks.sh
```

## CI expectations

CI runs lint + build for `backend/`.

Run before opening a PR:

```bash
cd backend && pnpm lint && pnpm build
```

## Pull request checklist

- [ ] Lint passes in `backend/`
- [ ] Build passes in `backend/`
- [ ] Docs updated when behavior/config changed
- [ ] New env vars documented

## Security

- Never commit secrets.
- Report vulnerabilities privately per [SECURITY.md](SECURITY.md).
