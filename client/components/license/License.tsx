import { useEffect, useState } from "react";
import { generateLicenses, readLicenses, getAssignedLicense, setUserLicense, SINS, type LicenseItem } from "@/lib/data";

export default function License({ userId }: { userId: string }) {
  const [assigned, setAssigned] = useState<LicenseItem | null>(null);

  useEffect(() => {
    (async () => {
      const cur = await getAssignedLicense(userId);
      if (cur) {
        setAssigned(cur);
        return;
      }
      const existing = await readLicenses(userId);
      if (!existing || !existing.length) await generateLicenses(userId);
      // assign one if none
      const pick = SINS[Math.floor(Math.random() * SINS.length)];
      await setUserLicense(userId, pick.id);
      setAssigned(pick);
    })();
  }, [userId]);

  if (!assigned) return <div className="text-sm text-neutral-400">Carregando licença...</div>;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col items-center justify-center h-full">
        <div className="text-6xl">{assigned.logo}</div>
        <div className="text-2xl font-bold text-white/90 mt-3">{assigned.name}</div>
        <div className="text-sm text-neutral-400 mt-2 text-center">{assigned.description}</div>
      </div>
    </div>
  );
}
