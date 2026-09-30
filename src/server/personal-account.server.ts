import { ExecutionMethod, type Functions } from 'node-appwrite'

import { GENERIC_ERROR_MESSAGE, failure, type ActionResult } from '#/lib/action-result'
import { serverEnv } from '#/lib/env.server'
import type { NewPersonalAccount, PersonalAccount, PersonalAccountChanges } from '#/lib/personal-account'

// The only place the web app talks to the personal-account Function. The
// personal_accounts table itself is never read or written from here.

// The Function's own messages are written for developers ("The caller owns
// no personal account yet."), so people see these instead.
const MESSAGES_BY_ERROR_CODE: Record<string, string> = {
  unauthorized: 'Your session has expired. Please sign in again.',
  invalid_request: 'Some of the details are not valid. Please check them and try again.',
  personal_account_inconsistent: 'You already have an account with a different role.',
  not_found: 'We could not find your account. Please sign in again.',
}

async function callPersonalAccountFunction(functions: Functions, method: ExecutionMethod, body?: object) {
  const execution = await functions.createExecution({
    functionId: serverEnv.functionId,
    xpath: '/personal-account',
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json' },
    async: false,
  })

  return {
    status: execution.responseStatusCode,
    body: execution.responseBody ? JSON.parse(execution.responseBody) : null,
  }
}

function toActionResult(status: number, body: unknown): ActionResult<PersonalAccount> {
  if (status === 200 || status === 201) {
    return { ok: true, data: body as PersonalAccount }
  }

  const { error = 'unexpected', message, issues } = (body ?? {}) as {
    error?: string
    message?: string
    issues?: unknown
  }
  console.error(`personal-account Function answered ${status} (${error}):`, message, issues ?? '')
  return failure(error, MESSAGES_BY_ERROR_CODE[error] ?? GENERIC_ERROR_MESSAGE)
}

// null means the person has not onboarded yet, which is normal.
export async function getPersonalAccount(functions: Functions): Promise<PersonalAccount | null> {
  const { status, body } = await callPersonalAccountFunction(functions, ExecutionMethod.GET)
  if (status === 404) return null
  if (status === 200) return body as PersonalAccount
  throw new Error(`personal-account Function answered GET with ${status}`)
}

// Safe to repeat: the Function answers 200 with the existing account instead of creating a second one.
export async function createPersonalAccount(functions: Functions, account: NewPersonalAccount) {
  const { status, body } = await callPersonalAccountFunction(functions, ExecutionMethod.POST, account)
  return toActionResult(status, body)
}

export async function updatePersonalAccount(functions: Functions, changes: PersonalAccountChanges) {
  const { status, body } = await callPersonalAccountFunction(functions, ExecutionMethod.PATCH, changes)
  return toActionResult(status, body)
}
