# Recipe Keeper — Design Plan

## Overview
Recipe Keeper is a web app for creating, organizing, and sharing recipes. Users can write up recipes with ingredients and steps, organize them into collections, and share them publicly or with specific people via a link.

## Goals
- Let a user quickly capture a recipe (title, ingredients, steps, photo, tags).
- Let a user share a single recipe or a collection via a public link.
- Let other users discover and save (fork/bookmark) recipes shared with them.
- Keep the initial scope small: no meal planning, grocery lists, or nutrition calculators in v1.

## Tech Stack
- **Framework**: TanStack Start (React + TanStack Router, full-stack, SSR)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data fetching/mutations**: TanStack Query + Start server functions
- **Database**: Postgres (via Drizzle ORM); local dev via `docker-compose.yml`, prod via managed Render Postgres
- **Auth**: Google OAuth sign-in, server-side sessions (HttpOnly cookie, session id hashed at rest)
- **AI**: Claude API (claude-opus-4-8, vision + structured outputs) — transcribes handwritten recipe photos into the recipe record via an owner-only "Process photos" button with preview-then-confirm
- **Deployment target**: Render (see `render.yaml`) — Node service + managed Postgres + disk for uploaded photos

## Core Data Model
- **User**: id, email, name, avatarUrl, createdAt
- **Recipe**: id, ownerId, title, description, ingredients (list of {qty, unit, name}), steps (ordered list of strings), photoUrl, tags (list of strings), visibility (private | unlisted | public), createdAt, updatedAt
- **Collection**: id, ownerId, name, description, visibility
- **CollectionRecipe**: collectionId, recipeId (join table)
- **Share**: id, recipeId or collectionId, token (for unlisted link sharing), createdBy, createdAt
- **SavedRecipe**: userId, recipeId, savedAt (bookmark/fork tracking)
- **Comment**: id, recipeId, authorId, parentId (nullable, self-referencing — threaded replies), body, createdAt, updatedAt
- **Rating**: recipeId, userId (composite key — one rating per user per recipe), value (1–5), createdAt, updatedAt

## Key Screens / Routes
- `/` — Landing/feed: public recipes + user's own recent recipes if logged in
- `/login`, `/signup` — Auth
- `/recipes/new` — Create recipe form
- `/recipes/$recipeId` — View a recipe (ingredients, steps, photo, author, share button)
- `/recipes/$recipeId/edit` — Edit recipe (owner only)
- `/collections` — List user's collections
- `/collections/$collectionId` — View a collection and its recipes
- `/u/$username` — Public profile: a user's public recipes
- `/shared/$token` — View an unlisted recipe/collection via share link (no login required)

## Sharing Model (v1)
- **Public**: visible on the owner's public profile and in search/feed.
- **Unlisted**: only accessible via a generated share link (`/shared/:token`); not indexed or listed.
- **Private**: visible only to the owner.
- Sharing a recipe generates a `Share` record with a random token; revoking sharing deletes/invalidates the token.

## Non-Goals (v1)
- Nutrition facts / calorie calculation
- Meal planning calendar
- Grocery list generation
- Recipe scaling/unit conversion

## Milestones
1. Scaffold app (TanStack Start + Tailwind), basic routing shell
2. Data layer: Drizzle schema + migrations, server functions for CRUD
3. Recipe CRUD UI (create/view/edit/delete)
4. Auth (signup/login/session)
5. Collections (create, add/remove recipes)
6. Sharing (public/unlisted links, public profile page)
7. Polish: search/filter by tag, responsive styling, empty states
