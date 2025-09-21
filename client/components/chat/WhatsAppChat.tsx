import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, UserPlus } from "lucide-react";
import {
  listUsers,
  listAllChannels,
  getMessagesOnce,
  createChannel,
  listenMessages,
  sendMessage,
  getUser,
  sendNotification,
  listenFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  listFriends,
} from "@/lib/data";

export default function WhatsAppChat({ userId }: { userId: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [lastMap, setLastMap] = useState<Record<string, any>>({});
  const [query, setQuery] = useState("");

  // friends & incoming requests
  const [incoming, setIncoming] = useState<any[]>([]);
  const [friends, setFriends] = useState<string[]>([]);

  // internal view: list or convo
  const [view, setView] = useState<"list" | "conv">("list");
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());


  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      setUsers(await listUsers());
      setChannels(await listAllChannels());
      setFriends(await listFriends(userId));
      unsub = listenFriendRequests(userId, (rs) => setIncoming(rs));
    })();
    return () => unsub && unsub();
  }, [userId]);

  useEffect(() => {
    // compute last message per contact and per channel
    (async () => {
      const map: Record<string, any> = {};
      // channels last message
      for (const ch of channels) {
        if (!ch) continue;
        const msgs = await getMessagesOnce(ch.id);
        if (msgs.length) map[`ch_${ch.id}`] = msgs[msgs.length - 1];
      }
      // dm last messages keyed by user id
      for (const u of users) {
        if (u.id === userId) continue;
        const ch = channels.find((c: any) => c.type === "dm" && c.members?.[userId] && c.members?.[u.id]);
        if (ch) {
          const last = map[`ch_${ch.id}`];
          if (last) map[u.id] = last;
        }
      }
      setLastMap(map);
    })();
  }, [users, channels, userId]);

  async function openChatWith(uOrChannel: any, asChannel = false) {
    // if passed channel, open that channel; else find/create dm (only for friends)
    let ch: any = null;
    let userTarget: any = null;
    if (asChannel) {
      ch = uOrChannel;
    } else {
      const u = uOrChannel;
      userTarget = u;
      // block opening DM if not friends
      if (!friends.includes(u.id)) {
        alert("Apenas amigos podem abrir DM. Envie uma solicitação primeiro.");
        return;
      }
      ch = channels.find((c: any) => c.type === "dm" && c.members?.[userId] && c.members?.[u.id]);
      if (!ch) {
        ch = await createChannel({ type: "dm", members: { [userId]: true, [u.id]: true }, name: `DM ${userId.slice(0,4)}-${u.id.slice(0,4)}` });
        setChannels((s) => [ch, ...s]);
      }
    }

    setActive({ user: userTarget, channel: ch });
    setView("conv");
    // subscribe
    const unsub = listenMessages(ch.id, (m) => setMessages(m));
    // ensure initial load
    (async () => setMessages(await getMessagesOnce(ch.id)))();
    // keep unsub on change
    (window as any).__last_unsub && (window as any).__last_unsub();
    (window as any).__last_unsub = unsub;
  }

  function backToList() {
    setView("list");
    setActive(null);
    setMessages([]);
    (window as any).__last_unsub && (window as any).__last_unsub();
    (window as any).__last_unsub = null;
  }

  async function submit() {
    if (!active || !text.trim()) return;
    await sendMessage({ channelId: active.channel.id, authorId: userId, body: text.trim() });
    setText("");
  }

  const contacts = useMemo(() => {
    // build list items: groups then dms
    const items: any[] = [];
    // groups where user is member
    const groupChannels = channels.filter((c:any)=> c.type === "group" && c.members?.[userId]);
    for (const ch of groupChannels) {
      const last = lastMap[`ch_${ch.id}`];
      if (ch.name?.toLowerCase().includes(query.toLowerCase())) items.push({ type: "group", id: ch.id, name: ch.name, last, raw: ch });
    }
    const q = query.trim().toLowerCase();
    for (const u of users) {
      if (u.id === userId) continue;
      if (!u.name?.toLowerCase().includes(q)) continue;
      const isFriend = friends.includes(u.id);
      const ch = channels.find((c: any) => c.type === "dm" && c.members?.[userId] && c.members?.[u.id]);
      const last = lastMap[u.id];
      if (isFriend && (ch || last)) {
        items.push({ type: "dm", id: u.id, name: u.name, last, raw: u });
      } else if (q.length > 0) {
        // Only show non-friends when searching
        items.push({ type: "user", id: u.id, name: u.name, raw: u });
      }
    }
    // sort by last message time (fallback to 0)
    items.sort((a,b)=> (b.last?.createdAt ?? 0) - (a.last?.createdAt ?? 0));
    return items;
  }, [users, channels, lastMap, query, userId]);

  return (
    <div className="h-full relative overflow-hidden">
      <div className={`flex w-[200%] transition-transform duration-300 ${view === "list" ? "translate-x-0" : "-translate-x-1/2"}`}>
        {/* contacts list */}
        <div className="w-1/2 p-2">
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} className="text-neutral-400" />
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar" className="flex-1 bg-black/20 px-2 py-1 rounded text-sm outline-none" />
          </div>

          <div className="space-y-2">
            {incoming.length>0 && (
              <div className="space-y-2 mb-3">
                <div className="text-sm text-neutral-400">Solicitações</div>
                {Array.from(new Map(incoming.map((r:any)=>[r.id,r])).values()).map((req:any)=> (
                  <div key={req.id} className="flex items-center justify-between p-2 bg-white/3 rounded">
                    <div>
                      <div className="font-medium text-white/90">{users.find((u:any)=>u.id===req.from)?.name || req.from}</div>
                      <div className="text-xs text-neutral-400">{req.body && req.body.length ? req.body : "Pedido de amizade"}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 text-sm" onClick={async ()=>{ await acceptFriendRequest(userId, req.id); setIncoming((s)=>s.filter((r:any)=>r.id!==req.id)); setChannels(await listAllChannels()); setFriends(await listFriends(userId)); }}>Aceitar</button>
                      <button className="px-2 py-1 rounded bg-red-500/10 text-red-300 text-sm" onClick={async ()=>{ await rejectFriendRequest(userId, req.id); setIncoming((s)=>s.filter((r:any)=>r.id!==req.id)); }}>Recusar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {contacts.map((c) => (
              <div key={c.type+"_"+c.id} className="w-full flex items-center gap-3 p-2 rounded hover:bg-white/5 text-left">
                <div onClick={c.type !== "user" ? () => openChatWith(c.raw, c.type === "group") : undefined} className={`flex-1 flex items-center gap-3 text-left ${c.type === "user" ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}>
                  <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center text-sm border border-white/10">
                    {c.raw?.avatarUrl ? <img src={c.raw.avatarUrl} alt={c.name} className="w-full h-full object-cover" /> : <div className="text-neutral-400">{(c.name||c.id).charAt(0)}</div>}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white/90">{c.name ?? c.id}</div>
                    {c.type === "dm" ? (
                      <>
                        <div className="text-xs text-neutral-400 truncate">{c.last?.body ?? "Sem mensagens"}</div>
                        <div className="text-[11px] text-neutral-500 mt-1">DM</div>
                      </>
                    ) : (
                      <div className="text-[11px] text-neutral-500 mt-1">Contato</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.type === "user" && (
                    <button
                      className="p-2 rounded bg-yellow-500/20 text-yellow-300 disabled:opacity-50"
                      title={sent.has(c.id) ? "Solicitação enviada" : "Solicitar amizade"}
                      aria-label="Solicitar amizade"
                      disabled={sent.has(c.id)}
                      onClick={async ()=>{
                        await sendFriendRequest(userId, c.id);
                        await sendNotification({ userId: c.id, title: "Pedido de amizade", body: "Você recebeu uma solicitação de amizade." });
                        setSent(prev=> new Set([...Array.from(prev), c.id]));
                      }}
                    >
                      <UserPlus size={16} />
                    </button>
                  )}
                  {c.type === "dm" && (
                    <div className="text-xs text-neutral-400">{c.last ? new Date(c.last.createdAt).toLocaleTimeString() : ""}</div>
                  )}
                </div>
              </div>
            ))}
            {contacts.length===0 && <div className="text-sm text-neutral-400">Nenhum contato</div>}
          </div>
        </div>

        {/* conversation */}
        <div className="w-1/2 p-2 border-l border-white/5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={backToList} className="px-2 py-1 rounded bg-white/5"><ArrowLeft size={16} /></button>
            <div className="flex-1">
              <div className="font-semibold text-white/90">{active?.channel?.name ?? active?.user?.name ?? "Conversa"}</div>
              <div className="text-xs text-neutral-400">{active?.channel?.type ? (active.channel.type === "group" ? `Grupo • ${Object.keys(active.channel.members||{}).length} membros` : "DM") : (active?.user?.role ?? "")}</div>
            </div>
            <div className="flex gap-2" />
          </div>

          <div className="flex-1 overflow-auto no-scrollbar space-y-3 p-2">
            {messages.map((m: any) => (
              <div key={m.id} className={`max-w-[80%] ${m.authorId===userId?"ml-auto text-right":""}`}>
                <div className={`inline-block rounded px-3 py-2 ${m.authorId===userId?"bg-cyan-500/20 text-cyan-200":"bg-white/10 text-white/90"}`}>{m.body}</div>
                <div className="text-[11px] text-neutral-400 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {messages.length===0 && <div className="text-sm text-neutral-400">Sem mensagens</div>}
          </div>

          <div className="mt-2 flex gap-2">
            <input value={text} onChange={(e)=>setText(e.target.value)} className="flex-1 bg-black/20 px-3 py-2 rounded outline-none" placeholder="Mensagem" />
            <button onClick={submit} className="px-3 py-2 rounded bg-cyan-500/20 text-cyan-300">Enviar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
