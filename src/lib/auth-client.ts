// import bcrypt from 'bcryptjs'; // Moved to dynamic imports to fix ChunkLoadError
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  password: string;
}

const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const getUsers = (): User[] => {
  try {
    return JSON.parse(localStorage.getItem('quickride_users') || '[]');
  } catch {
    return [];
  }
};

const setUsers = (users: User[]) => {
  localStorage.setItem('quickride_users', JSON.stringify(users));
};

const getSession = (): Omit<User, 'password'> | null => {
  try {
    return JSON.parse(localStorage.getItem('quickride_session') || 'null');
  } catch {
    return null;
  }
};

const setSession = (user: Omit<User, 'password'> | null) => {
  if (user) {
    localStorage.setItem('quickride_session', JSON.stringify(user));
  } else {
    localStorage.removeItem('quickride_session');
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('quickride:authchange', { detail: user }));
  }
};

export const authClient = {
  async ensureProfile(user: { id: string, email: string, name: string }) {
    if (!db) return;
    try {
      const profileRef = doc(db, 'profiles', user.id);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          full_name: user.name,
          email: user.email,
          role: 'customer',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Critical Profile sync error:", err);
    }
  },

  async signup(name: string, email: string, password: string) {
    const authInstance = auth;
    if (!authInstance) {
        // Fallback to local handled in catch block
        throw new Error("auth/not-initialized");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      const firebaseUser = userCredential.user;
      
      const userData = {
        id: firebaseUser.uid,
        name: name,
        email: firebaseUser.email || email,
        createdAt: new Date().toISOString()
      };
      
      await this.ensureProfile(userData);
      
      setSession(userData);
      return { success: true, user: userData };
    } catch (error: any) {
      console.error("Signup error:", error);
      
      // Fallback to local if Firebase is not configured or fails
      const authInstance = auth;
      if (error.code === 'auth/network-request-failed' || !authInstance || !authInstance.app) {
          const users = getUsers();
          if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, error: "Email already exists" };
          }
          const bcrypt = await import('bcryptjs');
          const hashedPassword = bcrypt.hashSync(password, 8);
          const newUser: User = {
            id: generateId(),
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date().toISOString(),
          };
          users.push(newUser);
          setUsers(users);
          const { password: _, ...userDataLocal } = newUser;
          setSession(userDataLocal);
          return { success: true, user: userDataLocal };
      }
      
      return { success: false, error: error.message };
    }
  },

  async login(email: string, password: string) {
    const authInstance = auth;
    if (!authInstance) {
        throw new Error("auth/not-initialized");
    }
    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      const firebaseUser = userCredential.user;
      
      const userData = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || email,
        createdAt: new Date().toISOString()
      };
      
      await this.ensureProfile(userData);
      
      setSession(userData);
      return { success: true, user: userData };
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Fallback to local
      const users = getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        const bcrypt = await import('bcryptjs');
        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (passwordMatch) {
          const { password: _, ...userDataLocal } = user;
          setSession(userDataLocal);
          return { success: true, user: userDataLocal };
        }
      }
      
      return { success: false, error: error.message };
    }
  },

  async logout() {
    const authInstance = auth;
    if (!authInstance) {
        setSession(null);
        return { success: true };
    }
    try {
      await signOut(authInstance);
    } catch (error: any) {
      console.error("Logout error:", error);
    }
    setSession(null);
    return { success: true };
  },

  getCurrentUser() {
    return getSession();
  },

  isAuthenticated() {
    return !!getSession();
  },

  subscribe(callback: (user: Omit<User, 'password'> | null) => void) {
    const handler = (e: any) => callback(e.detail);
    if (typeof window !== 'undefined') {
      window.addEventListener('quickride:authchange', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('quickride:authchange', handler);
      }
    };
  },

  async loginWithGoogle() {
    if (!auth) return { success: false, error: "Firebase Auth not initialized" };
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userData = {
        id: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        createdAt: new Date().toISOString()
      };
      
      await this.ensureProfile(userData);
      setSession(userData);
      return { success: true };
    } catch (error: any) {
      console.error("Google login error:", error);
      return { success: false, error: error.message };
    }
  },

  initAuth() {
    if (typeof window !== 'undefined' && auth) {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const userData = {
            id: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            createdAt: new Date().toISOString()
          };
          
          await authClient.ensureProfile(userData);
          setSession(userData);
        } else {
          setSession(null);
        }
      });
    }
  }
};

// Initialize auth on load
if (typeof window !== 'undefined') {
  authClient.initAuth();
}
