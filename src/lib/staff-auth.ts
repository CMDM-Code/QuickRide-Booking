'use client';

import { getPortalSession, clearPortalSession } from "./portal-auth";

export const staffAuth = {
  isAuthenticated: (): boolean => {
    const session = getPortalSession();
    if (!session) return false;
    return session.authenticated === true && (session.role === 'staff' || session.role === 'admin');
  },

  logout: (): void => {
    clearPortalSession();
  }
};
