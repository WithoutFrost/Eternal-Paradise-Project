import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureUser, generateLicenses, setUserLicense, isUserGM } from "@/lib/data";

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
      // generate licenses if needed
      await generateLicenses(userId);
      // ensure assigned license exists
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
        // pick a random license from SINS
        const { SINS } = await import("@/lib/data");
        const pick = SINS[Math.floor(Math.random() * SINS.length)];
        await setUserLicense(userId, pick.id);
      }

      // check GM tag in DB
      const gmFlag = await isUserGM(userId);

      localStorage.setItem("currentUserId", userId);
      localStorage.setItem("currentUserName", user);
      localStorage.setItem("currentUserRole", gmFlag ? "gm" : "player");

      navigate(gmFlag ? "/gm" : "/player");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-black flex items-center justify-center">
      <div className="w-[360px] h-[720px] rounded-[2.5rem] border border-neutral-800 bg-[url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1325&auto=format&fit=crop')] bg-cover bg-center relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 p-8 flex flex-col justify-end">
          <div className="space-y-3">
            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuário" className="w-full rounded-2xl bg-black/40 border border-white/20 px-4 py-3 text-white/90 placeholder:text-white/60 backdrop-blur" />
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Senha" className="w-full rounded-2xl bg-black/40 border border-white/20 px-4 py-3 text-white/90 placeholder:text-white/60 backdrop-blur" />
            <div className="bg-white/10 rounded-full p-1">
              <input type="range" min={0} max={100} value={slide} onChange={(e) => setSlide(Number(e.target.value))} onMouseUp={unlock} onTouchEnd={unlock} className="w-full" />
              <div className="text-center text-sm text-white/80 -mt-1">deslize para desbloquear</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
