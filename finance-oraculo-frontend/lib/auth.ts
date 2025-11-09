export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const STORAGE_KEY = "finance-oraculo.auth";
let inMemoryTokens: AuthTokens | null = null;

export function saveAuthTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  const payload: AuthTokens = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000
  };
  inMemoryTokens = payload;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
  return payload;
}

export function setAuthTokens(tokens: AuthTokens | null) {
  inMemoryTokens = tokens;
  if (typeof window === "undefined") return;

  if (!tokens) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function loadAuthTokens(): AuthTokens | null {
  if (inMemoryTokens) return inMemoryTokens;
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthTokens;
    if (!parsed.expiresAt && (parsed as any).expiresIn) {
      parsed.expiresAt = Date.now() + Number((parsed as any).expiresIn) * 1000;
    }
    inMemoryTokens = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthTokens() {
  inMemoryTokens = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAuthTokens(): AuthTokens | null {
  return loadAuthTokens();
}

export function getAccessToken(): string | null {
  const tokens = getAuthTokens();
  return tokens?.accessToken ?? null;
}

export function isAccessTokenExpired(tokens: AuthTokens | null) {
  if (!tokens) return true;
  return Date.now() >= tokens.expiresAt;
}
