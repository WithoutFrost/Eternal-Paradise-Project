import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

export type FirebaseStatus =
  | { ready: true; app: FirebaseApp; db: Database }
  | { ready: false; reason: string };

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasAllValues(config)) return null;
  return getApps().length ? getApps()[0]! : initializeApp(config);
}

function normalizeBucket(bucket?: string, projectId?: string): string | undefined {
  if (!bucket) return bucket;
  if (bucket.includes("firebasestorage.app")) {
    // Firebase SDK expects bucket like "<project>.appspot.com"
    const id = projectId || bucket.split(".")[0];
    return `${id}.appspot.com`;
  }
  return bucket;
}

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: normalizeBucket(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined, import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined),
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

function hasAllValues(obj: Record<string, unknown>): boolean {
  return Object.values(obj).every((v) => typeof v === "string" && v.length > 0);
}

let status: FirebaseStatus;

export function getFirebase(): FirebaseStatus {
  if (!status) {
    if (!hasAllValues(config)) {
      status = {
        ready: false,
        reason:
          "Firebase não configurado. Defina VITE_FIREBASE_API_KEY, AUTH_DOMAIN, DATABASE_URL, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID e APP_ID.",
      };
      return status;
    }
    const app = getApps().length ? getApps()[0]! : initializeApp(config);
    const db = getDatabase(app);
    status = { ready: true, app, db };
  }
  return status;
}
