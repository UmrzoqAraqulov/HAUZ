import { Link, useRouter } from '@tanstack/react-router'

import type { CurrentUser } from '#/server/session'
import { logout } from '#/server/session'

export function Header({ user }: { user: CurrentUser | null }) {
  const router = useRouter()

  async function handleLogout() {
    await logout()
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        HAUZ
      </Link>
      {user ? (
        <div className="header-actions">
          <span className="header-user">{user.account?.firstName ?? user.email}</span>
          <button type="button" className="btn btn-small" onClick={handleLogout}>
            Log out
          </button>
        </div>
      ) : (
        <Link to="/login" className="btn btn-small">
          Sign in
        </Link>
      )}
    </header>
  )
}
