/**
 * The only code in this app that talks to the personal-account Function.
 * Everything else (routes, forms) goes through the server functions in
 * profile.ts and session.ts, never through this module directly, and the
 * web app never touches the `personal_accounts` table.
 */

import { ExecutionMethod, type Functions } from 'node-appwrite'

import { serverEnv } from '#/lib/env.server'
import type { ActionResult, PersonalAccount, PersonalAccountRole } from '#/lib/personal-account'

async function callFunction(functions: Functions, method: ExecutionMethod, body?: unknown) {
  const execution = await functions.createExecution({
    functionId: serverEnv.functionId,
    body: body === undefined ? undefined : JSON.stringify(body),
    async: false,
    xpath: '/personal-account',
    method,
    headers: { 'content-type': 'application/json' },
  })

  const parsed = execution.responseBody ? JSON.parse(execution.responseBody) : null

  return { status: execution.responseStatusCode, body: parsed }
}

function toActionResult<T>(status: number, body: unknown, okStatuses: number[]): ActionResult<T> {
  if (okStatuses.includes(status)) {
    return { ok: true, data: body as T }
  }

  const errorBody = (body ?? {}) as {
    error?: string
    message?: string
    issues?: { field: string; message: string }[]
  }
  return {
    ok: false,
    status,
    error: errorBody.error ?? 'internal_error',
    message: errorBody.message ?? 'The personal-account Function returned an unexpected response.',
    issues: errorBody.issues,
  }
}

export async function fetchPersonalAccount(functions: Functions): Promise<PersonalAccount | null> {
  const { status, body } = await callFunction(functions, ExecutionMethod.GET)
  if (status === 404) return null
  if (status === 200) return body as PersonalAccount
  throw new Error(`Unexpected personal-account Function response: ${status}`)
}

export async function submitPersonalAccount(
  functions: Functions,
  input: { firstName: string; lastName: string; role: PersonalAccountRole },
): Promise<ActionResult<PersonalAccount>> {
  const { status, body } = await callFunction(functions, ExecutionMethod.POST, input)
  return toActionResult(status, body, [200, 201])
}

export async function editPersonalAccount(
  functions: Functions,
  input: Partial<{ firstName: string; lastName: string; contactEmail: string | null; bio: string | null }>,
): Promise<ActionResult<PersonalAccount>> {
  const { status, body } = await callFunction(functions, ExecutionMethod.PATCH, input)
  return toActionResult(status, body, [200])
}
