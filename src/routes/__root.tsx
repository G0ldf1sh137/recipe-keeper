import { useState } from 'react'
import { HeadContent, Scripts, createRootRoute, Link, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useServerFn } from '@tanstack/react-start'
import { getSessionUser, logout } from '#/auth/auth.functions'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  loader: () => getSessionUser(),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const user = Route.useLoaderData()

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthHeader user={user} />
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function AuthHeader({ user }: { user: Awaited<ReturnType<typeof getSessionUser>> }) {
  const router = useRouter()
  const logoutFn = useServerFn(logout)
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    setPending(true)
    try {
      await logoutFn()
      await router.invalidate()
    } finally {
      setPending(false)
    }
  }

  return (
    <header className="flex items-center justify-between border-b px-8 py-3">
      <Link to="/" className="font-semibold">
        Recipe Keeper
      </Link>
      {user ? (
        <div className="flex items-center gap-3">
          {user.avatarUrl && <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />}
          <span className="text-sm text-gray-700">{user.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={pending}
            className="text-sm text-blue-600 disabled:opacity-50"
          >
            {pending ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      ) : (
        <a href="/auth/google" className="text-sm text-blue-600">
          Sign in with Google
        </a>
      )}
    </header>
  )
}
