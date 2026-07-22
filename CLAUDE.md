# LemmeCook (recipe-keeper)

A recipe-sharing web app. Users write up recipes, organize them into "cookbooks," plan meals across a week, build grocery lists, track a pantry, and share things publicly or via link. Full feature list lives in the [GitHub wiki](https://github.com/G0ldf1sh137/recipe-keeper/wiki) (user-facing) and `design-plan.md` (technical, one numbered milestone per shipped feature — read it before assuming something doesn't exist).

Production: https://lemmecook.site — deployed on Vercel + Neon Postgres. Repo: `G0ldf1sh137/recipe-keeper`.

## Tech stack

- **Framework**: TanStack Start (React + TanStack Router, full-stack SSR), TypeScript, Tailwind CSS
- **Data**: Drizzle ORM over Postgres. Local dev via `docker-compose.yml` (container `recipe-keeper-postgres-1`, db/user/password all `recipe_keeper`); prod via managed Neon Postgres
- **Auth**: Google OAuth, server-side sessions (HttpOnly cookie, session id hashed at rest)
- **AI import**: Claude API (`claude-opus-4-8`) transcribes recipes from photos/PDFs/pasted text; a JSON-LD scraper handles URL import
- **Billing**: Stripe Checkout + Billing Portal for the $5/month subscription; `users.isSubscriber` is the single access-control flag (also settable by an admin toggle, independent of Stripe)
- **Storage**: S3 for recipe photos
- **PDF export**: `@react-pdf/renderer`

## Path alias

Import from `src/` as `#/...` (e.g. `#/db/index`, `#/auth/auth-middleware`) — configured in `tsconfig.json`. Modules are organized by feature (`src/recipes/`, `src/pantry/`, `src/billing/`, etc.), each typically with `schemas.ts` (Zod), `*.server.ts` (DB queries, server-only), and `*.functions.ts` (`createServerFn` wrappers with middleware).

## Commands

```
npm run dev              # dev server on :3000
npm run build             # production build
npm test                  # vitest
npm run lint               # eslint
npx tsc --noEmit           # typecheck (no dedicated script — run directly)
npm run db:generate        # drizzle-kit generate (after schema.ts changes)
npm run db:migrate         # drizzle-kit migrate (applies pending migrations)
docker compose up -d       # start local Postgres
```

Always run `npx tsc --noEmit` and `npx eslint src` after a change and confirm both are clean before considering a task done.

## Auth middleware chain

Composed in `src/auth/auth-middleware.ts`, each layer re-passing `{ user, realUser, isImpersonating }`:

`sessionMiddleware` → `requireAuthMiddleware` → one of:
- `requireAdminMiddleware` — `isAdmin` only (user management, full moderation, bypasses ownership everywhere)
- `requireModeratorMiddleware` — `isAdmin || isModerator` (reports queue, delete reported content, timeout/ban users — not user management)
- `requireSubscriberMiddleware` — `isSubscriber` (grocery lists, pantry, Meal Weeks, AI import)
- `requireNotBannedMiddleware` — blocks **posting** (not browsing) while `bannedUntil` is in the future; applied to public content-creation endpoints only (rating, forking, creating/editing recipes and cookbooks, comments, messages, marking-made) — deletion/cleanup endpoints stay on plain `requireAuthMiddleware` so a banned user can still tidy up their own stuff.

`bannedUntil` is a nullable timestamp, not a boolean: null/past = not banned, future = active timeout, far-future = effectively permanent.

## Standing workflow (established over many sessions — follow unless told otherwise)

1. **Implement → verify in the browser → document → commit only if asked.**
2. Every user-facing feature gets a new numbered milestone appended to `design-plan.md` with a real verification narrative (what was tested, what the result was), not just a description of the code.
3. If the feature is user-facing enough to belong on the public feature list, also update `src/routes/about.tsx`'s `featureGroups` in the same pass — this is a standing instruction, not optional. (Purely internal/admin/refactor changes don't need an About update.)
4. **Never commit or push unless the user explicitly says so in that turn.** A prior "commit this" does not authorize committing again later without being asked.
5. Don't over-scope: if you spot an unrelated bug while working on something else, mention it (or use the spawn-a-background-task mechanism) rather than fixing it inline unless asked.

## Browser verification

Use the Claude Preview MCP tools (`preview_start`, `preview_click`, `preview_eval`, `preview_snapshot`, `preview_network`, `preview_console_logs`) — never Bash or chrome-devtools for this.

Known quirks:
- `preview_network`'s full dump is capped and often shows the **oldest** buffered requests in a long-lived tab, not the most recent — if you need to confirm a specific request just fired, reload the page first (`preview_eval: window.location.reload()`) to reset the buffer, or just check application state directly instead (DB query, `window.location.href`, etc.).
- For a native `window.confirm()` dialog that automation can't reliably click through, call the underlying server function directly via `preview_eval` + dynamic `import()` of the relevant `.functions.ts` module instead of trying to drive the UI.
- `preview_click` with a generic tag selector (e.g. `button`) matches the *first* match on the page, which is often the wrong element — grab the target's actual `data-tsd-source` attribute (from TanStack Devtools) or another unique attribute first.

## Test accounts

Three persistent fixture users exist in the local dev DB — reuse them, don't create new disposable ones:

| user | email | flag |
|---|---|---|
| `test-admin` | test-admin@example.com | `isAdmin=true` |
| `test-sub` | test-sub@example.com | `canTranscribe=true` |
| `test-free` | test-free@example.com | no special flags |

To act as one: log in via a temporary `/api/test-login.ts` bypass route that calls the real `createSession`/cookie-setting code (real Google OAuth can't authenticate these fake `google_id`s), then use Settings → "Impersonate a user" to switch to `test-sub`/`test-free` from `test-admin` rather than logging in again. Delete the bypass route after verifying — only the three user *rows* persist across sessions. Never hand-craft a session token and insert it directly into the `sessions` table; that's an auth bypass and gets blocked. If a task genuinely needs two concurrently-logged-in sessions (e.g. testing the household-invite flow), log into a second fixture account directly instead of impersonating.

**"matt-rich" is a real user account, not a fixture** — safe to read from (e.g. forking one of their public recipes doesn't mutate the original), never to mutate directly.

## Production database access

There is no automated way to pull the production `DATABASE_URL` in this sandbox (`vercel env pull`/`env run` merge in the local `.env` and get overridden, and the permission classifier blocks attempts to print/log/write the real secret). The working pattern: ask the user to paste the production connection string directly into chat, then use it **only** as an inline shell env var prefix for that one command (e.g. `DATABASE_URL='...' npm run db:migrate`) — never echo it, log it, or write it to a file.

## Schema changes

1. Edit `src/db/schema.ts`.
2. `npx drizzle-kit generate` — writes a new `drizzle/NNNN_*.sql` file.
3. `npm run db:migrate` locally against the docker-compose Postgres.
4. When ready for prod, run the same migrate command with the production `DATABASE_URL` (see above) — this has to be done explicitly, it does not happen automatically on deploy.

## Known pre-existing gaps (not yet fixed, don't assume otherwise)

- Nothing calculates nutrition from ingredients, and there's no unit conversion — yield/calories/macros are always manually entered (by a human or by AI import), and ingredient scaling only multiplies quantities.
- Fork/browse grouping (see `src/recipes/RecipeForkGroup.tsx`) only collapses forks with whatever's currently loaded client-side — a fork whose original isn't loaded yet (later infinite-scroll page, or filtered out) shows standalone until it is.
