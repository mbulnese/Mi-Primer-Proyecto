const KEY = "kb_user_session";

export function saveUserSession(user) {
  try { localStorage.setItem(KEY, JSON.stringify(user)); } catch {}
}

export function getUserSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUserSession() {
  try { localStorage.removeItem(KEY); } catch {}
}
