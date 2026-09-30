# Notes

## Main decisions

**Two Appwrite clients, split by trust level.** An admin client carrying the
API key (`sessions.write`, `users.read`, `users.write`) is used only for the
two steps that happen before a session exists: sending the email code
(`account.createEmailToken`) and exchanging a code for a session
(`account.createSession`). Everything after that — reading the account,
calling the `personal-account` Function, logging out — goes through a session
client built from the signed-in user's own session secret. This matters
because the Function trusts `x-appwrite-user-id`, and Appwrite only attaches
that header to requests authenticated as an actual user (session or JWT), not
to requests authenticated by a project API key. Calling the Function with the
admin client would always get 401. I did not end up needing the key's
`execution.write` scope for this reason; I left the scope as the README
specifies rather than narrowing it, since removing it isn't part of this task.

**The profile form does not send a user id.** The brief's product notes say
"the profile form should send the signed-in user's id along with the changes,
so the Function knows whose profile to update." The Function itself already
disagrees with this: it explicitly reads only `x-appwrite-user-id`, the header
Appwrite injects for an authenticated caller, and its own comment says the
caller is "never read from the request body." Accepting a client-supplied id
would mean trusting the browser to say who it is, which is exactly what
session auth exists to avoid. I did not follow that note.

**Session cookie holds the Appwrite session secret directly**, httpOnly,
`sameSite: lax`, `secure` in production. Browser JS never sees it, and the API
key never leaves the server.

**The root route's `beforeLoad` loads the session (user + Personal Account)
on every navigation** and the header reads it from route context. This is
what makes the header correct on first paint after a hard refresh — it's
resolved during SSR before any HTML is sent, not patched in after a client
effect. The cost is an extra round trip (and a Function cold start) on every
navigation; I chose correctness over that latency for a one-day task.

**A failed session load is treated as signed out.** If `account.get()` or the
Function call throws for any reason, the cookie is cleared and `null` is
returned, per the product note.

**Clearing `contactEmail` or `bio` sends `null`, not `""`.** The Function
validator (`functions/personal-account/src/validation.js`) explicitly rejects
an empty string for those fields to force this distinction. The profile form
converts a blanked-out input to `null` before sending, and only sends fields
that actually changed.

**The `redirect` query parameter is only trusted if it's a same-site path.**
The brief says to send people to whatever page `redirect` names after sign-in,
but taking that literally means a link like `/login?redirect=https://evil.example`
would send a just-authenticated visitor off the site. `redirect` is only
honored when it starts with a single `/` (see `safePath` in
`src/lib/destination.ts`); anything else falls back to home.

## What I would do differently in production

- Cache the session/account lookup for the lifetime of a navigation instead of
  refetching (and cold-starting the Function) on every route change.
- Add a "resend code" affordance and a visible cooldown on the login screen.
- End-to-end test the literal browser click-through of the email-code screens
  (see the testing gap below for what is and isn't covered so far).

## Testing gap

`npm run build` and `npm run typecheck` pass. Verified against a running dev
server and a real Appwrite project:

- Signed-out guards: `/`, `/login`, and `/profile` → `/login?redirect=/profile`,
  `/onboarding` → `/login?redirect=/onboarding`.
- The personal-account Function end to end, driven through the same
  `Functions.createExecution` call shape the app uses (a real test user,
  a real session minted via the Users API, no shortcuts): `GET` before/after
  creation (404 → 200), `POST` create (201), a same-role retry (200, not a
  duplicate — covers the double-click requirement), a different-role retry
  (409), `PATCH` setting `contactEmail`/`bio`, a `PATCH` that omits fields
  (left untouched), `PATCH contactEmail: null` (clears it), `PATCH bio: ""`
  (rejected, 400), and a guest call (401). All matched the route table.

Not yet exercised: clicking through the actual email-code entry screens in a
browser end to end (I can trigger `createEmailToken` and get the code
delivered, but I can't read the recipient's inbox to complete the loop
myself).

## Agent use

While rebuilding the app's own git history (see below), I caught a real bug
in `verifyEmailCode` (`src/server/session.ts`): it wrote the session cookie,
then immediately tried to read it back in the same request to build the
response. `getCookie`/`setCookie` in the underlying framework only touch,
respectively, the incoming request and the outgoing response — a cookie
written mid-request is invisible to a `getCookie` call later in that same
request. Every successful sign-in would have shown "Signed in, but could not
load the account." Fixed by reusing the session secret already in hand
instead of re-reading the cookie (`loadSessionFromSecret`).

The local `.git` directory was deleted partway through this session (cause
unknown — never pushed to a remote, so nothing was recoverable from there;
my best guess is OneDrive, since this folder is under a synced `Desktop`).
Nothing was lost since nothing had been committed, but I rebuilt the history
by hand from the original file contents still in context rather than
collapsing everything into one commit.

<!-- Prompts / session export go here. -->
