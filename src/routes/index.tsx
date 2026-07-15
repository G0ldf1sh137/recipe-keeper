import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
      <p className="mt-4 text-lg">
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/recipes/new"
          className="inline-block rounded bg-blue-600 px-4 py-2 font-medium text-white"
        >
          New recipe
        </Link>
        <Link
          to="/recipes"
          className="inline-block rounded border px-4 py-2 font-medium"
        >
          Browse recipes
        </Link>
      </div>
    </div>
  )
}
