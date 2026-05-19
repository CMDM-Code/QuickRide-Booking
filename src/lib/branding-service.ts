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
import { BrandingConfig, ThemeTokens } from "./types";

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

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT THEME TOKENS
// Values here must exactly match design-tokens.css so the app looks identical
// before any admin edits are saved.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_LIGHT_THEME: ThemeTokens = {
  // Brand
  primary:              "#15803d",   // green-700
  primary_hover:        "#166534",   // green-800
  secondary:            "#3b82f6",   // blue-500
  accent:               "#f59e0b",   // amber-500

  // Backgrounds
  bg_base:              "#f8fafc",   // ink-50  (--bg-primary in light)
  bg_surface:           "#ffffff",   // white   (--bg-secondary / elevated)
  bg_subtle:            "#f1f5f9",   // ink-100 (--bg-tertiary)
  bg_inverse:           "#0f172a",   // ink-900

  // Text
  text_primary:         "#0f172a",   // ink-900 (--text-primary)
  text_secondary:       "#475569",   // ink-600 (--text-secondary)
  text_muted:           "#94a3b8",   // ink-400 (--text-tertiary / muted)
  text_inverse:         "#ffffff",
  text_link:            "#15803d",   // same as primary

  // Borders
  border_subtle:        "#f1f5f9",   // ink-100
  border_default:       "#e2e8f0",   // ink-200
  border_strong:        "#cbd5e1",   // ink-300

  // Semantic
  success:              "#22c55e",
  success_bg:           "#dcfce7",
  warning:              "#f59e0b",
  warning_bg:           "#fef3c7",
  error:                "#ef4444",
  error_bg:             "#fee2e2",
  info:                 "#3b82f6",
  info_bg:              "#dbeafe",

  // Layout chrome
  sidebar_bg:           "#0f172a",   // ink-900
  sidebar_text:         "#cbd5e1",   // ink-300
  sidebar_text_active:  "#ffffff",
  sidebar_item_active_bg: "#15803d", // green-700
  header_bg:            "#ffffff",
};

export const DEFAULT_DARK_THEME: ThemeTokens = {
  // Brand
  primary:              "#22c55e",   // green-500 (brighter for dark)
  primary_hover:        "#4ade80",   // green-400
  secondary:            "#60a5fa",   // blue-400
  accent:               "#fbbf24",   // amber-400

  // Backgrounds
  bg_base:              "#0f172a",   // ink-900
  bg_surface:           "#1e293b",   // ink-800
  bg_subtle:            "#334155",   // ink-700
  bg_inverse:           "#f8fafc",   // ink-50

  // Text
  text_primary:         "#f8fafc",   // ink-50
  text_secondary:       "#cbd5e1",   // ink-300
  text_muted:           "#64748b",   // ink-500
  text_inverse:         "#0f172a",
  text_link:            "#4ade80",   // green-400

  // Borders
  border_subtle:        "#1e293b",   // ink-800
  border_default:       "#334155",   // ink-700
  border_strong:        "#475569",   // ink-600

  // Semantic (dark-adjusted)
  success:              "#4ade80",
  success_bg:           "rgba(74,222,128,0.15)",
  warning:              "#fbbf24",
  warning_bg:           "rgba(251,191,36,0.15)",
  error:                "#f87171",
  error_bg:             "rgba(248,113,113,0.15)",
  info:                 "#60a5fa",
  info_bg:              "rgba(96,165,250,0.15)",

  // Layout chrome
  sidebar_bg:           "#0f172a",   // ink-900
  sidebar_text:         "#94a3b8",   // ink-400
  sidebar_text_active:  "#ffffff",
  sidebar_item_active_bg: "#22c55e", // green-500
  header_bg:            "#1e293b",   // ink-800
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
