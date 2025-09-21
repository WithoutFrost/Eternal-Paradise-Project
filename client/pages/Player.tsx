import { useMemo, useState, useEffect } from "react";
import PhoneShell from "@/components/phone/PhoneShell";
import GridMenu from "@/components/GridMenu";
import StatsPanel from "@/components/stats/StatsPanel";
import WhatsAppChat from "@/components/chat/WhatsAppChat";
import Chat from "@/components/chat/Chat";
import Feed from "@/components/feed/Feed";
import Rules from "@/components/rules/Rules";
import License from "@/components/license/License";
import ProfileEditor from "@/components/profile/ProfileEditor";
import Orgs from "@/components/orgs/Orgs";
import { Sparkles, Users, Shield, Trophy, MessageSquare, FileBadge, Bell, BookOpen, Building2, User } from "lucide-react";

const RadarIcon = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-300">
    <polygon points="12,3 19,8.5 16.5,19 7.5,19 5,8.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <polygon points="12,6 17,9.5 15.5,17 8.5,17 7,9.5" stroke="currentColor" strokeWidth="1" fill="rgba(0,200,255,0.15)" />
  </svg>
);

export default function Player() {
  const userId = useMemo(() => {
    const id = localStorage.getItem("currentUserId") || crypto.randomUUID();
    localStorage.setItem("currentUserId", id);
    return id;
  }, []);

  const [screen, setScreen] = useState<
    | "home"
    | "stats"
    | "chat"
    | "license"
    | "orgs"
    | "rules"
    | "feed"
    | "profile"
    | "duel"
  >("home");

  // panels: left = home grid, right = selected screen
  const [visibility, setVisibility] = useState<Record<string, boolean> | null>(() => {
    try {
      const raw = localStorage.getItem(`visibility/${userId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const mod = await import("@/lib/data");
        if (mod.listenUserVisibility) {
          unsub = mod.listenUserVisibility(userId, (v: Record<string, boolean> | null) => setVisibility(v || {}));
          // ensure initial fetch
          const vis = await mod.getUserVisibility(userId);
          setVisibility(vis || {});
        } else {
          const vis = await mod.getUserVisibility(userId);
          setVisibility(vis || {});
        }
      } catch (e) {
        setVisibility({});
      }
    })();
    return () => unsub && unsub();
  }, [userId]);

  const homePanel = (
    <div className="p-2">
      <GridMenu
        items={(
          visibility === null
            ? []
            : [
                { id: "stats", label: "Atribuições", icon: RadarIcon, onClick: () => setScreen("stats") },
                { id: "chat", label: "Mensagens", icon: <MessageSquare />, onClick: () => setScreen("chat") },
                { id: "feed", label: "Feed", icon: <Sparkles />, onClick: () => setScreen("feed") },
                { id: "license", label: "Licença", icon: <FileBadge />, onClick: () => setScreen("license") },
                { id: "rules", label: "Regras", icon: <BookOpen />, onClick: () => setScreen("rules") },
                { id: "orgs", label: "Organizações", icon: <Building2 />, onClick: () => setScreen("orgs") },
                { id: "profile", label: "Perfil", icon: <User />, onClick: () => setScreen("profile") },
            { id: "duel", label: "Duelo", icon: <Shield />, onClick: () => setScreen("duel") },
            { id: "noti", label: "Notificações", icon: <Bell />, onClick: () => alert("Puxe a gaveta de notificações abaixo.") },
              ].filter((it) => visibility[it.id] !== false)
        )}
      />
    </div>
  );

  const rightPanel = (
    <div className="p-2">
      {screen === "stats" && <StatsPanel userId={userId} />}
      {screen === "feed" && <Feed userId={userId} />}
      {screen === "license" && <License userId={userId} />}
      {screen === "rules" && <Rules />}
      {screen === "orgs" && <Orgs userId={userId} />}
      {screen === "profile" && <ProfileEditor userId={userId} />}
      {screen === "duel" && <DuelPanel userId={userId} />}
    </div>
  );

  const [bgHomeGlobal, setBgHomeGlobal] = useState<string | undefined>(undefined);
  const [bgHomeUser, setBgHomeUser] = useState<string | undefined>(undefined);
  useEffect(() => {
    let unsubs: Array<() => void> = [];
    (async () => {
      const mod = await import("@/lib/settings");
      unsubs.push(mod.listenSettings((s)=> setBgHomeGlobal(s.background?.home)));
      unsubs.push(mod.listenUserSettings(userId, (s)=> setBgHomeUser(s.background?.home)));
    })();
    return () => { unsubs.forEach(u=>u&&u()); };
  }, [userId]);

  const bgHome = bgHomeUser || bgHomeGlobal;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black flex items-center justify-center">
      <PhoneShell userId={userId} title={screen === "home" ? "Jogador" : screen.toUpperCase()} showBack={screen !== "home"} onBack={() => setScreen("home") } bgImage={bgHome}>
        {screen === "chat" ? (
          <div className="w-full h-[600px]">
            <WhatsAppChat userId={userId} />
          </div>
        ) : (
          <div className="w-full h-[520px] overflow-hidden">
            <div className={`flex w-[200%] h-full transition-transform duration-300 ${screen === "home" ? "translate-x-0" : "-translate-x-1/2"}`}>
              <div className="w-1/2 h-full overflow-auto no-scrollbar">{homePanel}</div>
              <div className="w-1/2 h-full overflow-auto no-scrollbar">{rightPanel}</div>
            </div>
          </div>
        )}
      </PhoneShell>
    </div>
  );
}

function DuelPanel({ userId }: { userId: string }) {
  const [friends, setFriends] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [target, setTarget] = useState<string>("");
  useEffect(() => {
    (async () => {
      const mod = await import("@/lib/data");
      setFriends(await mod.listFriends(userId));
      setUsers(await mod.listUsers());
    })();
  }, [userId]);
  const friendUsers = users.filter((u)=>friends.includes(u.id));
  return (
    <div className="space-y-3">
      <div className="text-sm text-neutral-400">Anunciar duelo para um amigo</div>
      <select value={target} onChange={(e)=>setTarget(e.target.value)} className="w-full bg-black/20 px-3 py-2 rounded">
        <option value="">Selecione o oponente</option>
        {friendUsers.map((u:any)=> <option key={u.id} value={u.id}>{u.name || u.id.slice(0,6)}</option>)}
      </select>
      <button
        className="px-3 py-2 rounded bg-red-500/20 text-red-300 disabled:opacity-50"
        disabled={!target}
        onClick={async ()=>{
          const mod = await import("@/lib/data");
          await mod.announceDuel(userId, target);
          alert("Duelo anunciado");
        }}
      >
        Anunciar Duelo
      </button>
      <div className="text-xs text-neutral-500">Isso envia mensagem na DM e notificação global.</div>
    </div>
  );
}
