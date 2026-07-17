# Recipe Keeper — Design Plan

## Overview
Recipe Keeper is a web app for creating, organizing, and sharing recipes. Users can write up recipes with ingredients and steps, organize them into collections (presented to users as "cookbooks"), and share them publicly or with specific people via a link.

## Goals
- Let a user quickly capture a recipe (title, ingredients, steps, photo, tags).
- Let a user share a single recipe or a collection via a public link.
- Let other users discover and save (fork/bookmark) recipes shared with them.
- Let a user build a grocery list from one or more recipes, with duplicate ingredients combined.
- Keep the initial scope small: no nutrition calculators in v1.

## Tech Stack
- **Framework**: TanStack Start (React + TanStack Router, full-stack, SSR)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data fetching/mutations**: TanStack Query + Start server functions
- **Database**: Postgres (via Drizzle ORM); local dev via `docker-compose.yml`, prod via managed Render Postgres
- **Auth**: Google OAuth sign-in, server-side sessions (HttpOnly cookie, session id hashed at rest)
- **AI**: Claude API (claude-opus-4-8, vision/document input + structured outputs) — transcribes a handwritten recipe from uploaded photos or an uploaded PDF into the recipe record via an owner-only "Process photos"/"Process PDF" button with preview-then-confirm; a web-scraping importer (fetches a recipe's source URL via the `web_fetch` tool and extracts title/ingredients/steps/photos) is built but not yet wired into the UI
- **Deployment target**: Vercel (via the Nitro Vite plugin) + Neon Postgres; `render.yaml` kept as an alternative. Recipe photos stored in S3.
- **PDF export**: `@react-pdf/renderer` (pure-JS PDF renderer, no headless browser) generates a downloadable PDF of a recipe on demand, server-side.

## Core Data Model
- **User**: id, email, name, username (unique, auto-generated on signup, editable), avatarUrl, createdAt
- **Recipe**: id, ownerId, parentRecipeId (nullable, self-referencing — set when this recipe was forked from another, cleared to null if the original is later deleted), title, description, ingredients (list of {qty, unit, name}), steps (ordered list of {text, imageUrls}), photoUrls (list of strings), coverPhotoUrl (nullable, must be one of photoUrls, shown on recipe cards), sourceUrl (nullable, link to the recipe's original source), sourcePdfUrl (nullable, S3-hosted PDF the recipe was imported from — kept as a persisted attachment, shown as a download link on the detail page), tags (list of strings), yield (free text, e.g. "4 servings", nullable), calories (per serving, integer, nullable), visibility (private | public, defaults to public for new recipes), createdAt, updatedAt
- **Collection**: id, ownerId, name, description, visibility
- **CollectionRecipe**: collectionId, recipeId (join table)
- **Calendar**: id, ownerId, name, visibility, createdAt, updatedAt — a reusable weekly meal-plan template (Mon–Sun slots, not tied to a specific date)
- **CalendarEntry**: id, calendarId, recipeId, dayOfWeek (mon–sun), createdAt — a recipe assigned to a day; the same recipe can appear on multiple days or twice on one day
- **Share**: id, recipeId or collectionId or calendarId, token (for share links to public resources), createdBy, createdAt
- **Comment**: id, recipeId, authorId, parentId (nullable, self-referencing — threaded replies), body, createdAt, updatedAt
- **Rating**: recipeId, userId (composite key — one rating per user per recipe), value (1–5), createdAt, updatedAt
- **GroceryList**: id, ownerId, name, createdAt, updatedAt
- **GroceryListItem**: id, listId, recipeId (nullable — null means manually added), qty, unit, name, checked, createdAt
- **Ingredient/Unit reference tables**: global `ingredients` and `units` tables of distinct names, grown automatically as recipes are saved, powering autocomplete on the ingredient-name and unit fields

## Key Screens / Routes
- `/` — Landing/feed: public recipes + user's own recent recipes if logged in
- `/login`, `/signup` — Auth
- `/recipes/new` — Create recipe form
- `/recipes/$recipeId` — View a recipe (ingredients, steps, photo, author, share button); a 0.5x/1x/2x/custom toggle scales the displayed ingredient quantities (display-only, nothing persisted)
- `/recipes/$recipeId/edit` — Edit recipe (owner only)
- `/recipes/$recipeId/pdf` — Downloads a generated PDF of the recipe (same visibility rules as the recipe page; not a navigable page)
- `/collections` — List user's collections ("Your cookbooks" in the UI)
- `/collections/$collectionId` — View a collection and its recipes (owner controls, plus anonymous/shared viewing)
- `/calendars` — List user's weekly meal-plan calendars
- `/calendars/$calendarId` — View a calendar as a 7-day grid, add/remove/reorder recipes per day (owner controls, plus anonymous/shared viewing); any viewer who can see the calendar can bulk-add every scheduled recipe's ingredients into one of their own grocery lists in one click
- `/u/$username` — Public profile: a user's public recipes and public lists
- `/settings` — Change your username
- `/shared/$token` — Resolves a share link and redirects to the canonical recipe/collection/calendar page (no login required)
- `/grocery` — List user's grocery lists
- `/grocery/$listId` — View a grocery list: recipes' ingredients combined, manual items, check off while shopping

## Sharing Model (v1) — done
- **Public**: directly viewable by anyone at its normal URL, listed in `/recipes` browse. New recipes default to public; collections and calendars default to private.
- **Private**: visible only to the owner; not shareable.
- (An earlier "Unlisted" middle tier — visible only via a share link, not listed anywhere — was removed to keep the model to just private/public.)
- Sharing a recipe, collection, or calendar generates (or reuses) a `Share` record with a random token, one per resource; revoking deletes the row. Visibility is re-checked live on every access, so setting a resource back to private immediately invalidates any existing share link, without needing to explicitly revoke it first. Since only public resources can be shared, a share link is mostly a convenience/short-link, not a privacy boundary.
- Public profile pages (`/u/$username`) list a user's public recipes and public lists; usernames are auto-generated at signup and editable via `/settings`.

## Non-Goals (v1)
- Automatic nutrition calculation from ingredients (a recipe can optionally store a manually-entered yield and calorie count, but nothing is derived from ingredient data)
- Recipe scaling/unit conversion

## Milestones
1. Scaffold app (TanStack Start + Tailwind), basic routing shell
2. Data layer: Drizzle schema + migrations, server functions for CRUD
3. Recipe CRUD UI (create/view/edit/delete)
4. Auth (signup/login/session)
5. Collections (create, add/remove recipes)
6. Sharing — done: revocable share links for public recipes and collections, plus public profile pages (`/u/$username`).
7. Grocery lists — done: multiple named lists, add/remove a recipe's ingredients with duplicates combined (quantities are parsed as exact fractions, so whole numbers, decimals, simple fractions like "1/2", and mixed numbers like "1 1/2" all sum correctly, e.g. 1/2 + 1/4 = 3/4), manual items, check off; ingredient-name and unit autocomplete on the recipe form.
8. Recipe forking — done: clone any recipe you can see into your own private copy, referencing the original; the original's page lists its forks (visible ones only).
9. Polish — done: exact tag/visibility filters plus free-text search (title/description) on `/recipes`, with lightweight client-side search on collections and profile pages; responsive layout (mobile nav, wrapping rows, responsive grids/padding) across the app; empty-state messaging on every list view.
10. Calendars — reusable weekly meal-plan templates (Mon–Sun slots, multiple recipes per day), shareable like collections via public/private visibility plus revocable links.
11. Recipe import — done: transcribe a recipe from an uploaded PDF via the same Claude pipeline used for handwritten photos, with the PDF kept as a persisted, downloadable attachment on the recipe. A `sourceUrl` field records a recipe's origin link (shown on the detail page); a matching web-scraping importer (Claude's `web_fetch` tool) is built but not yet wired into the UI — disabled because many recipe sites (e.g. allrecipes.com) block Claude's fetch requests outright (`url_not_allowed`), so it only works reliably against a minority of sites (Wikibooks-style pages worked in testing). Revisit if/when `web_fetch` gains broader site support.
12. Recipe export — done: a "Print to PDF" button on the recipe detail page generates a real, downloadable PDF (title, ingredients, steps, photos, source attribution) server-side via `@react-pdf/renderer`, respecting the same public/private visibility rules as the page itself.
13. Visibility simplification — done: removed the "unlisted" tier, leaving just private/public across recipes, collections, and calendars; new recipes now default to public (collections/calendars still default to private).
14. Recipe scaling — done: a 0.5x/1x/2x/custom toggle on the recipe detail page scales displayed ingredient quantities on the fly (page-local, not persisted). The fraction-parsing math from milestone 7 was extracted into a shared `src/recipes/quantity.ts` module so both the server-side grocery summing and this client-side scaling reuse the same exact-rational arithmetic; a custom factor field accepts whole numbers, decimals, or fractions (e.g. "3/4"). Non-numeric quantities (e.g. "pinch") are left unchanged at any scale.
15. Calendar-to-grocery-list bulk add — done: a widget on the calendar page adds every scheduled recipe's ingredients to a chosen (or new) grocery list in one click, available to any viewer who can see the calendar (owner or via share link), not just the owner. Ingredients are added once per scheduled instance (not deduped by recipe), so a recipe planned on 3 different days contributes its ingredients 3 times — the existing quantity-summing logic then correctly totals the week's shopping list. Not idempotent by design: re-clicking adds everything again.
16. Calendar entry reordering — done: recipes within a single calendar day can be reordered (owner only) via ↑/↓ buttons next to the existing remove button, backed by a `position` column on `calendarEntries` and a neighbor-swap update (no drag-and-drop dependency — the first manual-ordering feature in the app). New entries append after the current max position for that day; removing an entry leaves a harmless gap since ordering only needs relative order, not contiguity.
17. Paste-to-import + new-recipe chooser — done: `/recipes/new` now opens with an upfront choice — import from photo, import from PDF, import from pasted text, or start from a blank form — instead of always showing the full form. Paste-to-import is a new capability reusing the same Claude transcription pipeline as photos/PDF (`transcribeRecipeText`, same shared schema and prompt/preview/apply conventions); each import screen has "← Back" and "Skip, fill in manually" links. Only the photo importer stays visible once you reach the full form (to add more photos to transcribe); the PDF and paste-text importers are reachable only through their dedicated chooser screens, not shown again inline on the form. `/recipes/$recipeId/edit` keeps only the photo importer above the form for the same reason — editing already has content, and there's no chooser there.
18. Notifications — done: a recipe owner gets an in-app notification when someone else comments on, forks, or rates their recipe (self-actions on your own recipe never notify you). A bell icon in the header (always visible, not tucked behind the mobile hamburger menu) shows an unread-count badge and links to `/notifications`, which lists recent activity newest-first and auto-marks everything read on visit. Re-rating a recipe you've already rated doesn't spam a second notification — only the first rating per user/recipe fires one. Email is out of scope for now (no email-sending infrastructure exists in the app yet); `users.email` is already captured via Google OAuth for whenever that's added.
19. Cookbook PDF export — done: a "Print to PDF" link on a cookbook (collection) page bundles every recipe in it into one PDF — a cover page (name, owner, recipe count, table of contents) followed by one full recipe page per item, reusing the exact same per-recipe layout as the existing single-recipe export (`RecipePdfPage`, extracted from `RecipePdfDocument` so both share one implementation). A recipe the viewer can no longer access (e.g. added while public, later made private by its owner) is silently omitted from the generated PDF rather than erroring or leaking its content — mirrors the fact that its own page wouldn't be viewable either.
20. Extended nutrition info — done: protein/carbs/fat (grams per serving) join calories as recipe fields, filled in by hand or estimated by Claude alongside calories during photo/PDF/text import (and the disabled URL-scraping module, kept in parity though still unwired). Displayed as a second meta line under yield/calories on the recipe detail page and in both PDF exports, omitting any of the three that are unset; like calories, none of the three are affected by the 0.5x/2x/custom scaling toggle.
21. Transcription source URL + ingredient normalization — done: photo/PDF/text import now also extracts a source URL when one is written or shown in the input (printed on a card/PDF, mentioned in pasted text), filling the recipe's existing Source URL field automatically. Separately, transcription now normalizes each ingredient's name and unit to a clean, singular, standard form (e.g. "onions"/"diced onion" → "onion", "tbsp" → "tablespoon") and is given the app-wide list of previously-used ingredient/unit names as a hint to reuse an exact existing spelling when the ingredient is the same thing — so recipes imported at different times combine correctly into one summed line on a shared grocery list instead of staying split by wording differences. Verified end-to-end: two separately-imported recipes sharing "onion" combined into a single "3" line on a shared grocery list.
22. Admin override — done: a new `users.isAdmin` flag (set via a one-off direct DB update — no in-app UI to grant it) lets an admin open any recipe, cookbook, calendar, or grocery list directly by its URL and view, edit, and delete it, bypassing the normal owner/private-visibility check. The bypass is scoped narrowly: browse listings (homepage, `/recipes`, `/collections`, profile pages) are unaffected and still only show public + own content to everyone including admins — the override only kicks in once an admin is looking at one specific item by URL, not a "see everything" moderation dashboard. Share-link creation/revocation stays owner-only even for admins. A "Viewing as admin" banner appears whenever an admin is looking at something they don't own. Comments and ratings on a recipe (which independently re-check recipe visibility before loading/posting) needed the same bypass threaded through — the first end-to-end test caught this: `getRecipe` succeeded but the recipe page still 404'd because `listComments`/`getRatingSummary`, loaded in parallel by the same route, weren't yet admin-aware.
23. Admin panel — done: a `/admin` page (nav-linked only for admins) lists every user with a one-click "Make admin"/"Revoke admin" toggle, replacing the manual DB update milestone 22 shipped with. An admin can't see a toggle on their own row (shows "You" instead) — the server function also rejects a self-targeted change outright — since accidentally revoking your own access with no other admin around would strand the app back at manual-DB-only.
