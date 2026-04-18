'use client';

export const staffAuth = {
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      const session = localStorage.getItem('quickride_staff_session');
      if (!session) return false;
      
      const data = JSON.parse(session);
      return data.authenticated === true;
    } catch {
      return false;
    }
  },

  logout: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('quickride_staff_session');
    }
  }
};
