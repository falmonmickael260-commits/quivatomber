export interface Session {
  code: string;
  playerId: string;
  token: string;
}

const KEY = "qvt_session";

/**
 * Session joueur (code / id / token), conservée pour se reconnecter après
 * un rafraîchissement ou une coupure réseau.
 *
 * Stockage en `sessionStorage` d'abord, car il est **propre à chaque
 * onglet** : avec `localStorage` seul, ouvrir un second onglet pour jouer
 * à plusieurs sur la même machine écrasait la session du premier, et les
 * deux onglets finissaient par se disputer le même joueur — d'où des
 * parties qui partaient en vrille et des « déconnexions » inexpliquées.
 *
 * `localStorage` sert de filet : il permet de retrouver sa partie après
 * avoir fermé l'onglet, mais il n'est consulté que si l'onglet courant
 * n'a pas déjà sa propre session.
 */
function safeGet(store: Storage | undefined, key: string) {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(store: Storage | undefined, key: string, value: string) {
  try {
    store?.setItem(key, value);
  } catch {}
}

export function saveSession(code: string, playerId: string, token: string) {
  const raw = JSON.stringify({ code, playerId, token });
  if (typeof window === "undefined") return;
  safeSet(window.sessionStorage, KEY, raw);
  safeSet(window.localStorage, KEY, raw);
}

export function loadSession(code?: string): Session | null {
  if (typeof window === "undefined") return null;

  // l'onglet courant d'abord ; le navigateur ensuite, et seulement alors
  let raw = safeGet(window.sessionStorage, KEY);
  let fromTab = true;
  if (!raw) {
    raw = safeGet(window.localStorage, KEY);
    fromTab = false;
  }
  if (!raw) return null;

  try {
    const s = JSON.parse(raw) as Session;
    if (!s?.code || !s.playerId || !s.token) return null;
    if (code && s.code.toUpperCase() !== code.toUpperCase()) return null;
    // on recopie dans l'onglet pour qu'il garde sa propre identité ensuite
    if (!fromTab) safeSet(window.sessionStorage, KEY, raw);
    return s;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
