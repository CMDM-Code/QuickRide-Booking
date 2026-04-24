import { getSessionTimeoutMs } from './settings-service';

const LAST_ACTIVITY_KEY = 'quickride_last_activity';
const SESSION_CHECK_INTERVAL = 30000;

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let checkInterval: ReturnType<typeof setInterval> | null = null;

type LogoutCallback = () => void;
let onLogoutCallback: LogoutCallback | null = null;

function getLastActivity(): number {
  try {
    const saved = localStorage.getItem(LAST_ACTIVITY_KEY);
    return saved ? parseInt(saved, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

function updateLastActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

function resetInactivityTimer(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  updateLastActivity();

  const timeoutMs = getSessionTimeoutMs();

  inactivityTimer = setTimeout(() => {
    const elapsed = Date.now() - getLastActivity();
    if (elapsed >= getSessionTimeoutMs()) {
      triggerLogout();
    }
  }, timeoutMs);
}

function triggerLogout(): void {
  if (onLogoutCallback) {
    onLogoutCallback();
  } else {
    clearSessionAndRedirect();
  }
}

function clearSessionAndRedirect(): void {
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  localStorage.removeItem('quickride_portal_session');
  localStorage.removeItem('quickride_admin_session');
  localStorage.removeItem('quickride_staff_session');

  window.location.href = '/auth/logged-out';
}

function handleActivityEvents(): void {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

  events.forEach(event => {
    document.addEventListener(event, () => {
      resetInactivityTimer();
    }, { passive: true });
  });
}

function startPeriodicCheck(): void {
  if (checkInterval) return;

  checkInterval = setInterval(() => {
    const elapsed = Date.now() - getLastActivity();
    const timeoutMs = getSessionTimeoutMs();

    if (elapsed >= timeoutMs) {
      triggerLogout();
    }
  }, SESSION_CHECK_INTERVAL);
}

function stopPeriodicCheck(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

export function initSessionManagement(onLogout?: LogoutCallback): void {
  if (typeof window === 'undefined') return;

  onLogoutCallback = onLogout || null;

  handleActivityEvents();
  resetInactivityTimer();
  startPeriodicCheck();

  window.addEventListener('beforeunload', () => {
    updateLastActivity();
  });
}

export function destroySessionManagement(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  stopPeriodicCheck();

  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.removeEventListener(event, resetInactivityTimer);
  });
}

export function resetSessionTimer(): void {
  resetInactivityTimer();
}

export function getTimeUntilLogout(): number {
  const elapsed = Date.now() - getLastActivity();
  const remaining = getSessionTimeoutMs() - elapsed;
  return Math.max(0, remaining);
}