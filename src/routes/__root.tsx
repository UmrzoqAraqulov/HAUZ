import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  type ErrorComponentProps,
} from '@tanstack/react-router'

import { Header } from '#/components/Header'
import { currentUserQuery } from '#/lib/current-user'

import appCss from '../styles.css?url'

// Inline, so the browser never requests /favicon.ico. That request would
// render the 404 page on the server, and with it a current-user lookup.
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='4' y='4' width='24' height='24' rx='7' fill='%23b4532a'/%3E%3C/svg%3E"

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Runs on the server for the first paint (so the header is right after a
  // hard refresh) and before every client navigation, where the cache answers.
  beforeLoad: async ({ context }) => ({
    user: await context.queryClient.fetchQuery(currentUserQuery),
  }),
  // Every page shows the signed-in person in the header, so no shared cache
  // (a CDN or proxy) may store a page and serve it to someone else.
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'HAUZ' },
    ],
    links: [
      { rel: 'icon', href: FAVICON },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <p className="lede">The page you are looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn btn-primary btn-inline">
        Go home
      </Link>
    </main>
  )
}

// Replaces the router's default, which prints the raw error message on the page.
function ErrorPage({ error, reset }: ErrorComponentProps) {
  console.error(error)

  return (
    <main>
      <h1>Something went wrong</h1>
      <p className="lede">Please try again. If it keeps happening, reload the page.</p>
      <button type="button" className="btn btn-primary btn-inline" onClick={reset}>
        Try again
      </button>
    </main>
  )
}
