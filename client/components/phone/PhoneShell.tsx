import { ReactNode, useEffect, useMemo, useState } from "react";
import StatusBar from "./StatusBar";
import { Bell } from "lucide-react";
import { listenNotifications, NotificationItem, deleteNotification } from "@/lib/data";
import { useImageTheme } from "@/lib/theme";

export default function PhoneShell({ userId, children, title, showBack, onBack, bgImage }: { userId: string; children: ReactNode; title?: string; showBack?: boolean; onBack?: () => void; bgImage?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    return listenNotifications(userId, setItems);
  }, [userId]);

  const theme = useImageTheme(bgImage);
  const isLight = theme.theme === "light";

  const containerStyle = useMemo(() => (
    bgImage
      ? { backgroundImage: `url('${bgImage}')`, backgroundSize: "cover", backgroundPosition: "center" }
      : undefined
  ), [bgImage]);

  return (
    <div className="mx-auto w-[360px] h-[720px] rounded-[2.5rem] border border-neutral-800 shadow-2xl overflow-hidden relative" style={containerStyle}>
      {!bgImage && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-neutral-900 to-neutral-950" />
      )}
      <div className={`absolute inset-0 ${theme.overlayClass}`} />
      <div className="relative z-10">
        <StatusBar userId={userId} theme={isLight ? "light" : "dark"} />
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack ? (
              <button onClick={onBack} className={`px-2 py-1 rounded ${isLight ? "bg-black/5 text-zinc-900" : "bg-white/5 text-white/80"}`}>←</button>
            ) : (
              <div className="w-8" />
            )}
            <h1 className={`text-lg font-semibold ${isLight ? "text-zinc-900" : "text-white/90"}`}>{title ?? "Interface"}</h1>
          </div>
          <button onClick={() => setOpen((v) => !v)} className={`relative transition ${isLight ? "text-cyan-700 hover:text-cyan-600" : "text-cyan-400 hover:text-cyan-300"}`}>
            <Bell size={20} />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] leading-3 px-1 rounded-full text-white">{items.length}</span>
            )}
          </button>
        </div>
        {/* Content */}
        <div className="px-3 pb-4">{children}</div>
      </div>

      {/* Notification Drawer */}
      <div className={`absolute left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`} style={{ bottom: 0, maxHeight: "60%" }}>
        <div className="p-3 flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-neutral-700" onClick={() => setOpen(false)} />
        </div>
        <div className="divide-y divide-neutral-800 overflow-y-auto" style={{ maxHeight: 360 }}>
          {items.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-10">Sem notificações</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                <div className="flex-1">
                  <div className="font-medium text-white/90">{n.title}</div>
                  <div className="text-sm text-neutral-400">{n.body}</div>
                </div>
                <button className="text-xs text-red-500 hover:text-red-400" onClick={async () => { try { await deleteNotification(userId, n.id); setItems((s)=>s.filter(i=>i.id!==n.id)); } catch(e){ console.error(e); } }}>Excluir</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
