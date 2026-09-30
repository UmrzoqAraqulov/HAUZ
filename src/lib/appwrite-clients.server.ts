import { Account, Client, Functions } from 'node-appwrite'

import { serverEnv } from './env.server'

function createBaseClient() {
  return new Client().setEndpoint(serverEnv.endpoint).setProject(serverEnv.projectId)
}

// Uses the API key. Only needed before a session exists: to send the email
// code and to exchange that code for a session.
export function createAdminClient() {
  return { account: new Account(createBaseClient().setKey(serverEnv.apiKey)) }
}

// Acts as the signed-in user. The personal-account Function trusts
// x-appwrite-user-id, which Appwrite only sets for calls made this way.
export function createSessionClient(sessionSecret: string) {
  const client = createBaseClient().setSession(sessionSecret)
  return { account: new Account(client), functions: new Functions(client) }
}
