import { useEffect, useState } from "react";
import { Organization, createOrganization, joinOrganization, leaveOrganization, listOrganizations } from "@/lib/data";

export default function Orgs({ userId }: { userId: string }) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setOrgs(await listOrganizations());
  }
  useEffect(() => { refresh(); }, []);

  async function create() {
    if (!name.trim()) return;
    await createOrganization(name.trim());
    setName("");
    refresh();
  }

  async function join(id: string) {
    try {
      await joinOrganization(userId, id);
      setError(null);
      refresh();
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  async function leave() {
    await leaveOrganization(userId);
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div className="text-sm text-neutral-300">Criar Organização</div>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded bg-black/30 px-3 py-2 text-sm outline-none" placeholder="Nome" />
          <button onClick={create} className="px-3 rounded bg-white/10 text-white/80">Criar</button>
        </div>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="space-y-2">
        {orgs.map((o) => (
          <div key={o.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-white/90">{o.name}</div>
              <div className="text-xs text-neutral-400">{o.members ? Object.keys(o.members).length : 0} membro(s)</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => join(o.id)} className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 text-sm">Entrar</button>
              <button onClick={leave} className="px-3 py-1 rounded bg-white/10 text-white/80 text-sm">Sair</button>
            </div>
          </div>
        ))}
        {orgs.length === 0 && <p className="text-sm text-neutral-400">Nenhuma organização</p>}
      </div>
    </div>
  );
}
