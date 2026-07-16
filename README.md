# Recipe Keeper

A recipe-sharing web app: write up recipes with ingredients and steps, organize
them into collections, share them publicly or via a link, and let Claude
transcribe a handwritten recipe card into the record for you.

## Features

- Recipe CRUD with ingredients, ordered steps, tags, and multiple photos per
  recipe and per step
- Google OAuth sign-in with server-side sessions
- Threaded comments and 1–5 star ratings on recipes
- Collections (bookmark lists) — save recipes into named lists
- Private / unlisted / public visibility per recipe
- Light / dark / auto theme
- **AI photo transcription** — on the recipe edit page, scan a recipe's saved
  photos with Claude; if they show a handwritten recipe card, it transcribes
  the title, ingredients, steps, and tags into the edit form for review before
  you save

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React + TanStack Router, SSR)
- TypeScript, Tailwind CSS
- Postgres via [Drizzle ORM](https://orm.drizzle.team)
- [Claude API](https://platform.claude.com) (`claude-opus-4-8`, vision + structured outputs)

## Getting started

**Prerequisites:** Node 22+, Docker (for local Postgres).

```bash
npm install
docker compose up -d      # starts a local Postgres instance
cp .env.example .env      # fill in Google OAuth + Anthropic credentials
npm run db:migrate
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment variables

See `.env.example` for the full list. You'll need:

- `DATABASE_URL` — defaults to the local `docker-compose.yml` Postgres instance, no changes needed for local dev
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — from a Google Cloud OAuth client
- `ANTHROPIC_API_KEY` — only required for the photo-transcription feature

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build (used in deployment) |
| `npm run test` | Run tests (Vitest) |
| `npm run lint` / `npm run format` | Lint / format the codebase |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Drizzle Studio to browse the database |

## Deployment

`render.yaml` defines a [Render](https://render.com) Blueprint: a Node web
service, a managed Postgres database, and a persistent disk for uploaded
photos. See the comments in that file for one-time setup steps (setting
secrets, updating the OAuth redirect URI).

## Project structure

Each feature lives in its own directory under `src/` with a consistent shape:
`schemas.ts` (Zod validation), `<feature>.server.ts` (DB access), and
`<feature>.functions.ts` (TanStack Start server functions) — e.g. `src/recipes/`,
`src/comments/`, `src/ratings/`, `src/collections/`, `src/uploads/`,
`src/transcription/`. Routes live in `src/routes/` (file-based routing). The
Drizzle schema is in `src/db/schema.ts`; migrations are in `drizzle/`.

See `design-plan.md` for the original feature/design plan.
