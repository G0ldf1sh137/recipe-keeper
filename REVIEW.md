# Code Review Checklist (LemmeCook)

Project-specific review guidance. General good practice (readability, naming, no dead code) still applies but isn't repeated here — this is what's easy to miss *in this codebase specifically*.

## Server functions & middleware

- [ ] Every `createServerFn` has the middleware that actually matches what it does — not just "is the user logged in," but the *right* gate:
  - Reads/writes scoped to the logged-in user only → `requireAuthMiddleware`.
  - Full admin power (user management, bypass ownership everywhere) → `requireAdminMiddleware`.
  - Moderation power short of user management (reports, deleting reported content, timeouts) → `requireModeratorMiddleware` (`isAdmin || isModerator`).
  - Gated to paying users → `requireSubscriberMiddleware`.
  - **Public content creation** (a POST that creates/edits something visible to others — recipe, comment, rating, fork, message, cookbook rename, etc.) → also needs `requireNotBannedMiddleware`. Ask: "should a timed-out user be blocked from doing this?" Deletion/cleanup/reordering of your *own* stuff should stay allowed even while banned — don't over-gate.
  - A new POST endpoint that creates public-facing content and *doesn't* have `requireNotBannedMiddleware` is a bug unless there's a deliberate reason (write it down as a comment if so).
- [ ] If a function accepts an `isAdmin`/bypass flag, verify it's **threaded all the way through**, not just added at the top layer. (Real bug found and fixed this way: `forkRecipe`'s `.functions.ts` wrapper had `context.user.isAdmin` available, but the underlying `.server.ts` function never received or forwarded it to `findRecipeById`, so the admin view-bypass silently didn't apply to forking. When you see one function pass `isAdmin` through to a shared helper, check every other caller of that same helper does too.)
- [ ] `context.user` vs `context.user?.id` — middlewares below `requireAuthMiddleware` guarantee a non-null user; using optional chaining past that point usually means the wrong middleware is applied, or an actual latent null case is being masked.

## Data model & migrations

- [ ] Any `src/db/schema.ts` change has a matching generated migration (`npx drizzle-kit generate`), and the migration was actually applied locally (`npm run db:migrate`) before calling the feature done. A schema edit with no migration file is incomplete, not "will migrate later."
- [ ] New nullable columns get a sensible default meaning for existing rows (e.g. `bannedUntil: null` means "not banned," not a column that needs backfilling).
- [ ] Prefer a nullable timestamp/flag that already encodes "never happened" over adding a second boolean alongside it (see `bannedUntil` vs. a separate `isBanned` flag — one field, unambiguous).
- [ ] Visibility/ownership checks go through the shared helpers (`visibleToViewer`, `findRecipeById`'s `isAdmin` param, etc.) rather than a one-off `if` re-implementing the same rule slightly differently in a new file.

## Client / UI

- [ ] Colors come from theme CSS variables (`bg-accent-600`, `text-ink`, `border-rust`, etc.), never a hardcoded Tailwind color (`bg-yellow-50`) — hardcoded colors silently ignore both dark mode and the 5 color themes. (Real bug found and fixed this way: the impersonation banner was hardcoded yellow and didn't recolor with the rest of the app.)
- [ ] Action rows / button groups use `flex flex-wrap` (not a bare `flex`) wherever the number of visible items can vary by role (owner vs. admin vs. anonymous) — a row that's fine with 3 buttons for a normal user can overflow badly on mobile once admin-only buttons add 2-3 more.
- [ ] New pages/sections use the existing `mx-auto max-w-2xl p-4 sm:p-8` container convention (or the app-wide header's `max-w-6xl`) rather than going full-bleed with no width constraint.
- [ ] A server function invoked from a button that could be slow shows a loading/disabled state (`disabled={pending}`, `"Saving..."`-style label swap) — this is the existing pattern everywhere, don't skip it for a new button.
- [ ] `useMemo`/effect dependency arrays are actually complete — several existing hooks recompute derived client-side state (grouping, filtering) from a loaded-so-far list and need to be correct as that list grows via infinite scroll, not just correct on first render.

## Consistency with existing features

- [ ] If the new feature is the kind of thing that should notify someone (comment/rating/fork/follow already do), check whether it needs a `insertNotification` call too — or a deliberate note on why not.
- [ ] If the feature touches something ownership-based that already has an admin bypass elsewhere (recipes, cookbooks, Meal Weeks, grocery lists), check the new code path gets the same bypass, not a subtly narrower one.
- [ ] Check `design-plan.md` before assuming something is missing — most "obvious" features (pantry-based suggestions, cookbook reordering, per-day macro totals, etc.) already exist; searching for prior art here has repeatedly turned up a fully-built feature that just needed extending, not building from scratch.

## Docs that must move together

- [ ] A new user-facing feature milestone in `design-plan.md` is accompanied by a matching update to `src/routes/about.tsx`'s `featureGroups` (unless it's purely internal/admin) — these two are supposed to never drift apart.
- [ ] A change to how a feature works (not just a new feature) should update the relevant wiki page too, if the wiki page describes that behavior.

## Before calling anything done

- [ ] `npx tsc --noEmit` and `npx eslint src` both clean.
- [ ] Actually exercised in the browser (Claude Preview tools), not just read — this codebase has repeatedly had bugs that type-checked and linted cleanly but failed at runtime (e.g. the fork-bypass bug above threw a server-side `notFound()` that only showed up when actually clicking Fork).
- [ ] Any test data created during verification (recipes, reports, bans, moderator flags, forks) is cleaned up afterward, and real user accounts (anything not one of the three fixture test accounts) were only ever read from, never mutated.
- [ ] No unused imports left behind after swapping one middleware/helper for another — this specific mistake has recurred multiple times in this codebase.
