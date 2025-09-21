import { useEffect, useMemo, useState } from "react";
import { Channel, ChannelType, Message, createChannel, listenMessages, sendMessage, getUser } from "@/lib/data";

export default function Chat({ userId }: { userId: string }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [authors, setAuthors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const list = await (await import("@/lib/data")).listAllChannels();
        setChannels(list);
        setCurrent((list[0] && list[0].id) || null);
      } catch (e) {
        // fallback to local
        const raw = localStorage.getItem("channels");
        if (raw) {
          const parsed = JSON.parse(raw) as Channel[];
          setChannels(parsed);
          setCurrent((parsed[0] && parsed[0].id) || null);
        }
      }
    })();
  }, []);

  useEffect(() => {
    try { localStorage.setItem("channels", JSON.stringify(channels)); } catch {}
  }, [channels]);

  useEffect(() => {
    if (!current) return;
    return listenMessages(current, setMessages);
  }, [current]);

  useEffect(() => {
    // fetch unique authors for messages
    const ids = Array.from(new Set(messages.map((m) => m.authorId)));
    ids.forEach(async (id) => {
      if (authors[id]) return;
      const u = await getUser(id);
      setAuthors((s) => ({ ...s, [id]: u?.name ?? (id === userId ? "Você" : `User:${id.slice(0,4)}`) }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const currentChannel = useMemo(() => channels.find((c) => c.id === current) ?? null, [channels, current]);

  async function createNew(type: ChannelType) {
    const ch = await createChannel({ type, members: { [userId]: true }, name: type === "dm" ? "DM" : "Grupo" });
    setChannels((c) => [ch, ...c]);
    setCurrent(ch.id);
  }

  async function submit() {
    if (!current || !text.trim()) return;
    await sendMessage({ channelId: current, authorId: userId, body: text.trim() });
    setText("");
  }

  return (
    <div className="grid grid-cols-[120px,1fr] gap-3">
      <div className="space-y-2">
        <button className="w-full px-2 py-1 text-xs rounded bg-white/5 hover:bg-white/10" onClick={() => createNew("dm")}>+ DM</button>
        <button className="w-full px-2 py-1 text-xs rounded bg-white/5 hover:bg-white/10" onClick={() => createNew("group")}>+ Grupo</button>
        <div className="space-y-1 max-h-72 overflow-auto">
          {channels.map((c) => (
            <button key={c.id} onClick={() => setCurrent(c.id)} className={`w-full text-left px-2 py-1 rounded text-xs ${current === c.id ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 hover:bg-white/10 text-white/80"}`}>
              <div className="flex items-center justify-between">
                <div className="truncate">{c.name}</div>
                <div className="text-[11px] text-neutral-400">{Object.keys(c.members).length}</div>
              </div>
            </button>
          ))}
          {channels.length === 0 && <p className="text-[11px] text-neutral-400">Crie um canal</p>}
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 flex flex-col h-72">
        <div className="px-3 py-2 border-b border-white/10 text-sm text-white/90">{currentChannel ? currentChannel.name : "Sem canal"}</div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="space-y-1">
              <div className={`text-[11px] ${m.authorId === userId ? "text-cyan-300 text-right" : "text-neutral-400"}`}>{authors[m.authorId] ?? (m.authorId === userId ? "Você" : m.authorId)}</div>
              <div className={`max-w-[70%] rounded px-2 py-1 text-sm ${m.authorId === userId ? "ml-auto bg-cyan-500/20 text-cyan-200" : "bg-white/10 text-white/90"}`}>{m.body}</div>
            </div>
          ))}
          {messages.length === 0 && <p className="text-xs text-neutral-400">Sem mensagens</p>}
        </div>
        <div className="p-2 border-t border-white/10 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 bg-black/30 rounded px-2 text-sm outline-none text-white/90" placeholder="Mensagem" />
          <button onClick={submit} className="px-3 rounded bg-cyan-500/20 text-cyan-300 text-sm">Enviar</button>
        </div>
      </div>
    </div>
  );
}
