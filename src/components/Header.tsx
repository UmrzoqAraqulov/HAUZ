import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { useCurrentUser, useCurrentUserCache } from '#/lib/current-user'
import { logout } from '#/server/session'

export function Header() {
  const user = useCurrentUser()
  const currentUserCache = useCurrentUserCache()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutFailed, setLogoutFailed] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutFailed(false)
    try {
      await logout()
      currentUserCache.set(null)
      await navigate({ to: '/' })
    } catch {
      // Keep showing them as signed in: the cookie may still be valid.
      setLogoutFailed(true)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        HAUZ
      </Link>

      <nav className="header-actions">
        {user ? (
          <>
            {logoutFailed && (
              <span className="header-error" role="alert">
                Couldn't log out. Try again.
              </span>
            )}
            {user.account ? (
              <Link to="/profile" className="header-user">
                {user.account.firstName}
              </Link>
            ) : (
              <span className="header-user">{user.email}</span>
            )}
            <button type="button" className="btn btn-small" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-small">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  )
}
