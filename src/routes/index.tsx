import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
      <p className="mt-4 text-lg">
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
      <Link
        to="/recipes/new"
        className="mt-6 inline-block rounded bg-blue-600 px-4 py-2 font-medium text-white"
      >
        New recipe
      </Link>
    </div>
  )
}
