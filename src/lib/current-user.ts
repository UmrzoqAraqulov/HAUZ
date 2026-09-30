import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import type { PersonalAccount } from '#/lib/personal-account'
import { getCurrentUser, type CurrentUser } from '#/server/session'

// Cached for the QueryClient's staleTime (60s), so navigating around the app
// does not look the user up (and run the Function) on every page or hover.
// The brief treats a failed lookup as "signed out", so a failure resolves to null.
export const currentUserQuery = queryOptions({
  queryKey: ['current-user'],
  queryFn: () => getCurrentUser().catch(() => null),
})

// The root route loads the user before any page renders, so this never suspends.
export function useCurrentUser() {
  return useSuspenseQuery(currentUserQuery).data
}

// After sign-in, onboarding, a profile save or logout we already know the new
// state, so it is written straight into the cache instead of being refetched.
export function useCurrentUserCache() {
  const queryClient = useQueryClient()

  return {
    set(user: CurrentUser | null) {
      queryClient.setQueryData(currentUserQuery.queryKey, user)
    },
    setAccount(account: PersonalAccount) {
      queryClient.setQueryData(currentUserQuery.queryKey, (user) => (user ? { ...user, account } : user))
    },
  }
}

// For when a save reports the session is gone: forget the user and send
// them to sign in, returning to the same page afterwards.
export function useSendToSignIn() {
  const currentUserCache = useCurrentUserCache()
  const navigate = useNavigate()

  return (returnTo: string) => {
    currentUserCache.set(null)
    return navigate({ to: '/login', search: { redirect: returnTo } })
  }
}
