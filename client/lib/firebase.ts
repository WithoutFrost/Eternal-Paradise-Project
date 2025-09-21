import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

export type FirebaseStatus =
  | { ready: true; app: FirebaseApp; db: Database }
  | { ready: false; reason: string };

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
    | string
    | undefined,
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
          "Firebase não configurado. Defina variáveis VITE_FIREBASE_* para usar o Realtime Database.",
      };
      return status;
    }
    const app = getApps().length ? getApps()[0]! : initializeApp(config);
    const db = getDatabase(app);
    status = { ready: true, app, db };
  }
  return status;
}
