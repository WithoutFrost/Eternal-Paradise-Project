import { Battery, Network } from "lucide-react";
import { useEffect, useState } from "react";
import { getUser, getOrCreateStats } from "@/lib/data";
import { getFirebase } from "@/lib/firebase";

export default function StatusBar({ userId }: { userId?: string }) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const [name, setName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [fbReady, setFbReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const u = await getUser(userId);
        if (u) {
          setName(u.name);
          setAvatar(u.avatarUrl ?? null);
        } else {
          const storedName = localStorage.getItem("currentUserName");
          if (storedName) setName(storedName);
        }
        const s = await getOrCreateStats(userId);
        setRank(s?.gmRank ?? s?.ovr ?? null);
      } catch (e) {
        // ignore
      }
    })();
  }, [userId]);

  useEffect(() => {
    const fb = getFirebase();
    setFbReady(fb.ready);
  }, []);

  return (
    <div className="flex items-center justify-between text-xs text-zinc-300 px-3 py-3">
      <div className={`flex items-center gap-3 ${name && name !== "Jogador" ? "mt-6" : "mt-2"}`}>
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden border border-white/10">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name ?? "avatar"} className="w-full h-full object-cover" />
          ) : (
            <div className="text-sm text-neutral-400">{name ? name.charAt(0).toUpperCase() : "U"}</div>
          )}
        </div>
        <div className="leading-tight">
          <div className="text-base font-semibold text-white/90">{name ?? "Jogador"}</div>
          <div className="text-[12px] text-yellow-400">Rank {rank ?? "—"}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-80">
        <span className="font-semibold tracking-wider">{time}</span>
        <Network size={16} />
        <Battery size={16} />
        {fbReady === null ? null : fbReady ? <span className="h-2 w-2 rounded-full bg-green-400 ml-2" title="Firebase conectado" /> : <span className="h-2 w-2 rounded-full bg-red-500 ml-2" title="Fallback localStorage" />}
      </div>
    </div>
  );
}
