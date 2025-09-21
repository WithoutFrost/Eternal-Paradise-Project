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

const firebaseConfig = {
  apiKey: "AIzaSyA5kFNfi7bQlokZ-euTicPIYvBBniq8ztE",
  authDomain: "eternalparadise-b9b5e.firebaseapp.com",
  databaseURL: "https://eternalparadise-b9b5e-default-rtdb.firebaseio.com",
  projectId: "eternalparadise-b9b5e",
  storageBucket: "eternalparadise-b9b5e.firebasestorage.app",
  messagingSenderId: "1086724470740",
  appId: "1:1086724470740:web:1d6014c1ad318985cc4841",
  measurementId: "G-61DQKDG6HJ"

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
