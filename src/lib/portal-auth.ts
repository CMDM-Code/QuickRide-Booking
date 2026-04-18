'use client';

export type PortalRole = 'admin' | 'staff';

export interface PortalSession {
  authenticated: boolean;
  role: PortalRole;
  userId?: string;
  email?: string;
  loginTime: string;
}

const PORTAL_SESSION_KEY = 'quickride_portal_session';
const LEGACY_ADMIN_KEY = 'quickride_admin_session';
const LEGACY_STAFF_KEY = 'quickride_staff_session';

export function getPortalSession(): PortalSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(PORTAL_SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw) as PortalSession;
      if (session?.authenticated && (session.role === 'admin' || session.role === 'staff')) {
        return session;
      }
    }
  } catch {
    // Ignore corrupted session payloads and continue with legacy fallback.
  }

  try {
    const legacyAdmin = localStorage.getItem(LEGACY_ADMIN_KEY);
    if (legacyAdmin) {
      const data = JSON.parse(legacyAdmin);
      if (data?.authenticated === true) {
        return {
          authenticated: true,
          role: 'admin',
          loginTime: data.loginTime || new Date().toISOString(),
        };
      }
    }
  } catch {}

  try {
    const legacyStaff = localStorage.getItem(LEGACY_STAFF_KEY);
    if (legacyStaff) {
      const data = JSON.parse(legacyStaff);
      if (data?.authenticated === true) {
        return {
          authenticated: true,
          role: 'staff',
          loginTime: data.loginTime || new Date().toISOString(),
        };
      }
    }
  } catch {}

  return null;
}

export function setPortalSession(payload: { role: PortalRole; userId?: string; email?: string }) {
  if (typeof window === 'undefined') return;

  const session: PortalSession = {
    authenticated: true,
    role: payload.role,
    userId: payload.userId,
    email: payload.email,
    loginTime: new Date().toISOString(),
  };

  localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));

  if (payload.role === 'admin') {
    localStorage.setItem(LEGACY_ADMIN_KEY, JSON.stringify({ authenticated: true, loginTime: session.loginTime }));
    localStorage.removeItem(LEGACY_STAFF_KEY);
  } else {
    localStorage.setItem(LEGACY_STAFF_KEY, JSON.stringify({ authenticated: true, loginTime: session.loginTime }));
    localStorage.removeItem(LEGACY_ADMIN_KEY);
  }
}

export function clearPortalSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PORTAL_SESSION_KEY);
  localStorage.removeItem(LEGACY_ADMIN_KEY);
  localStorage.removeItem(LEGACY_STAFF_KEY);
}
