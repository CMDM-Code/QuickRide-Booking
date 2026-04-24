import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  deleteObject,
  getMetadata
} from "firebase/storage";
import { storage } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";

export interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  fullPath: string;
  uploadedAt: string;
  uploadedBy?: string;
  tags?: string[];
}

const MEDIA_COLLECTION = "media_files";

export async function uploadMediaFile(
  file: File,
  userId?: string,
  onProgress?: (progress: number) => void
): Promise<MediaFile> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fullPath = `media/${timestamp}_${safeName}`;
  const storageRef = ref(storage, fullPath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        reject(error);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        const metadata = uploadTask.snapshot.metadata;

        const mediaDoc = {
          name: file.name,
          type: file.type,
          size: file.size,
          url,
          fullPath,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId || null,
          tags: [],
          created_at: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, MEDIA_COLLECTION), mediaDoc);

        resolve({
          id: docRef.id,
          name: file.name,
          type: file.type,
          size: file.size,
          url,
          fullPath,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId,
          tags: []
        });
      }
    );
  });
}

export async function fetchMediaFiles(): Promise<MediaFile[]> {
  if (!db) return [];

  try {
    const snap = await getDocs(
      query(collection(db, MEDIA_COLLECTION), orderBy("created_at", "desc"))
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        type: data.type,
        size: data.size,
        url: data.url,
        fullPath: data.fullPath,
        uploadedAt: data.uploadedAt,
        uploadedBy: data.uploadedBy,
        tags: data.tags || []
      } as MediaFile;
    });
  } catch (e) {
    console.error("Failed to fetch media files:", e);
    return [];
  }
}

export async function deleteMediaFile(id: string, fullPath: string): Promise<void> {
  if (!db || !storage) return;

  try {
    const storageRef = ref(storage, fullPath);
    await deleteObject(storageRef);
  } catch (e) {
    console.warn("Failed to delete from storage (may not exist):", e);
  }

  try {
    await deleteDoc(doc(db, MEDIA_COLLECTION, id));
  } catch (e) {
    console.error("Failed to delete from Firestore:", e);
    throw e;
  }
}

export async function updateMediaTags(
  id: string,
  tags: string[]
): Promise<void> {
  if (!db) return;

  await updateDoc(doc(db, MEDIA_COLLECTION, id), { tags });
}

export async function searchMediaByTag(tag: string): Promise<MediaFile[]> {
  if (!db) return [];

  const snap = await getDocs(collection(db, MEDIA_COLLECTION));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MediaFile))
    .filter((f) => f.tags?.includes(tag));
}

export async function getUnusedMedia(): Promise<MediaFile[]> {
  const allMedia = await fetchMediaFiles();
  // This would require checking car_models collection for image references
  // For now, return all media - in production, cross-reference with vehicle images
  return allMedia;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}