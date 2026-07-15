import { useState } from 'react'
import { HeadContent, Scripts, createRootRoute, Link, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useServerFn } from '@tanstack/react-start'
import { getSessionUser, logout } from '#/auth/auth.functions'
import { getThemePreference } from '#/theme/theme.functions'
import { ThemeToggle } from '#/theme/ThemeToggle'

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
        title: 'Recipe Keeper',
      },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  loader: async () => {
    const [user, theme] = await Promise.all([getSessionUser(), getThemePreference()])
    return { user, theme }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { user, theme } = Route.useLoaderData()

  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : undefined} suppressHydrationWarning>
      <head>
        <HeadContent />
        {theme === 'system' && (
          <script
            // Runs before paint so a system-dark OS preference doesn't flash light first.
            dangerouslySetInnerHTML={{
              __html:
                "if (window.matchMedia('(prefers-color-scheme: dark)').matches) { document.documentElement.classList.add('dark'); }",
            }}
          />
        )}
      </head>
      <body>
        <AuthHeader user={user} theme={theme} />
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

function AuthHeader({
  user,
  theme,
}: {
  user: Awaited<ReturnType<typeof getSessionUser>>
  theme: Awaited<ReturnType<typeof getThemePreference>>
}) {
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
    <header className="flex items-center justify-between border-b border-accent-100 bg-paper px-8 py-4">
      <Link to="/" className="font-serif text-xl font-semibold tracking-tight text-ink">
        Recipe Keeper
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle initialTheme={theme} />
        {user ? (
          <div className="flex items-center gap-3">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full ring-2 ring-accent-100"
              />
            )}
            <span className="text-sm text-ink/80">{user.name}</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={pending}
              className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400 disabled:opacity-50"
            >
              {pending ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        ) : (
          <a
            href="/auth/google"
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Sign in with Google
          </a>
        )}
      </div>
    </header>
  )
}
