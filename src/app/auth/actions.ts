'use server';

import { dbService } from "@/lib/db";
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
// bcryptjs is fast in JS environments, avoid native bcrypt

const JWT_SECRET = process.env.JWT_SECRET || 'quickride-booking-secure-jwt-key-2026';
const SESSION_EXPIRY = 60 * 60 * 24 * 7; // 7 days



export async function signupAction(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Password strength validation
    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long" };
    }
    if (!/[A-Z]/.test(password)) {
      return { success: false, error: "Password must contain at least one uppercase letter" };
    }
    if (!/[0-9]/.test(password)) {
      return { success: false, error: "Password must contain at least one number" };
    }

    const user = dbService.createUser(name, email, password);
    
    if (user) {
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: SESSION_EXPIRY });
      
      const cookieStore = await cookies();
      cookieStore.set('quickride_session', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: SESSION_EXPIRY,
        path: '/'
      });

      return { success: true, user };
    }
    
    return { success: false, error: "Email already exists" };
  } catch (e) {
    console.error("Signup action error:", e);
    return { success: false, error: "Server error. Please try again." };
  }
}

export async function loginAction(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const user = dbService.verifyUser(email, password);
    
    if (user) {
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: SESSION_EXPIRY });
      
      const cookieStore = await cookies();
      cookieStore.set('quickride_session', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: SESSION_EXPIRY,
        path: '/'
      });

      return { success: true, user };
    }
    
    return { success: false, error: "Invalid email or password" };
  } catch (e) {
    console.error("Login action error:", e);
    return { success: false, error: "Server error. Please try again." };
  }
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
    const user = await dbService.getUserById(decoded.userId);
    
    return user;
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
