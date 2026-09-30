/**
 * Two kinds of server-side Appwrite client, matching Appwrite's SSR pattern.
 *
 * The admin client carries the API key. It is the only thing in this app that
 * knows that secret, and it is used for exactly two operations: starting an
 * email-code sign-in and exchanging a code for a session. Both happen before
 * a session cookie exists, so there is nothing else to authenticate with.
 *
 * The session client carries a signed-in user's session secret instead. Every
 * other call &mdash; reading the account, calling the personal-account
 * Function, logging out &mdash; goes through this one, so Appwrite resolves
 * the caller as that specific user. That is what lets the Function trust
 * `x-appwrite-user-id`: it only appears on requests authenticated by a real
 * user session, never by a project API key.
 */

import { Account, Client, Functions } from 'node-appwrite'

import { serverEnv } from './env.server'

function baseClient() {
  return new Client().setEndpoint(serverEnv.endpoint).setProject(serverEnv.projectId)
}

export function createAdminClient() {
  const client = baseClient().setKey(serverEnv.apiKey)
  return { account: new Account(client) }
}

export function createSessionClient(sessionSecret: string) {
  const client = baseClient().setSession(sessionSecret)
  return { account: new Account(client), functions: new Functions(client) }
}
