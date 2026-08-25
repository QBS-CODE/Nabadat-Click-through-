// Session-token storage. Clickthrough stub — kept so the ported feature api
// clients compile unchanged. No real token is ever issued in the clickthrough.

/** sessionStorage key holding the (mock) session token. */
export const SESSION_TOKEN_KEY = "session_token"

export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_TOKEN_KEY) ?? "clickthrough-mock-token"
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(SESSION_TOKEN_KEY, token)
}

export function clearSessionToken(): void {
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
}
