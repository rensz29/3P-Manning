import { useState, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useAuth.js
//
// Simple role-based auth with a single shared admin password.
// In production: replace checkPassword() with a real API call:
//   POST /api/auth/login  { password }  →  { role: 'admin' | 'user', token }
//
// Roles:
//   'guest' — not logged in, sees LoginPage
//   'user'  — sees Shift Assignment board only
//   'admin' — sees everything: board + analytics + settings + admin page
//
// The admin password is intentionally NOT stored in frontend code in production.
// Move it to your backend and validate there.
// ─────────────────────────────────────────────────────────────────────────────

// ── MOCK CREDENTIALS (replace with real backend auth) ─────────────────────────
const CREDENTIALS = [
  { username: 'supervisor', password: 'shift123', role: 'user',  displayName: 'Shift Supervisor' },
  { username: 'admin',      password: 'admin', role: 'admin', displayName: 'HRTA Admin' },
];

export function useAuth() {
  const [session, setSession] = useState(() => {
    // Persist across page refresh using sessionStorage
    try {
      const saved = sessionStorage.getItem('hrta_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((username, password) => {
    const match = CREDENTIALS.find(
      c => c.username.toLowerCase() === username.toLowerCase() && c.password === password
    );
    if (!match) return { ok: false, error: 'Invalid username or password.' };

    const newSession = {
      username:    match.username,
      displayName: match.displayName,
      role:        match.role,        // 'user' | 'admin'
      loginTime:   new Date().toISOString(),
    };
    sessionStorage.setItem('hrta_session', JSON.stringify(newSession));
    setSession(newSession);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('hrta_session');
    setSession(null);
  }, []);

  return {
    session,                              // null = guest
    isLoggedIn:  !!session,
    isAdmin:     session?.role === 'admin',
    isUser:      !!session,               // both user and admin
    displayName: session?.displayName ?? '',
    login,
    logout,
  };
}
