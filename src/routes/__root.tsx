import { useEffect, useRef, useState } from 'react'
import { HeadContent, Scripts, createRootRoute, Link, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useServerFn } from '@tanstack/react-start'
import { Bell } from 'lucide-react'
import { getSessionUser, logout } from '#/auth/auth.functions'
import { getImpersonationStatus, endImpersonation } from '#/auth/impersonation.functions'
import { getThemePreference } from '#/theme/theme.functions'
import { ThemeToggle } from '#/theme/ThemeToggle'
import { getUnreadNotificationCount } from '#/notifications/notifications.functions'

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
        title: 'LemmeCook',
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
        href: 'https://fonts.googleapis.com/css2?family=Bitter:wght@600;700&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  loader: async () => {
    const [user, theme, unreadCount, impersonationStatus] = await Promise.all([
      getSessionUser(),
      getThemePreference(),
      getUnreadNotificationCount(),
      getImpersonationStatus(),
    ])
    return { user, theme, unreadCount, impersonationStatus }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { user, theme, unreadCount, impersonationStatus } = Route.useLoaderData()
  const router = useRouter()
  const isCookMode = /^\/recipes\/[^/]+\/cook$/.test(router.state.location.pathname)

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
        {!isCookMode && (
          <AuthHeader user={user} theme={theme} unreadCount={unreadCount} impersonationStatus={impersonationStatus} />
        )}
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

function CookbooksNavLink({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleSelect() {
    setOpen(false)
    onNavigate()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        Cookbooks
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-44 rounded-lg border-2 border-accent-200 bg-paper p-2 shadow-lg">
          <Link
            to="/collections"
            onClick={handleSelect}
            className="block rounded-md px-2 py-1.5 text-sm font-medium text-accent-600 hover:bg-accent-50"
          >
            My Cookbooks
          </Link>
          <Link
            to="/collections/browse"
            onClick={handleSelect}
            className="block rounded-md px-2 py-1.5 text-sm font-medium text-accent-600 hover:bg-accent-50"
          >
            Browse Cookbooks
          </Link>
          <Link
            to="/collections/saved"
            onClick={handleSelect}
            className="block rounded-md px-2 py-1.5 text-sm font-medium text-accent-600 hover:bg-accent-50"
          >
            Saved Cookbooks
          </Link>
        </div>
      )}
    </div>
  )
}

function NotificationBell({ unreadCount, onNavigate }: { unreadCount: number; onNavigate?: () => void }) {
  return (
    <Link to="/notifications" onClick={onNavigate} className="relative text-accent-600 hover:text-accent-700 dark:hover:text-accent-400">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}

function AuthHeader({
  user,
  theme,
  unreadCount,
  impersonationStatus,
}: {
  user: Awaited<ReturnType<typeof getSessionUser>>
  theme: Awaited<ReturnType<typeof getThemePreference>>
  unreadCount: number
  impersonationStatus: Awaited<ReturnType<typeof getImpersonationStatus>>
}) {
  const router = useRouter()
  const logoutFn = useServerFn(logout)
  const endImpersonationFn = useServerFn(endImpersonation)
  const [pending, setPending] = useState(false)
  const [endingImpersonation, setEndingImpersonation] = useState(false)
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

  async function handleEndImpersonation() {
    setEndingImpersonation(true)
    try {
      await endImpersonationFn()
      // Full reload, not router.invalidate() — any page's local state seeded from the
      // impersonated user (e.g. settings.tsx's username/notification fields) needs a fresh
      // mount to pick up the restored admin identity.
      window.location.reload()
    } catch {
      setEndingImpersonation(false)
    }
  }

  function renderNavLinks(currentUser: NonNullable<typeof user>) {
    return (
      <>
        <CookbooksNavLink onNavigate={() => setMenuOpen(false)} />
        <Link
          to="/grocery"
          onClick={() => setMenuOpen(false)}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Grocery lists
        </Link>
        <Link
          to="/pantry"
          onClick={() => setMenuOpen(false)}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Pantry
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
        {currentUser.isAdmin && (
          <Link
            to="/admin"
            onClick={() => setMenuOpen(false)}
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Admin
          </Link>
        )}
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
    <>
      <header className="relative flex items-center justify-between border-b-2 border-accent-200 bg-paper px-4 py-4 sm:px-8">
        <Link to="/" className="font-serif text-xl font-semibold tracking-tight text-ink">
          LemmeCook
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/about"
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            About
          </Link>
          <ThemeToggle initialTheme={theme} />
          {user ? (
            <>
              <NotificationBell unreadCount={unreadCount} />
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
          <div className="absolute inset-x-0 top-full flex flex-col gap-3 border-b-2 border-accent-200 bg-paper px-4 py-4 sm:hidden">
            {renderNavLinks(user)}
          </div>
        )}
      </header>
      {user && impersonationStatus.isImpersonating && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-b-2 border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-900">
          <span>
            Viewing as <strong>{user.name}</strong>
            {impersonationStatus.realUserName && ` (impersonated by ${impersonationStatus.realUserName})`}
          </span>
          <button
            type="button"
            onClick={() => void handleEndImpersonation()}
            disabled={endingImpersonation}
            className="font-medium underline hover:no-underline disabled:opacity-50"
          >
            {endingImpersonation ? 'Ending...' : 'End impersonation'}
          </button>
        </div>
      )}
      <div className="ribbon-divider" />
    </>
  )
}
