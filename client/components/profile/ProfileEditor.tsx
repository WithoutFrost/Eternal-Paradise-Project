import { useEffect, useState } from "react";
import { User, ensureUser, getUser } from "@/lib/data";

export default function ProfileEditor({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const u = (await getUser(userId)) ?? { id: userId, name: "Jogador", role: "player" as const };
      await ensureUser(u);
      setUser(u);
    })();
  }, [userId]);

  async function save() {
    if (!user) return;
    await ensureUser(user);
  }

  if (!user) return <div className="text-sm text-neutral-400">Carregando...</div>;

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm text-neutral-400">Nome</label>
        <input
          className="w-full mt-1 rounded bg-black/30 px-3 py-2 text-sm outline-none"
          value={user.name}
          onChange={(e) => setUser({ ...user, name: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm text-neutral-400">Avatar URL</label>
        <input
          className="w-full mt-1 rounded bg-black/30 px-3 py-2 text-sm outline-none"
          value={user.avatarUrl ?? ""}
          onChange={(e) => setUser({ ...user, avatarUrl: e.target.value })}
        />
      </div>
      <div className="flex justify-end">
        <button onClick={save} className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 text-sm">Salvar</button>
      </div>
    </div>
  );
}
