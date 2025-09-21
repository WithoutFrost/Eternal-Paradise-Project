import { useEffect, useMemo, useState } from "react";
import RadarChart from "./RadarChart";
import { Stats, computeOVR, getOrCreateStats, rankFromValue, updateStats } from "@/lib/data";

export default function StatsPanel({ userId, editable = false }: { userId: string; editable?: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => setStats(await getOrCreateStats(userId)))();
  }, [userId]);

  const values = useMemo(() => {
    if (!stats) return { speed: 0, offense: 0, defense: 0, shoot: 0, pass: 0, dribble: 0 };
    const { speed, offense, defense, shoot, pass, dribble } = stats;
    return { speed, offense, defense, shoot, pass, dribble };
  }, [stats]);

  function setValue(key: keyof Omit<Stats, "ovr" | "ranks">, v: number) {
    if (!stats) return;
    const nextBase = { ...stats, [key]: v } as Stats;
    const auto = computeOVR(nextBase);
    const ranks = {
      ...nextBase.ranks,
      [key]: rankFromValue(v),
      overall: rankFromValue(nextBase.ovr ?? auto),
    } as Stats["ranks"];
    const next: Stats = { ...nextBase, ovr: nextBase.ovr ?? auto, ranks };
    setStats(next);
  }

  async function persist() {
    if (!stats) return;
    // ensure ranks are consistent
    const next = { ...stats, ranks: { ...stats.ranks, overall: rankFromValue(stats.ovr) } } as Stats;
    await updateStats(userId, next);
    setStats(next);
  }

  if (!stats) return <div className="text-sm text-neutral-400">Carregando...</div>;

  const entries: [keyof Omit<Stats, "ovr" | "ranks">, string][] = [
    ["speed", "Speed"],
    ["offense", "Offense"],
    ["defense", "Defense"],
    ["shoot", "Shoot"],
    ["pass", "Pass"],
    ["dribble", "Dribble"],
  ];

  function setOVR(v: number) {
    if (!stats) return;
    const ranks = { ...stats.ranks, overall: rankFromValue(v) } as Stats["ranks"];
    const next: Stats = { ...stats, ovr: v, ranks };
    setStats(next);
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-sm text-neutral-400">OVR</div>
        <div className="text-4xl font-extrabold text-cyan-300 drop-shadow">{stats.ovr}</div>
        <div className="text-sm text-yellow-400">Rank {stats.ranks.overall}</div>
        {stats.gmRank != null && (
          <div className="text-sm text-cyan-300">Rank (Mestre): {stats.gmRank}</div>
        )}
        {editable && (
          <div className="mt-2 flex items-center justify-center gap-3">
            <input type="number" min={0} max={999} value={stats.ovr} onChange={(e)=>setOVR(Number(e.target.value))} className="w-24 rounded bg-black/20 px-2 py-1 text-center" />
            <div className="text-xs text-neutral-400">Editar OVR</div>
          </div>
        )}
        {editable && (
          <div className="mt-2 flex items-center justify-center gap-3">
            <input type="number" min={0} max={999} value={stats.gmRank ?? ''} onChange={(e)=>setStats({...stats, gmRank: e.target.value === '' ? null : Number(e.target.value)})} className="w-24 rounded bg-black/20 px-2 py-1 text-center" />
            <div className="text-xs text-neutral-400">Editar Rank (Mestre)</div>
          </div>
        )}
      </div>
      <RadarChart values={values} />

      <div className="space-y-2">
        {entries.map(([key, label]) => (
          <div key={key} className="grid grid-cols-[1fr,auto,80px] items-center gap-2">
            <div className="text-sm text-neutral-300">{label}</div>
            <div className="text-xs text-yellow-400">{stats.ranks[key]}</div>
            {editable ? (
              <input
                type="range"
                min={1}
                max={100}
                value={stats[key] as number}
                onChange={(e) => setValue(key, Number(e.target.value))}
              />
            ) : (
              <div className="text-sm text-white/90 text-right">{stats[key] as number}</div>
            )}
          </div>
        ))}
      </div>

      {editable && (
        <div className="flex justify-end">
          <button onClick={persist} className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 text-sm">Salvar</button>
        </div>
      )}
    </div>
  );
}
