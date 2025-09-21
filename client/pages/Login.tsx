import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ensureUser, generateLicenses, setUserLicense, isUserGM } from "@/lib/data";
import PhoneShell from "@/components/phone/PhoneShell";

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [slide, setSlide] = useState(0);

  const userId = useMemo(() => crypto.randomUUID(), []);

  async function unlock() {
    if (user.trim() && pwd.trim() && slide >= 100) {
      const u = { id: userId, name: user, role: "player" as const };
      await ensureUser(u);
      await generateLicenses(userId);
      const assigned = await (async () => {
        const cur = await (async () => {
          try {
            const r = await import("@/lib/data").then((m) => m.getAssignedLicense);
            return await r(userId);
          } catch { return null; }
        })();
        return cur;
      })();
      if (!assigned) {
        const { SINS } = await import("@/lib/data");
        const pick = SINS[Math.floor(Math.random() * SINS.length)];
        await setUserLicense(userId, pick.id);
      }
      const gmFlag = await isUserGM(userId);
      localStorage.setItem("currentUserId", userId);
      localStorage.setItem("currentUserName", user);
      localStorage.setItem("currentUserRole", gmFlag ? "gm" : "player");
      navigate(gmFlag ? "/gm" : "/player");
    }
  }

  const [bgGlobal, setBgGlobal] = useState<string | undefined>(undefined);
  const [bgUser, setBgUser] = useState<string | undefined>(undefined);
  useEffect(() => {
    let unsubs: Array<() => void> = [];
    (async () => {
      const mod = await import("@/lib/settings");
      unsubs.push(mod.listenSettings((s)=> setBgGlobal(s.background?.login)));
      unsubs.push(mod.listenUserSettings(userId, (s)=> setBgUser(s.background?.login)));
    })();
    return () => { unsubs.forEach(u=>u&&u()); };
  }, [userId]);

  const bg = bgUser || bgGlobal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-black flex items-center justify-center">
      <PhoneShell userId={userId} title="Login" bgImage={bg}>
        <div className="pt-32" />
        <div className="space-y-3">
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuário" className="w-full rounded-2xl bg-black/40 border border-white/20 px-4 py-3 text-white/90 placeholder:text-white/60 backdrop-blur" />
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Senha" className="w-full rounded-2xl bg-black/40 border border-white/20 px-4 py-3 text-white/90 placeholder:text-white/60 backdrop-blur" />
          <div className="bg-white/10 rounded-full p-1">
            <input type="range" min={0} max={100} value={slide} onChange={(e) => setSlide(Number(e.target.value))} onMouseUp={unlock} onTouchEnd={unlock} className="w-full" />
            <div className="text-center text-sm text-white/80 -mt-1">deslize para desbloquear</div>
          </div>
        </div>
      </PhoneShell>
    </div>
  );
}
