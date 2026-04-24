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
 * Default branding configuration.
 */
export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  system_name: "QuickRide Booking",
  logo_url: "/logo.png",
  theme_colors: {
    primary: "#15803d", // green-700
    secondary: "#f59e0b" // amber-500
  }
};
