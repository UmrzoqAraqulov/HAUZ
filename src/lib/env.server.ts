// Server-only: these values must never reach the browser bundle.

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in (see README.md).`)
  }
  return value
}

export const serverEnv = {
  get endpoint() {
    return required('APPWRITE_ENDPOINT')
  },
  get projectId() {
    return required('APPWRITE_PROJECT_ID')
  },
  get apiKey() {
    return required('APPWRITE_API_KEY')
  },
  get functionId() {
    return required('APPWRITE_FUNCTION_ID')
  },
}
