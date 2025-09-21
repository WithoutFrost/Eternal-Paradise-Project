import { get, onValue, ref, set } from "firebase/database";
import { getFirebase } from "./firebase";
import { getFirebaseApp } from "./firebase";
import { getStorage, ref as sref, uploadBytes, getDownloadURL } from "firebase/storage";

export type AppSettings = {
  background?: {
    login?: string;
    home?: string;
  };
};

export type UserSettings = AppSettings;

const PATH = "settings";
const PATH_USERS = "settings_users";

export async function getSettingsOnce(): Promise<AppSettings> {
  const fb = getFirebase();
  if (!fb.ready) {
    const raw = localStorage.getItem(PATH);
    return raw ? (JSON.parse(raw) as AppSettings) : {};
  }
  const snap = await get(ref(fb.db, PATH));
  return (snap.val() as AppSettings) ?? {};
}

export function listenSettings(cb: (s: AppSettings) => void): () => void {
  const fb = getFirebase();
  if (!fb.ready) {
    let last = localStorage.getItem(PATH) || "{}";
    cb(JSON.parse(last));
    const id = setInterval(() => {
      const cur = localStorage.getItem(PATH) || "{}";
      if (cur !== last) {
        last = cur;
        cb(JSON.parse(cur));
      }
    }, 800);
    return () => clearInterval(id);
  }
  return onValue(ref(fb.db, PATH), (s) => cb(((s.val() as AppSettings) ?? {})));
}

export async function setBackgroundUrl(kind: "login" | "home", url: string): Promise<void> {
  const fb = getFirebase();
  if (!fb.ready) {
    const cur = (await getSettingsOnce()) || {};
    const next: AppSettings = { ...(cur || {}), background: { ...(cur.background || {}), [kind]: url } };
    localStorage.setItem(PATH, JSON.stringify(next));
    return;
  }
  const next = { background: { [kind]: url } } as any;
  await set(ref(fb.db, PATH + "/background/" + kind), url);
}

export async function uploadBackground(kind: "login" | "home", file: File): Promise<string> {
  const fb = getFirebase();
  if (!fb.ready) {
    const dataUrl = await fileToDataUrl(file);
    await setBackgroundUrl(kind, dataUrl);
    return dataUrl;
  }
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase app not initialized");
  const storage = getStorage(app);
  const id = crypto.randomUUID();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const key = `backgrounds/${kind}/${id}.${ext}`;
  const r = sref(storage, key);
  await uploadBytes(r, file, { contentType: file.type });
  const url = await getDownloadURL(r);
  await setBackgroundUrl(kind, url);
  return url;
}

export async function getUserSettingsOnce(userId: string): Promise<UserSettings> {
  const fb = getFirebase();
  const key = `${PATH_USERS}/${userId}`;
  if (!fb.ready) {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as UserSettings) : {};
  }
  const snap = await get(ref(fb.db, key));
  return (snap.val() as UserSettings) ?? {};
}

export function listenUserSettings(userId: string, cb: (s: UserSettings) => void): () => void {
  const fb = getFirebase();
  const key = `${PATH_USERS}/${userId}`;
  if (!fb.ready) {
    let last = localStorage.getItem(key) || "{}";
    cb(JSON.parse(last));
    const id = setInterval(() => {
      const cur = localStorage.getItem(key) || "{}";
      if (cur !== last) { last = cur; cb(JSON.parse(cur)); }
    }, 800);
    return () => clearInterval(id);
  }
  return onValue(ref(fb.db, key), (s) => cb(((s.val() as UserSettings) ?? {})));
}

export async function setUserBackgroundUrl(userId: string, kind: "login" | "home", url: string): Promise<void> {
  const fb = getFirebase();
  const key = `${PATH_USERS}/${userId}`;
  if (!fb.ready) {
    const cur = (await getUserSettingsOnce(userId)) || {};
    const next: UserSettings = { ...(cur || {}), background: { ...(cur.background || {}), [kind]: url } };
    localStorage.setItem(key, JSON.stringify(next));
    return;
  }
  await set(ref(fb.db, `${key}/background/${kind}`), url);
}

export async function uploadUserBackground(userId: string, kind: "login" | "home", file: File): Promise<string> {
  const fb = getFirebase();
  if (!fb.ready) {
    const dataUrl = await fileToDataUrl(file);
    await setUserBackgroundUrl(userId, kind, dataUrl);
    return dataUrl;
  }
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase app not initialized");
  const storage = getStorage(app);
  const id = crypto.randomUUID();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const key = `backgrounds/users/${userId}/${kind}/${id}.${ext}`;
  const r = sref(storage, key);
  await uploadBytes(r, file, { contentType: file.type });
  const url = await getDownloadURL(r);
  await setUserBackgroundUrl(userId, kind, url);
  return url;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
