# Recipe Keeper — Design Plan

## Overview
Recipe Keeper is a web app for creating, organizing, and sharing recipes. Users can write up recipes with ingredients and steps, organize them into collections, and share them publicly or with specific people via a link.

## Goals
- Let a user quickly capture a recipe (title, ingredients, steps, photo, tags).
- Let a user share a single recipe or a collection via a public link.
- Let other users discover and save (fork/bookmark) recipes shared with them.
- Let a user build a grocery list from one or more recipes, with duplicate ingredients combined.
- Keep the initial scope small: no meal planning or nutrition calculators in v1.

## Tech Stack
- **Framework**: TanStack Start (React + TanStack Router, full-stack, SSR)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data fetching/mutations**: TanStack Query + Start server functions
- **Database**: Postgres (via Drizzle ORM); local dev via `docker-compose.yml`, prod via managed Render Postgres
- **Auth**: Google OAuth sign-in, server-side sessions (HttpOnly cookie, session id hashed at rest)
- **AI**: Claude API (claude-opus-4-8, vision + structured outputs) — transcribes handwritten recipe photos into the recipe record via an owner-only "Process photos" button with preview-then-confirm
- **Deployment target**: Vercel (via the Nitro Vite plugin) + Neon Postgres; `render.yaml` kept as an alternative. Recipe photos stored in S3.

## Core Data Model
- **User**: id, email, name, username (unique, auto-generated on signup, editable), avatarUrl, createdAt
- **Recipe**: id, ownerId, title, description, ingredients (list of {qty, unit, name}), steps (ordered list of strings), photoUrl, tags (list of strings), visibility (private | unlisted | public), createdAt, updatedAt
- **Collection**: id, ownerId, name, description, visibility
- **CollectionRecipe**: collectionId, recipeId (join table)
- **Share**: id, recipeId or collectionId, token (for unlisted link sharing), createdBy, createdAt
- **SavedRecipe**: userId, recipeId, savedAt (bookmark/fork tracking)
- **Comment**: id, recipeId, authorId, parentId (nullable, self-referencing — threaded replies), body, createdAt, updatedAt
- **Rating**: recipeId, userId (composite key — one rating per user per recipe), value (1–5), createdAt, updatedAt
- **GroceryList**: id, ownerId, name, createdAt, updatedAt
- **GroceryListItem**: id, listId, recipeId (nullable — null means manually added), qty, unit, name, checked, createdAt
- **Ingredient/Unit reference tables**: global `ingredients` and `units` tables of distinct names, grown automatically as recipes are saved, powering autocomplete on the ingredient-name and unit fields

## Key Screens / Routes
- `/` — Landing/feed: public recipes + user's own recent recipes if logged in
- `/login`, `/signup` — Auth
- `/recipes/new` — Create recipe form
- `/recipes/$recipeId` — View a recipe (ingredients, steps, photo, author, share button)
- `/recipes/$recipeId/edit` — Edit recipe (owner only)
- `/collections` — List user's collections
- `/collections/$collectionId` — View a collection and its recipes (owner controls, plus anonymous/shared viewing)
- `/u/$username` — Public profile: a user's public recipes and public lists
- `/settings` — Change your username
- `/shared/$token` — Resolves a share link and redirects to the canonical recipe/collection page (no login required)
- `/grocery` — List user's grocery lists
- `/grocery/$listId` — View a grocery list: recipes' ingredients combined, manual items, check off while shopping

## Sharing Model (v1) — done
- **Public**: directly viewable by anyone at its normal URL, listed in `/recipes` browse.
- **Unlisted**: not listed anywhere; reachable only via a valid share link (`/shared/:token`), which redirects to the normal page with the token attached.
- **Private**: visible only to the owner; not shareable.
- Sharing a recipe or collection generates (or reuses) a `Share` record with a random token, one per resource; revoking deletes the row. Visibility is re-checked live on every access, so setting a resource back to private immediately invalidates any existing share link, without needing to explicitly revoke it first.
- Public profile pages (`/u/$username`) list a user's public recipes and public lists; usernames are auto-generated at signup and editable via `/settings`.

## Non-Goals (v1)
- Nutrition facts / calorie calculation
- Meal planning calendar
- Recipe scaling/unit conversion

## Milestones
1. Scaffold app (TanStack Start + Tailwind), basic routing shell
2. Data layer: Drizzle schema + migrations, server functions for CRUD
3. Recipe CRUD UI (create/view/edit/delete)
4. Auth (signup/login/session)
5. Collections (create, add/remove recipes)
6. Sharing — done: revocable public/unlisted links for recipes and collections, plus public profile pages (`/u/$username`).
7. Grocery lists — done: multiple named lists, add/remove a recipe's ingredients with duplicates combined, manual items, check off; ingredient-name and unit autocomplete on the recipe form.
8. Polish: search/filter by tag, responsive styling, empty states
