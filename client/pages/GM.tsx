import { useMemo, useEffect, useState } from "react";
import BackgroundUploader from "@/components/settings/BackgroundUploader";
import {
  listUsers,
  sendNotification,
  generateLicenses,
  setUserVisibility,
  getUserVisibility,
  setUserLicense,
  createNPC,
  listPosts,
  updatePost,
  deletePost,
  listAllChannels,
  getMessagesOnce,
  sendMessage,
  getUser,
  SINS,
  createPost,
  sendGlobalNotification,
  getNotifications,
  deleteNotification,
} from "@/lib/data";
import StatsPanel from "@/components/stats/StatsPanel";
import { useNavigate } from "react-router-dom";

export default function GM() {
  const navigate = useNavigate();
  const gmId = useMemo(() => {
    const id = localStorage.getItem("currentUserId") || crypto.randomUUID();
    localStorage.setItem("currentUserId", id);
    localStorage.setItem("currentUserRole", "gm");
    return id;
  }, []);

  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [visibility, setVisibilityState] = useState<Record<string, boolean>>({});
  const [licenses, setLicenses] = useState<any[]>([]);

  const [posts, setPosts] = useState<any[]>([]);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [postText, setPostText] = useState("");

  const [channels, setChannels] = useState<any[]>([]);
  const [channelMessages, setChannelMessages] = useState<any[]>([]);
  const [chatSender, setChatSender] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");

  useEffect(() => {
    (async () => {
      setUsers(await listUsers());
      setPosts(await listPosts());
      setChannels(await listAllChannels());
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const fetched = (await getUserVisibility(selected)) ?? {};
      const keys = ["stats","chat","feed","license","rules","orgs","profile","noti"] as const;
      const normalized: Record<string, boolean> = {};
      for (const k of keys) normalized[k] = (fetched as any)[k] !== false;
      setVisibilityState(normalized);
    })();
  }, [selected]);

  async function notify() {
    if (!selected || !title) return;
    await sendNotification({ userId: selected, title, body });
    setTitle("");
    setBody("");
  }

  async function resetLicense() {
    if (!selected) return;
    await generateLicenses(selected);
    alert("Licenças regeneradas");
  }

  async function saveVisibility() {
    if (!selected) return;
    await setUserVisibility(selected, visibility);
    alert("Visibilidade atualizada");
  }

  async function assignLicense(licId: string) {
    if (!selected) return;
    await setUserLicense(selected, licId);
    alert("Licença atribuída");
  }

  async function createNewNPC(name: string, avatar?: string) {
    const npc = await createNPC(name, avatar);
    setUsers((u) => [npc, ...u]);
    alert("NPC criado: " + npc.id);
  }

  async function refreshPosts() { setPosts(await listPosts()); }

  async function savePostEdit() {
    if (!editingPost) return;
    await updatePost(editingPost, { body: postText });
    setEditingPost(null);
    setPostText("");
    refreshPosts();
  }

  async function removePost(id: string) { if (!confirm("Apagar post?")) return; await deletePost(id); refreshPosts(); }

  async function loadChannel(id: string) {
    setChannelMessages(await getMessagesOnce(id));
  }

  async function sendChat() {
    if (!chatSender || !chatText) return;
    const channelId = channels[0]?.id;
    if (!channelId) return alert("Nenhum canal disponível");
    await sendMessage({ channelId, authorId: chatSender, body: chatText });
    setChatText("");
    loadChannel(channelId);
  }

  async function impersonateAs(userId: string) {
    // set local current user and navigate to player view
    localStorage.setItem("currentUserId", userId);
    navigate("/player");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black py-10">
      <div className="max-w-7xl mx-auto px-6">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white/90">Painel do Mestre</h1>
          <div className="text-sm text-neutral-400">GM: {gmId.slice(0,8)}</div>
        </header>

        <div className="grid grid-cols-4 gap-6">
          <aside className="col-span-1 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="font-semibold text-white/90 mb-2">Usuários</div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {users.map((u) => (
                <div key={u.id} className={`w-full text-left px-2 py-2 rounded ${selected === u.id ? "bg-cyan-500/20 text-cyan-300" : "hover:bg-white/5"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{u.name || u.id.slice(0,6)}</div>
                      <div className="text-xs text-neutral-400">{u.role}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button onClick={() => setSelected(u.id)} className="text-xs px-2 py-1 rounded bg-white/5">Selecionar</button>
                      <button onClick={() => impersonateAs(u.id)} className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-300">Assumir</button>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="text-sm text-neutral-400">Nenhum usuário</div>}
            </div>

            <div className="mt-4">
              <div className="text-sm text-neutral-300 mb-2">Criar NPC</div>
              <CreateNPCForm onCreate={createNewNPC} />
            </div>
          </aside>

          <main className="col-span-3 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="text-sm text-neutral-300">Selecionado</div>
                  <div className="font-semibold text-white/90">{selected ?? "Nenhum"}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={resetLicense} className="px-3 py-1 rounded bg-yellow-500/20 text-yellow-300 text-sm">Resetar Licença</button>
                </div>
              </div>

              {selected ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="mb-2 text-sm text-neutral-300">Editar Stats</div>
                    <StatsPanel userId={selected} editable />
                  </div>

                  <div>
                    <div className="mb-2 text-sm text-neutral-300">Visibilidade de Menus</div>
                    <div className="space-y-2">
                      {[
                        ["stats","Atribuições"],["chat","Mensagens"],["feed","Feed"],["license","Licença"],["rules","Regras"],["orgs","Organizações"],["profile","Perfil"],["noti","Notificações"],
                      ].map(([key,label]) => (
                        <div key={String(key)} className="flex items-center justify-between">
                          <div className="text-sm text-neutral-200">{label as string}</div>
                          <input type="checkbox" checked={visibility[key as string] === true} onChange={(e)=> setVisibilityState(s=>({ ...s, [key as string]: e.target.checked }))} />
                        </div>
                      ))}
                      <div className="flex justify-end mt-2"><button onClick={saveVisibility} className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 text-sm">Salvar Visibilidade</button></div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm text-neutral-300">Licença</div>
                    <div className="space-y-2">
                      {SINS.map((s) => (
                        <div key={s.id} className="flex items-center justify-between">
                          <div className="text-sm">{s.name}</div>
                          <button onClick={() => assignLicense(s.id)} className="px-2 py-1 rounded bg-white/5 text-xs">Atribuir</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-400">Selecione um usuário para editar</div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-neutral-300 mb-2">Notificações</div>
              <div className="space-y-2 mb-4">
                <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Título" className="w-full rounded bg-black/30 px-3 py-2 text-sm outline-none" />
                <textarea value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Mensagem" rows={3} className="w-full rounded bg-black/30 px-3 py-2 text-sm outline-none" />
                <div className="flex gap-2">
                  <button onClick={notify} className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 text-sm">Enviar ao selecionado</button>
                  <button onClick={async ()=>{ if(!title) return alert('Defina título'); await sendGlobalNotification(title, body); setTitle(''); setBody(''); alert('Notificação enviada para todos'); }} className="px-3 py-1 rounded bg-yellow-500/20 text-yellow-300 text-sm">Enviar para todos</button>
                </div>

                {selected && (
                  <div className="mt-3">
                    <div className="text-sm text-neutral-300 mb-2">Notificações do usuário</div>
                    <UserNotifications userId={selected} />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-neutral-300 mb-2">Feed (moderação)</div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select onChange={(e)=>setChatSender(e.target.value)} className="bg-black/30 px-2 py-1 rounded">
                    <option value="">Post as...</option>
                    {users.filter(u=>u.role==="npc").map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <input placeholder="Post body" value={postText} onChange={(e)=>setPostText(e.target.value)} className="flex-1 bg-black/30 px-2 py-1 rounded" />
                  <button onClick={async ()=>{ if(!chatSender||!postText) return; await createPost({authorId:chatSender, body:postText}); setPostText(""); refreshPosts();}} className="px-3 py-1 rounded bg-cyan-500/20">Postar</button>
                </div>

                {posts.map(p=> (
                  <div key={p.id} className="rounded p-3 bg-black/30">
                    <div className="text-xs text-neutral-400">{new Date(p.createdAt).toLocaleString()} • {p.authorId}</div>
                    {editingPost===p.id? (
                      <div className="mt-2">
                        <textarea className="w-full bg-black/20 p-2" value={postText} onChange={(e)=>setPostText(e.target.value)} />
                        <div className="flex gap-2 mt-2"><button onClick={savePostEdit} className="px-3 py-1 rounded bg-cyan-500/20">Salvar</button><button onClick={()=>setEditingPost(null)} className="px-3 py-1 rounded bg-white/10">Cancelar</button></div>
                      </div>
                    ):(
                      <div className="mt-2">
                        <div className="text-white/90">{p.body}</div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={()=>{ setEditingPost(p.id); setPostText(p.body); }} className="px-2 py-1 rounded bg-white/10 text-xs">Editar</button>
                          <button onClick={()=>removePost(p.id)} className="px-2 py-1 rounded bg-red-500/10 text-xs text-red-300">Apagar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-neutral-300 mb-2">Planos de Fundo</div>
              <div className="grid grid-cols-2 gap-4">
                <BackgroundUploader kind="login" />
                <BackgroundUploader kind="home" />
              </div>
              {selected && (
                <div className="mt-4">
                  <div className="text-sm text-neutral-300 mb-2">Planos de Fundo por Jogador</div>
                  <div className="grid grid-cols-2 gap-4">
                    <BackgroundUploader kind="login" userId={selected} />
                    <BackgroundUploader kind="home" userId={selected} />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-neutral-300 mb-2">Chats</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-neutral-400 mb-2">Canais</div>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {channels.map(c=> <div key={c.id} className="flex items-center justify-between p-2 bg-black/20 rounded"><div>{c.name}</div><div><button onClick={()=>loadChannel(c.id)} className="px-2 py-1 rounded bg-white/10 text-xs">Abrir</button></div></div>)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400 mb-2">Mensagens</div>
                  <div className="space-y-2 max-h-48 overflow-auto bg-black/10 p-2 rounded">
                    {channelMessages.map(m=> <div key={m.id} className="text-sm"><div className="text-xs text-neutral-400">{m.authorId}</div><div className="text-white/90">{m.body}</div></div>)}
                    {channelMessages.length===0 && <div className="text-sm text-neutral-400">Nenhuma mensagem carregada</div>}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <select onChange={(e)=>setChatSender(e.target.value)} className="bg-black/30 px-2 py-1 rounded">
                      <option value="">Enviar como...</option>
                      <option value={gmId}>GM</option>
                      {users.map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <input value={chatText} onChange={(e)=>setChatText(e.target.value)} className="flex-1 bg-black/30 px-2 py-1 rounded" placeholder="Mensagem" />
                    <button onClick={sendChat} className="px-3 py-1 rounded bg-cyan-500/20">Enviar</button>
                  </div>
                </div>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}

// small helper component for NPC creation
function CreateNPCForm({ onCreate }: { onCreate: (name: string, avatar?: string) => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  return (
    <div className="space-y-2">
      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nome NPC" className="w-full bg-black/30 px-2 py-1 rounded" />
      <input value={avatar} onChange={(e)=>setAvatar(e.target.value)} placeholder="Avatar URL (opcional)" className="w-full bg-black/30 px-2 py-1 rounded" />
      <div className="flex gap-2"><button onClick={()=>{ if(!name) return; onCreate(name, avatar); setName(""); setAvatar("");}} className="px-2 py-1 rounded bg-white/10 text-sm">Criar</button></div>
    </div>
  );
}

function UserNotifications({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => setItems(await getNotifications(userId)))();
  }, [userId]);

  async function del(id: string) {
    await deleteNotification(userId, id);
    setItems((s)=>s.filter((it)=>it.id!==id));
  }

  if (!items.length) return <div className="text-sm text-neutral-400">Sem notificações</div>;
  return (
    <div className="space-y-2">
      {items.map((it:any)=> (
        <div key={it.id} className="flex items-start justify-between bg-black/20 p-2 rounded">
          <div>
            <div className="font-medium text-white/90">{it.title}</div>
            <div className="text-xs text-neutral-400">{it.body}</div>
            <div className="text-[10px] text-neutral-500 mt-1">{new Date(it.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <button onClick={()=>del(it.id)} className="px-2 py-1 rounded bg-red-500/10 text-red-300 text-xs">Remover</button>
          </div>
        </div>
      ))}
    </div>
  );
}
