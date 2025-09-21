import { useState } from "react";

const DEFAULT_RULES = [
  {
    title: "Respeite a identidade",
    desc: "Todos (jogadores e NPCs) são tratados como contatos iguais.",
  },
  { title: "1 grupo por usuário", desc: "Cada usuário/NPC só pode pertencer a uma organização." },
  { title: "Moderação GM", desc: "O GM pode editar e remover conteúdos inadequados." },
];

export default function Rules() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {DEFAULT_RULES.map((r, i) => (
        <div key={i} className="rounded-lg border border-white/10 overflow-hidden">
          <button className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10" onClick={() => setOpen(open === i ? null : i)}>
            <div className="font-medium text-white/90">{r.title}</div>
          </button>
          {open === i && <div className="px-3 py-2 text-sm text-neutral-300 bg-black/30">{r.desc}</div>}
        </div>
      ))}
    </div>
  );
}
