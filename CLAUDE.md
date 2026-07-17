# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`postmark-cli` is a TypeScript CLI (published to npm, binary name `postmark`) for managing Postmark templates, sending emails, and listing servers. Source lives in `src/`, compiles to `dist/`, and `dist/index.js` is the executable entry point (`bin` in package.json).

## Commands

```bash
npm run build          # clean → tsc → copy preview assets → chmod +x dist/index.js
npm test               # lint → build → unit tests → integration tests (full gate)
npm run test:unit      # mocha over test/unit (fast, no network, no build needed via ts-node)
npm run test:integration  # mocha over test/integration — REQUIRES a prior `npm run build` + real API tokens
npm run lint           # eslint (.ts) + prettier --check, run concurrently
npm run lint:js        # eslint only
npm run lint:prettier  # prettier check only
npm run start:dev      # watch src/ and preview/, rebuild on change
```

Run a single test file (unit tests execute through `ts-node`, so no build step):

```bash
npx mocha --config .mocharc.unit.json test/unit/utils.test.ts
npx mocha --config .mocharc.unit.json --grep "pattern"   # filter by describe/it name
```

To run the built CLI locally: `npm run build && ./dist/index.js <command>`.

### Important build/test coupling
- **Integration tests shell out to the compiled `./dist/index.js` via `execa`** and hit the **live Postmark API**. You must `npm run build` first, and provide credentials in `test/config/testing_keys.json` (copy `testing_keys.json.example`; needs `SERVER_TOKEN`, `ACCOUNT_TOKEN`, `FROM_ADDRESS`, `TO_ADDRESS`). Integration tests create/delete real templates and send real email — CI runs **unit tests only** (see `.circleci/config.yml`, Node 16/18/20).
- **`preview/` is not compiled** — it's EJS/static assets copied verbatim into `dist/commands/templates/preview` by the `syncPreview` build step. Editing preview templates requires a rebuild (or `start:dev`) to take effect.
- A `pre-commit` hook runs `build` + `lint`.

## Architecture

### Command routing (yargs `commandDir`)
`src/index.ts` bootstraps yargs with `.env('POSTMARK')` and `.commandDir('commands')`. Each file in `src/commands/` is auto-discovered and must export `command`, `desc`, and `builder` (and usually `handler`). The convention has two layers:

- **Parent command** (e.g. `src/commands/templates.ts`) is a one-liner using the `cmd()` helper from `src/utils.ts`. `cmd()` returns a builder that calls `yargs.commandDir('commands/<name>')`, delegating to the subcommand directory.
- **Subcommands** live in `src/commands/<parent>/` (e.g. `templates/push.ts`, `email/raw.ts`, `servers/list.ts`) and export the actual `handler`.

So `postmark templates push` resolves to `src/commands/templates/push.ts`. `src/commands/cheats.ts` is a hidden easter-egg command (`desc = false`).

### Tokens & config via environment
`.env('POSTMARK')` maps env vars into yargs args: `POSTMARK_SERVER_TOKEN` → `args.serverToken`, `POSTMARK_ACCOUNT_TOKEN` → `args.accountToken`, `POSTMARK_REQUEST_HOST` → `args.requestHost`. The corresponding builder options (`server-token`, `account-token`, `request-host`) are declared `hidden: true` — they're populated from the environment, not typed by users. If no token is present, `validateToken()` in `src/utils.ts` interactively prompts for it (masked input). `requestHost` is a hidden override for the Postmark API host, used to point the CLI at non-production environments.

Two Postmark SDK clients are used: `ServerClient` (server token) for email + template operations, and `AccountClient` (account token) for listing servers.

### Template manifest system (the core abstraction)
Templates are represented on disk as **one directory per template**, each containing `meta.json` plus optional `content.html` and `content.txt`. Layouts are stored under a `_layouts/` subdirectory. `src/commands/templates/helpers.ts` is the heart of this:

- `createManifest(dir)` walks the tree (`directory-tree` + `traverse`), finds every `meta.json`, and merges it with sibling `content.html`/`content.txt` into a `TemplateManifest[]`.
- `pull.ts` fetches templates from a server and writes this structure (calling `validateTemplate` to also persist a suggested `TestRenderModel`).
- `push.ts` builds the local manifest, fetches the remote manifest, diffs them (`templatesDiff` / `sameContent`), shows a review table, and pushes. **Layouts are always pushed before standard templates** because templates can reference layouts.
- `preview.ts` runs a live-reloading Express + Socket.IO server (default port 3005) that renders templates via EJS and validates them against the Postmark API on each request, watching the directory for changes.

Shared types for this system live in `src/types/` (`TemplateManifest`, `MetaFile`, etc.), re-exported through `src/types/index.ts`.

### Output conventions
User-facing output goes through the `log()` helper and the `CommandResponse` class in `src/utils.ts` (wraps an `ora` spinner + `chalk` coloring). Errors use `logError()` / `fatalError()` (the latter calls `process.exit(1)`). Prefer these over raw `console.log`.

## Style
Prettier config (`.prettierrc.js`): **no semicolons**, single quotes, trailing commas everywhere, arrow parens avoided. ESLint enforces `eqeqeq` and `@typescript-eslint/no-unused-vars`. TypeScript is strict, targets ES5 / CommonJS.
