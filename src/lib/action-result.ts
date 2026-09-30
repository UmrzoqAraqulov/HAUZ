// Server functions return this instead of throwing, so a form can always show a message.
export type ActionResult<T> = { ok: true; data: T } | ActionFailure

export interface ActionFailure {
  ok: false
  error: string
  message: string
}

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

export function failure(error: string, message: string): ActionFailure {
  return { ok: false, error, message }
}

// For errors nobody planned for: the detail goes to the server log only.
// Upstream error text can include internals, so it is never sent to the browser.
export function unexpectedFailure(context: string, error: unknown): ActionFailure {
  console.error(`${context}:`, error instanceof Error ? error.message : error)
  return failure('unexpected', GENERIC_ERROR_MESSAGE)
}

// Calling a server function can still throw in the browser: the network is
// down, or its validator rejected the input. Forms await this instead, so a
// thrown call becomes a normal failure and never leaves a button stuck.
export async function resultOf<T>(call: Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await call
  } catch {
    return failure('network', "We couldn't reach the server. Check your connection and try again.")
  }
}
