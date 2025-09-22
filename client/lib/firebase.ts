import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

export type FirebaseStatus =
  | { ready: true; app: FirebaseApp; db: Database }
  | { ready: false; reason: string };

function normalizeBucket(bucket?: string, projectId?: string): string | undefined {
  if (!bucket) return bucket;
  if (bucket.includes("firebasestorage.app")) {
    const id = projectId || bucket.split(".")[0];
    return `${id}.appspot.com`;
  }
  return bucket;
}

// Default demo project (keeps the app functional out-of-the-box)
const defaultConfig: FirebaseOptions = {
  apiKey: "AIzaSyA5kFNfi7bQlokZ-euTicPIYvBBniq8ztE",
  authDomain: "eternalparadise-b9b5e.firebaseapp.com",
  databaseURL: "https://eternalparadise-b9b5e-default-rtdb.firebaseio.com",
  projectId: "eternalparadise-b9b5e",
  storageBucket: "eternalparadise-b9b5e.firebasestorage.app",
  messagingSenderId: "1086724470740",
  appId: "1:1086724470740:web:1d6014c1ad318985cc4841",
  measurementId: "G-61DQKDG6HJ",
};

function hasAllValues(obj: Record<string, unknown>): boolean {
  return Object.values(obj).every((v) => typeof v === "string" && v.length > 0);
}

function resolveConfig(): { config: FirebaseOptions | null; fromEnv: boolean } {
  const envConfig: FirebaseOptions = {
    apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
    authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: (import.meta as any).env?.VITE_FIREBASE_DATABASE_URL,
    projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
    storageBucket: normalizeBucket(
      (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
      (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID
    ),
    messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
    measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID,
  } as unknown as FirebaseOptions;

  if (hasAllValues(envConfig as unknown as Record<string, unknown>)) {
    return { config: envConfig, fromEnv: true };
  }

  const fallback: FirebaseOptions = {
    ...defaultConfig,
    storageBucket: normalizeBucket(defaultConfig.storageBucket, defaultConfig.projectId),
  };
  return { config: fallback, fromEnv: false };
}

let status: FirebaseStatus;

export function getFirebaseApp(): FirebaseApp | null {
  const { config } = resolveConfig();
  if (!config) return null;
  return getApps().length ? getApps()[0]! : initializeApp(config);
}

export function getFirebase(): FirebaseStatus {
  if (!status) {
    const { config, fromEnv } = resolveConfig();
    if (!config) {
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
