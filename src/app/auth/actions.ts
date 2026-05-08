'use server';

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'quickride-booking-secure-jwt-key-2026';
const SESSION_EXPIRY = 60 * 60 * 24 * 7; // 7 days

// NOTE: These server actions are kept for API-route compatibility.
// Client-side auth uses Firebase Auth via authClient directly (A1 — SQLite removed).

export async function signupAction(_formData: FormData) {
  // Firebase Auth handles signup on the client. Stub for API compatibility.
  return { success: false, error: "Use client-side Firebase signup." };
}

export async function loginAction(_formData: FormData) {
  // Firebase Auth handles login on the client. Stub for API compatibility.
  return { success: false, error: "Use client-side Firebase login." };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('quickride_session');
  return { success: true };
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('quickride_session')?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return { id: decoded.userId, email: decoded.email, name: '' };
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
