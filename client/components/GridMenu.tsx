import { ReactNode } from "react";

export interface GridItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
}

export default function GridMenu({ items }: { items: GridItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={it.onClick}
          className="group relative rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left shadow-md"
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/10 to-yellow-400/10 opacity-0 group-hover:opacity-100 transition" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="text-white/90 group-hover:text-white text-2xl">{it.icon}</div>
            <div className="text-xs text-neutral-300 text-center leading-tight">{it.label}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
