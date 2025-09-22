import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ensureUser, generateLicenses, setUserLicense, isUserGM, listUsers, setUserPassword, getUserPassword } from "@/lib/data";
import PhoneShell from "@/components/phone/PhoneShell";

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [slide, setSlide] = useState(0);

  const tempUserId = useMemo(() => crypto.randomUUID(), []);

  async function unlock() {
    if (user.trim() && pwd.trim() && slide >= 100) {
      const username = user.trim();
      const users = await listUsers().catch(() => []);
      const existing = users.find((u) => u.name.toLowerCase() === username.toLowerCase());
      const effectiveId = existing ? existing.id : crypto.randomUUID();
      if (existing) {
        const stored = await getUserPassword(effectiveId);
        if (stored != null && stored !== pwd) {
          alert("Senha incorreta");
          return;
        }
        if (stored == null) {
          await setUserPassword(effectiveId, pwd);
        }
      } else {
        const newUser = { id: effectiveId, name: username, role: "player" as const };
        await ensureUser(newUser);
        await setUserPassword(effectiveId, pwd);
      }
      await generateLicenses(effectiveId);
      const assigned = await (async () => {
        const cur = await (async () => {
          try {
            const r = await import("@/lib/data").then((m) => m.getAssignedLicense);
            return await r(effectiveId);
          } catch { return null; }
        })();
        return cur;
      })();
      if (!assigned) {
        const { SINS } = await import("@/lib/data");
        const pick = SINS[Math.floor(Math.random() * SINS.length)];
        await setUserLicense(effectiveId, pick.id);
      }
      const gmFlag = await isUserGM(effectiveId);
      localStorage.setItem("currentUserId", effectiveId);
      localStorage.setItem("currentUserName", existing ? existing.name : username);
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
      unsubs.push(mod.listenUserSettings(tempUserId, (s)=> setBgUser(s.background?.login)));
    })();
    return () => { unsubs.forEach(u=>u&&u()); };
  }, [tempUserId]);

  const bg = bgUser || bgGlobal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-black flex items-center justify-center">
      <PhoneShell userId={tempUserId} title="Login" bgImage={bg}>
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
