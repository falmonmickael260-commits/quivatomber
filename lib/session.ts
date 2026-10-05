export interface Session {
  code: string;
  playerId: string;
  token: string;
}

const KEY = "qvt_session";

export function saveSession(code: string, playerId: string, token: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, playerId, token }));
  } catch {}
}

export function loadSession(code?: string): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (code && s.code?.toUpperCase() !== code.toUpperCase()) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
