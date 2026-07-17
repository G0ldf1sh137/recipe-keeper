# LemmeCook

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
- `S3_BUCKET` / `S3_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — recipe photos are stored in S3; see below

### S3 bucket setup

Recipe photos upload to S3 and are served directly from there (no local disk
storage). The app only ever validates and uploads bytes server-side — it never
trusts a client-supplied file type — so the bucket just needs to allow public
reads on uploaded objects:

1. Create a bucket (e.g. `aws s3api create-bucket --bucket recipe-keeper --region us-east-2 --create-bucket-configuration LocationConstraint=us-east-2`).
2. Under **Block Public Access**, uncheck "Block public access to buckets and objects granted through new public bucket policies" (and the matching "existing" checkbox).
3. Add a bucket policy allowing public `GetObject`:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::recipe-keeper/*"
       }
     ]
   }
   ```
4. Create an IAM user (or role) with a policy scoped to `s3:PutObject` and `s3:GetObject` on `arn:aws:s3:::recipe-keeper/*`, and generate an access key pair for `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.

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

### Vercel (current)

TanStack Start deploys to Vercel via the [Nitro](https://nitro.build) Vite
plugin (already wired up in `vite.config.ts`) — Vercel auto-detects it and
builds with zero extra config.

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo.
2. Add a Postgres database: project → **Storage** tab → **Neon** (free plan)
   — this wires up `DATABASE_URL` automatically.
3. Project → **Settings → Environment Variables** → add `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `ANTHROPIC_API_KEY`,
   `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (see
   `.env.example` and the S3 setup section above).
4. Update `GOOGLE_REDIRECT_URI` to match the assigned `*.vercel.app` domain
   (or your custom domain), and add the same URI to the Google Cloud Console
   OAuth client's Authorized redirect URIs.
5. Run migrations against the deployed database once: `DATABASE_URL=<from Vercel> npm run db:migrate`.

## Project structure

Each feature lives in its own directory under `src/` with a consistent shape:
`schemas.ts` (Zod validation), `<feature>.server.ts` (DB access), and
`<feature>.functions.ts` (TanStack Start server functions) — e.g. `src/recipes/`,
`src/comments/`, `src/ratings/`, `src/collections/`, `src/uploads/`,
`src/transcription/`. Routes live in `src/routes/` (file-based routing). The
Drizzle schema is in `src/db/schema.ts`; migrations are in `drizzle/`.

See `design-plan.md` for the original feature/design plan.
