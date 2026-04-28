import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";
import { db, storage } from "./firebase";
import { BrandingConfig } from "./types";

const BRANDING_DOC_PATH = "system_config/branding";

/**
 * Fetches the current branding configuration.
 */
export async function fetchBrandingConfig(): Promise<BrandingConfig> {
  try {
    const docRef = doc(db, BRANDING_DOC_PATH);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as BrandingConfig;
    }
    
    // Default fallback
    return DEFAULT_BRANDING_CONFIG;
  } catch (error) {
    console.warn("⚠️ Fetching branding config failed (using default fallback). Ensure Firebase security rules allow read access.");
    return DEFAULT_BRANDING_CONFIG;
  }
}

/**
 * Updates the branding configuration.
 */
export async function updateBrandingConfig(config: Partial<BrandingConfig>) {
  try {
    const docRef = doc(db, BRANDING_DOC_PATH);
    await setDoc(docRef, {
      ...config,
      updated_at: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating branding config:", error);
    throw error;
  }
}

/**
 * Uploads a logo to Firebase Storage.
 */
export async function uploadLogo(file: File): Promise<string> {
  try {
    const storageRef = ref(storage, `branding/logo_${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Error uploading logo:", error);
    throw error;
  }
}

/**
 * Uploads a favicon to Firebase Storage.
 */
export async function uploadFavicon(file: File): Promise<string> {
  try {
    const storageRef = ref(storage, `branding/favicon_${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Error uploading favicon:", error);
    throw error;
  }
}

/**
 * Uploads a login background image to Firebase Storage.
 */
export async function uploadLoginBackground(file: File): Promise<string> {
  try {
    const storageRef = ref(storage, `branding/login_bg_${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Error uploading login background:", error);
    throw error;
  }
}

const DEFAULT_LIGHT_THEME = {
  primary: "#15803d",      // green-700
  secondary: "#3b82f6",    // blue-500
  accent: "#f59e0b",       // amber-500
  background: "#ffffff",   // white
  text: "#0f172a",         // slate-900
  success: "#22c55e",      // green-500
  warning: "#f59e0b",      // amber-500
  error: "#ef4444"         // red-500
};

const DEFAULT_DARK_THEME = {
  primary: "#22c55e",      // green-500 (brighter for dark)
  secondary: "#60a5fa",    // blue-400 (brighter for dark)
  accent: "#fbbf24",       // amber-400 (brighter for dark)
  background: "#0f172a",   // slate-900
  text: "#f8fafc",         // slate-50
  success: "#4ade80",      // green-400
  warning: "#fbbf24",      // amber-400
  error: "#f87171"         // red-400
};

/**
 * Default branding configuration.
 */
export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  system_name: "QuickRide Booking",
  logo_url: "/logo.png",
  favicon_url: "/favicon.ico",
  login_background_url: "/login-bg.jpg",
  light_theme: DEFAULT_LIGHT_THEME,
  dark_theme: DEFAULT_DARK_THEME,
  scope: {
    admin: true,
    staff: true,
    client: true,
    public_pages: true
  }
};
