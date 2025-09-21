import { DemoResponse } from "@shared/api";
import { useEffect, useState } from "react";

import Login from "./Login";

export default function Index() {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-black flex items-center justify-center">
      {booting ? (
        <div className="flex flex-col items-center gap-6">
          <div className="text-2xl font-bold text-cyan-300 tracking-wider">SYSTEM BOOTING</div>
          <div className="w-80 h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 animate-progress" style={{ width: "100%" }} />
          </div>
          <div className="text-xs text-neutral-400">Initializing modules · Loading UI · Connecting to Realtime</div>
        </div>
      ) : (
        <div className="w-full max-w-md mx-auto p-6">
          <div className="rounded-2xl bg-gradient-to-br from-neutral-900/80 to-neutral-950/80 border border-white/10 p-6 shadow-xl backdrop-blur">
            <Login />
          </div>
        </div>
      )}

      <style>{`@keyframes progress {0%{transform:translateX(-100%)}100%{transform:translateX(0)}} .animate-progress{animation:progress 2s linear forwards; transform:translateX(-100%);}`}</style>
    </div>
  );
}
