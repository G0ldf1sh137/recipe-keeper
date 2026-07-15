import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <h1 className="font-serif text-5xl font-semibold tracking-tight text-ink">
        Keep the recipes worth keeping.
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        Write them down, tag them, and share the ones you want the world to see.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/recipes/new"
          className="inline-block rounded-lg bg-accent-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-700"
        >
          New recipe
        </Link>
        <Link
          to="/recipes"
          className="inline-block rounded-lg border border-accent-200 px-5 py-2.5 font-medium text-ink transition-colors hover:bg-accent-50"
        >
          Browse recipes
        </Link>
      </div>
    </div>
  )
}
