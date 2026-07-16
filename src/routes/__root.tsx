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
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    setPending(true)
    try {
      await logoutFn()
      await router.invalidate()
    } finally {
      setPending(false)
      setMenuOpen(false)
    }
  }

  function renderNavLinks(currentUser: NonNullable<typeof user>) {
    return (
      <>
        <Link
          to="/collections"
          onClick={() => setMenuOpen(false)}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Your cookbooks
        </Link>
        <Link
          to="/grocery"
          onClick={() => setMenuOpen(false)}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Grocery lists
        </Link>
        <Link
          to="/calendars"
          onClick={() => setMenuOpen(false)}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Calendars
        </Link>
        <Link
          to="/settings"
          onClick={() => setMenuOpen(false)}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Settings
        </Link>
        {currentUser.avatarUrl && (
          <img src={currentUser.avatarUrl} alt="" className="h-7 w-7 rounded-full ring-2 ring-accent-100" />
        )}
        {currentUser.username ? (
          <Link
            to="/u/$username"
            params={{ username: currentUser.username }}
            onClick={() => setMenuOpen(false)}
            className="text-sm text-ink/80"
          >
            {currentUser.name}
          </Link>
        ) : (
          <span className="text-sm text-ink/80">{currentUser.name}</span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={pending}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400 disabled:opacity-50"
        >
          {pending ? 'Signing out...' : 'Sign out'}
        </button>
      </>
    )
  }

  return (
    <header className="relative flex items-center justify-between border-b border-accent-100 bg-paper px-4 py-4 sm:px-8">
      <Link to="/" className="font-serif text-xl font-semibold tracking-tight text-ink">
        Recipe Keeper
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle initialTheme={theme} />
        {user ? (
          <>
            <div className="hidden items-center gap-3 sm:flex">{renderNavLinks(user)}</div>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400 sm:hidden"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </>
        ) : (
          <a
            href="/auth/google"
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Sign in with Google
          </a>
        )}
      </div>
      {user && menuOpen && (
        <div className="absolute inset-x-0 top-full flex flex-col gap-3 border-b border-accent-100 bg-paper px-4 py-4 sm:hidden">
          {renderNavLinks(user)}
        </div>
      )}
    </header>
  )
}
