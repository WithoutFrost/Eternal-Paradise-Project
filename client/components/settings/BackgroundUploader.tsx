import { useEffect, useState } from "react";
import {
  listenSettings,
  uploadBackground,
  setBackgroundUrl,
  type AppSettings,
  listenUserSettings,
  uploadUserBackground,
  setUserBackgroundUrl,
} from "@/lib/settings";

export default function BackgroundUploader({ kind, userId }: { kind: "login" | "home"; userId?: string }) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (userId) return listenUserSettings(userId, (s) => setUrl(s.background?.[kind]));
    return listenSettings((s: AppSettings) => setUrl(s.background?.[kind]));
  }, [kind, userId]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const newUrl = userId ? await uploadUserBackground(userId, kind, f) : await uploadBackground(kind, f);
      setUrl(newUrl);
    } finally {
      setBusy(false);
      e.currentTarget.value = "";
    }
  }

  async function onUrlPaste() {
    const raw = prompt("Cole uma URL de imagem pública");
    if (!raw) return;
    if (userId) await setUserBackgroundUrl(userId, kind, raw); else await setBackgroundUrl(kind, raw);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-neutral-300">{userId ? "Background do Jogador" : "Background Global"} · {kind === "login" ? "Login" : "Home"}</div>
      {url ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={kind} className="w-full h-32 object-cover rounded border border-white/10" />
          <div className="mt-2 text-xs text-neutral-400 break-all">{url}</div>
        </div>
      ) : (
        <div className="text-xs text-neutral-500">Nenhuma imagem definida</div>
      )}
      <div className="flex gap-2">
        <label className={`px-3 py-1 rounded bg-white/10 text-sm cursor-pointer ${busy ? "opacity-50 pointer-events-none" : ""}`}>
          Upload
          <input type="file" accept="image/*" className="hidden" onChange={onPick} />
        </label>
        <button onClick={onUrlPaste} className="px-3 py-1 rounded bg-white/10 text-sm">Definir por URL</button>
      </div>
    </div>
  );
}
