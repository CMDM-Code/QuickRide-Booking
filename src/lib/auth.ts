// Authentication utilities using localStorage
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Fallback UUID generator works in ALL environments
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const authService = {
  login: (email: string, password: string): User | null => {
    if (typeof window === 'undefined') return null;
    
    const users = JSON.parse(localStorage.getItem('quickride_users') || '[]');
    const user = users.find((u: User & { password: string }) => u.email === email && u.password === password);
    
    if (user) {
      const { password: _, ...userData } = user;
      localStorage.setItem('quickride_session', JSON.stringify(userData));
      
      // Notify all open windows that auth state changed
      window.dispatchEvent(new Event('authchange'));
      
      return userData;
    }
    return null;
  },

  signup: (name: string, email: string, password: string): User | null => {
    if (typeof window === 'undefined') return null;
    
    const users = JSON.parse(localStorage.getItem('quickride_users') || '[]');
    
    if (users.find((u: User) => u.email === email)) {
      return null;
    }

    const newUser = {
      id: generateId(),
      name,
      email,
      password,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('quickride_users', JSON.stringify(users));
    
    const { password: _, ...userData } = newUser;
    localStorage.setItem('quickride_session', JSON.stringify(userData));
    
    // Notify all open windows that auth state changed
    window.dispatchEvent(new Event('authchange'));
    
    return userData;
  },

  logout: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('quickride_session');
    
    // Notify all open windows that auth state changed
    window.dispatchEvent(new Event('authchange'));
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const session = localStorage.getItem('quickride_session');
    return session ? JSON.parse(session) : null;
  },

  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('quickride_session');
  }
};
