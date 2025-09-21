import { getFirebase } from "./firebase";
import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  type DatabaseReference,
} from "firebase/database";

export type Role = "player" | "gm" | "npc";
export type Rank = "S" | "A" | "B" | "C" | "D" | "E";

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  role: Role;
  orgId?: string | null;
}

export interface Stats {
  speed: number;
  offense: number;
  defense: number;
  shoot: number;
  pass: number;
  dribble: number;
  ovr: number; // may be overridden by GM
  // optional numeric rank assigned by the GM (separate from letter ranks)
  gmRank?: number | null;
  ranks: Record<keyof Omit<Stats, "ovr" | "ranks" | "gmRank">, Rank> & { overall: Rank };
}

export interface LicenseItem {
  id: string;
  name: string;
  logo: string; // emoji or data URL
  description: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // recipient user id
  title: string;
  body: string;
  createdAt: number;
}

export interface Post {
  id: string;
  authorId: string; // users or NPCs
  body: string;
  createdAt: number;
  likes?: Record<string, boolean>;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  createdAt: number;
}

export type ChannelType = "dm" | "group";
export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  members: Record<string, boolean>; // user ids
}

export interface Organization {
  id: string;
  name: string;
  members: Record<string, boolean>; // user ids
  channelId?: string;
}

// Ranks thresholds typical for Blue Lock style
export function rankFromValue(v: number): Rank {
  if (v >= 90) return "S";
  if (v >= 80) return "A";
  if (v >= 70) return "B";
  if (v >= 60) return "C";
  if (v >= 50) return "D";
  return "E";
}

export function computeOVR(s: Omit<Stats, "ovr" | "ranks">): number {
  const vals = [s.speed, s.offense, s.defense, s.shoot, s.pass, s.dribble];
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function defaultStats(): Stats {
  const base = {
    speed: 60,
    offense: 60,
    defense: 60,
    shoot: 60,
    pass: 60,
    dribble: 60,
  };
  const ovr = computeOVR(base);
  return {
    ...base,
    ovr,
    gmRank: null,
    ranks: {
      speed: rankFromValue(base.speed),
      offense: rankFromValue(base.offense),
      defense: rankFromValue(base.defense),
      shoot: rankFromValue(base.shoot),
      pass: rankFromValue(base.pass),
      dribble: rankFromValue(base.dribble),
      overall: rankFromValue(ovr),
    },
  } as Stats;
}

export const SINS: LicenseItem[] = [
  { id: "orgulho", name: "Orgulho", logo: "👑", description: "Domínio e ambição inabal��vel." },
  { id: "ira", name: "Ira", logo: "🔥", description: "Fúria canalizada como combustível." },
  { id: "inveja", name: "Inveja", logo: "🧿", description: "Desejo de superar todos." },
  { id: "preguica", name: "Preguiça", logo: "🛌", description: "Eficiência fria e calculada." },
  { id: "gula", name: "Gula", logo: "🍽️", description: "Fome por evolução constante." },
  { id: "luxuria", name: "Luxúria", logo: "💎", description: "Atração pelo auge do jogo." },
  { id: "avareza", name: "Avareza", logo: "💰", description: "Acúmulo de vitórias e glória." },
];

function pathUser(id: string) {
  return `users/${id}`;
}
function pathStats(id: string) {
  return `stats/${id}`;
}
function pathLicenses(id: string) {
  return `licenses/${id}`;
}

function pathChannels() {
  return `channels`;
}
function pathMessages(channelId: string) {
  return `messages/${channelId}`;
}
function pathPosts() {
  return `posts`;
}
function pathNotifications(userId: string) {
  return `notifications/${userId}`;
}
function pathOrgs() {
  return `orgs`;
}
function pathUsers() { return `users`; }

function refSafe(path: string): DatabaseReference | null {
  const fb = getFirebase();
  if (!fb.ready) return null;
  return ref(fb.db, path);
}

export async function listUsers(): Promise<User[]> {
  const r = refSafe(pathUsers());
  if (!r) {
    const val = readLocal<Record<string, User>>(pathUsers()) ?? {};
    return Object.values(val);
  }
  const snap = await get(r);
  const val = (snap.val() as Record<string, User>) ?? {};
  return Object.values(val);
}

export async function ensureUser(user: User): Promise<void> {
  const r = refSafe(pathUser(user.id));
  if (!r) return saveLocal(pathUser(user.id), user);
  await set(r, user);
}

export async function getUser(id: string): Promise<User | null> {
  const r = refSafe(pathUser(id));
  if (!r) return readLocal<User>(pathUser(id));
  const snap = await get(r);
  return (snap.val() as User) ?? null;
}

export async function getOrCreateStats(userId: string): Promise<Stats> {
  const r = refSafe(pathStats(userId));
  if (!r) return ensureLocal<Stats>(pathStats(userId), defaultStats());
  const snap = await get(r);
  const current = snap.val() as Stats | null;
  if (current) return current;
  const fresh = defaultStats();
  await set(r, fresh);
  return fresh;
}

export async function isUserGM(userId: string): Promise<boolean> {
  // checks multiple possible admin tag locations
  const r1 = refSafe(`gm_users/${userId}`);
  if (r1) {
    const s1 = await get(r1);
    if (s1.exists()) return Boolean(s1.val());
  }
  const r2 = refSafe(`gm_tags`);
  if (r2) {
    const s2 = await get(r2);
    const val = s2.val();
    if (typeof val === "string") return val.split(",").map((x:string)=>x.trim()).includes(userId);
    if (Array.isArray(val)) return val.includes(userId);
    if (val && typeof val === "object") return !!val[userId];
  }
  // fallback to local flag
  const local = readLocal<Record<string, boolean>>("gm_users") ?? {};
  return !!local[userId];
}

export async function getAssignedLicense(userId: string): Promise<LicenseItem | null> {
  const r = refSafe(`${pathLicenses(userId)}/current`);
  if (!r) {
    const local = readLocal(pathLicenses(userId));
    if (!local) return null;
    // local could be an array of items or an object { items, current }
    if (Array.isArray(local)) return null;
    const currentId = (local as any).current as string | undefined;
    if (!currentId) return null;
    const list = await readLicenses(userId);
    if (!list) return null;
    return list.find((l) => l.id === currentId) ?? null;
  }
  const snap = await get(r);
  const cur = snap.val() as string | null;
  if (!cur) return null;
  const list = await readLicenses(userId);
  if (!list) return null;
  return list.find((l) => l.id === cur) ?? null;
}

export async function updateStats(userId: string, stats: Partial<Stats>): Promise<void> {
  const r = refSafe(pathStats(userId));
  if (!r) return mergeLocal(pathStats(userId), stats);
  await update(r, stats as any);
}

export async function generateLicenses(userId: string): Promise<LicenseItem[]> {
  const r = refSafe(pathLicenses(userId));
  if (!r) {
    saveLocal(pathLicenses(userId), SINS);
    return SINS;
  }
  await set(r, SINS);
  return SINS;
}

export async function readLicenses(userId: string): Promise<LicenseItem[] | null> {
  const r = refSafe(pathLicenses(userId));
  if (!r) {
    const local = readLocal(pathLicenses(userId));
    if (!local) return null;
    if (Array.isArray(local)) return local as LicenseItem[];
    if ((local as any).items && Array.isArray((local as any).items)) return (local as any).items as LicenseItem[];
    if (typeof local === 'object') return Object.values(local) as LicenseItem[];
    return null;
  }
  const snap = await get(r);
  const val = snap.val();
  if (!val) return null;
  if (Array.isArray(val)) return val as LicenseItem[];
  if ((val as any).items && Array.isArray((val as any).items)) return (val as any).items as LicenseItem[];
  if (typeof val === 'object') return Object.values(val) as LicenseItem[];
  return null;
}

export function listenFeed(callback: (posts: Post[]) => void): () => void {
  const r = refSafe(pathPosts());
  if (!r) return listenLocal(pathPosts(), callback);
  return onValue(r, (s) => {
    const val = s.val() as Record<string, Post> | null;
    const list = val ? Object.values(val).sort((a, b) => b.createdAt - a.createdAt) : [];
    callback(list);
  });
}

export async function createPost(p: Omit<Post, "id" | "createdAt">): Promise<Post> {
  const withId: Post = { ...p, id: crypto.randomUUID(), createdAt: Date.now() };
  const r = refSafe(`${pathPosts()}/${withId.id}`);
  if (!r) {
    mergeLocal(pathPosts(), { [withId.id]: withId });
    return withId;
  }
  await set(r, withId);
  return withId;
}

export function listenNotifications(userId: string, cb: (n: NotificationItem[]) => void): () => void {
  const r = refSafe(pathNotifications(userId));
  if (!r) return listenLocal(pathNotifications(userId), cb);
  return onValue(r, (s) => {
    const val = s.val() as Record<string, NotificationItem> | null;
    cb(val ? Object.values(val).sort((a,b) => b.createdAt - a.createdAt) : []);
  });
}

export async function sendNotification(n: Omit<NotificationItem, "id" | "createdAt">): Promise<NotificationItem> {
  const item: NotificationItem = { ...n, id: crypto.randomUUID(), createdAt: Date.now() };
  const r = refSafe(`${pathNotifications(n.userId)}/${item.id}`);
  if (!r) {
    mergeLocal(pathNotifications(n.userId), { [item.id]: item });
    return item;
  }
  await set(r, item);
  return item;
}

export async function sendGlobalNotification(title: string, body: string): Promise<void> {
  const users = await listUsers();
  await Promise.all(users.map((u) => sendNotification({ userId: u.id, title, body })));
}

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const r = refSafe(pathNotifications(userId));
  if (!r) {
    const raw = readLocal<Record<string, NotificationItem>>(pathNotifications(userId)) ?? {};
    return Object.values(raw).sort((a,b)=>b.createdAt - a.createdAt);
  }
  const snap = await get(r);
  const val = (snap.val() as Record<string, NotificationItem>) ?? {};
  return Object.values(val).sort((a,b)=>b.createdAt - a.createdAt);
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  const r = refSafe(`${pathNotifications(userId)}/${id}`);
  if (!r) return removeLocalKey(pathNotifications(userId), id);
  await remove(r);
}

export async function listOrganizations(): Promise<Organization[]> {
  const r = refSafe(pathOrgs());
  if (!r) {
    const val = readLocal<Record<string, Organization>>(pathOrgs()) ?? {};
    const res = Object.values(val).map((o) => ({ ...o, members: o.members ?? {} }));
    return res;
  }
  const snap = await get(r);
  const raw = (snap.val() as Record<string, Organization>) ?? {};
  const res = Object.values(raw).map((o) => ({ ...o, members: o.members ?? {} }));
  return res;
}

export async function createOrganization(name: string): Promise<Organization> {
  const org: Organization = { id: crypto.randomUUID(), name, members: {} };
  // create channel for org
  const ch = await createChannel({ type: "group", members: {}, name: `Org: ${name}` }).catch(()=>null);
  if (ch) org.channelId = ch.id;
  const r = refSafe(`${pathOrgs()}/${org.id}`);
  if (!r) {
    mergeLocal(pathOrgs(), { [org.id]: org });
    return org;
  }
  await set(r, org);
  return org;
}

export async function joinOrganization(userId: string, orgId: string): Promise<void> {
  // ensure user not in any org (one user per group)
  const all = await listOrganizations();
  const current = all.find((o) => (o.members ?? {})[userId]);
  if (current && current.id !== orgId) {
    throw new Error("Usuário já pertence a uma organização");
  }
  const r = refSafe(`${pathOrgs()}/${orgId}/members/${userId}`);
  if (!r) {
    const orgs = readLocal<Record<string, Organization>>(pathOrgs()) ?? {};
    const org = orgs[orgId];
    if (!org) throw new Error("Organização inexistente");
    org.members = org.members ?? {};
    org.members[userId] = true;
    mergeLocal(pathOrgs(), { [orgId]: org });
    // update channel members locally if channel exists
    if (org.channelId) {
      const chs = readLocal<Record<string, Channel>>(pathChannels()) ?? {};
      const ch = chs[org.channelId];
      if (ch) {
        ch.members = ch.members ?? {};
        ch.members[userId] = true;
        mergeLocal(pathChannels(), { [org.channelId]: ch });
      }
    }
    return;
  }
  await set(r, true);
  // add to channel members if present
  const snapOrg = await get(refSafe(`${pathOrgs()}/${orgId}`)!);
  const orgData = (snapOrg.val() as Organization) ?? null;
  if (orgData?.channelId) {
    const chRef = refSafe(`${pathChannels()}/${orgData.channelId}/members/${userId}`);
    if (chRef) await set(chRef, true);
  }
}

export async function leaveOrganization(userId: string): Promise<void> {
  const all = await listOrganizations();
  const current = all.find((o) => (o.members ?? {})[userId]);
  if (!current) return;
  const r = refSafe(`${pathOrgs()}/${current.id}/members/${userId}`);
  if (!r) {
    const orgs = readLocal<Record<string, Organization>>(pathOrgs()) ?? {};
    if (orgs[current.id]) {
      orgs[current.id].members = orgs[current.id].members ?? {};
      delete orgs[current.id].members[userId];
      saveLocal(pathOrgs(), orgs);
    }
    return;
  }
  await remove(r);
}

export async function createChannel(c: Omit<Channel, "id">): Promise<Channel> {
  const ch: Channel = { ...c, id: crypto.randomUUID() };
  const r = refSafe(`${pathChannels()}/${ch.id}`);
  if (!r) {
    mergeLocal(pathChannels(), { [ch.id]: ch });
    return ch;
  }
  await set(r, ch);
  return ch;
}

export function listenMessages(channelId: string, cb: (m: Message[]) => void): () => void {
  const r = refSafe(pathMessages(channelId));
  if (!r) return listenLocal(pathMessages(channelId), cb);
  return onValue(r, (s) => {
    const val = s.val() as Record<string, Message> | null;
    const list = val ? Object.values(val).sort((a,b) => a.createdAt - b.createdAt) : [];
    cb(list);
  });
}

export async function sendMessage(m: Omit<Message, "id" | "createdAt">): Promise<Message> {
  const msg: Message = { ...m, id: crypto.randomUUID(), createdAt: Date.now() };
  const r = refSafe(`${pathMessages(m.channelId)}/${msg.id}`);
  if (!r) {
    mergeLocal(pathMessages(m.channelId), { [msg.id]: msg });
    return msg;
  }
  await set(r, msg);
  return msg;
}

// --- Admin / GM utilities ---
function pathVisibility(userId: string) { return `visibility/${userId}`; }
function pathPost(id: string) { return `posts/${id}`; }

export async function setUserVisibility(userId: string, visibility: Record<string, boolean>): Promise<void> {
  const r = refSafe(pathVisibility(userId));
  if (!r) return saveLocal(pathVisibility(userId), visibility);
  await set(r, visibility);
}

export async function getUserVisibility(userId: string): Promise<Record<string, boolean> | null> {
  const r = refSafe(pathVisibility(userId));
  if (!r) return readLocal(pathVisibility(userId));
  const snap = await get(r);
  return (snap.val() as Record<string, boolean>) ?? null;
}

export function listenUserVisibility(userId: string, cb: (v: Record<string, boolean> | null) => void): () => void {
  const r = refSafe(pathVisibility(userId));
  if (!r) {
    let lastJson = localStorage.getItem(pathVisibility(userId));
    cb(lastJson ? (JSON.parse(lastJson) as any) : null);
    const id = setInterval(() => {
      const cur = localStorage.getItem(pathVisibility(userId));
      if (cur !== lastJson) {
        lastJson = cur;
        cb(cur ? (JSON.parse(cur) as any) : null);
      }
    }, 800);
    return () => clearInterval(id);
  }
  return onValue(r, (s) => cb((s.val() as Record<string, boolean>) ?? null));
}

export async function setUserLicense(userId: string, licenseId: string): Promise<void> {
  const r = refSafe(`${pathLicenses(userId)}/current`);
  if (!r) {
    const local = readLocal(pathLicenses(userId));
    if (Array.isArray(local)) {
      // convert array to object with items + current
      saveLocal(pathLicenses(userId), { items: local, current: licenseId });
      return;
    }
    mergeLocal(pathLicenses(userId), { current: licenseId });
    return;
  }
  await set(r, licenseId);
}

export async function createNPC(name: string, avatarUrl?: string): Promise<User> {
  const u: User = { id: crypto.randomUUID(), name, avatarUrl, role: "npc" };
  await ensureUser(u);
  // create default stats and licenses
  await getOrCreateStats(u.id);
  await generateLicenses(u.id);
  return u;
}

export async function listPosts(): Promise<Post[]> {
  const r = refSafe(pathPosts());
  if (!r) {
    const raw = readLocal<Record<string, Post>>(pathPosts()) ?? {};
    return Object.values(raw).sort((a,b)=>b.createdAt - a.createdAt);
  }
  const snap = await get(r);
  const val = (snap.val() as Record<string, Post>) ?? {};
  return Object.values(val).sort((a,b)=>b.createdAt - a.createdAt);
}

export async function updatePost(id: string, patch: Partial<Post>): Promise<void> {
  const r = refSafe(pathPost(id));
  if (!r) return mergeLocal(pathPosts(), { [id]: { ...(readLocal(pathPost(id)) as Post), ...(patch as any) } });
  await update(r, patch as any);
}

export async function deletePost(id: string): Promise<void> {
  const r = refSafe(pathPost(id));
  if (!r) return removeLocalKey(pathPosts(), id);
  await remove(r);
}

export async function listAllChannels(): Promise<Channel[]> {
  const r = refSafe(pathChannels());
  if (!r) {
    const raw = readLocal<Record<string, Channel>>(pathChannels()) ?? {};
    return Object.values(raw);
  }
  const snap = await get(r);
  const val = (snap.val() as Record<string, Channel>) ?? {};
  return Object.values(val);
}

// --- Friend requests / friends ---
function pathFriendRequests() { return `friend_requests`; }
function pathFriends() { return `friends`; }

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  body?: string;
  createdAt: number;
}

export async function sendFriendRequest(from: string, to: string, body?: string): Promise<FriendRequest> {
  const safeBody = typeof body === "string" ? body : "";
  const item: FriendRequest = { id: crypto.randomUUID(), from, to, body: safeBody, createdAt: Date.now() };
  const rIn = refSafe(`${pathFriendRequests()}/${to}/${item.id}`);
  // mirror path for outgoing tracking
  const rOut = refSafe(`${pathFriendRequests()}_sent/${from}/${item.id}`);
  if (!rIn) {
    mergeLocal(`${pathFriendRequests()}/${to}`, { [item.id]: item });
    mergeLocal(`${pathFriendRequests()}_sent/${from}`, { [item.id]: item });
  } else {
    await set(rIn, item);
    if (rOut) await set(rOut, item); else mergeLocal(`${pathFriendRequests()}_sent/${from}`, { [item.id]: item });
  }
  // notify receiver
  await sendNotification({ userId: to, title: "Pedido de amizade", body: safeBody || "Você recebeu uma solicitação de amizade." });
  return item;
}

export function listenFriendRequests(userId: string, cb: (reqs: FriendRequest[]) => void): () => void {
  const r = refSafe(`${pathFriendRequests()}/${userId}`);
  if (!r) return listenLocal(`${pathFriendRequests()}/${userId}`, cb);
  return onValue(r, (s) => {
    const val = s.val() as Record<string, FriendRequest> | null;
    cb(val ? Object.values(val).sort((a,b)=>b.createdAt - a.createdAt) : []);
  });
}

export async function listFriendRequests(userId: string): Promise<FriendRequest[]> {
  const r = refSafe(`${pathFriendRequests()}/${userId}`);
  if (!r) {
    const raw = readLocal<Record<string, FriendRequest>>(`${pathFriendRequests()}/${userId}`) ?? {};
    return Object.values(raw).sort((a,b)=>b.createdAt - a.createdAt);
  }
  const snap = await get(r);
  const val = (snap.val() as Record<string, FriendRequest>) ?? {};
  return Object.values(val).sort((a,b)=>b.createdAt - a.createdAt);
}

async function addFriendPair(a: string, b: string) {
  const ra = refSafe(`${pathFriends()}/${a}/${b}`);
  if (!ra) {
    mergeLocal(`${pathFriends()}/${a}`, { [b]: true });
  } else {
    await set(ra, true);
  }
}

export async function acceptFriendRequest(userId: string, requestId: string): Promise<void> {
  const r = refSafe(`${pathFriendRequests()}/${userId}/${requestId}`);
  let req: FriendRequest | null = null;
  if (!r) {
    const raw = readLocal<Record<string, FriendRequest>>(`${pathFriendRequests()}/${userId}`) ?? {};
    req = raw[requestId] ?? null;
  } else {
    const snap = await get(r);
    req = (snap.val() as FriendRequest) ?? null;
  }
  if (!req) throw new Error("Request not found");
  // create friendship both sides
  await addFriendPair(req.from, req.to);
  await addFriendPair(req.to, req.from);
  // ensure DM channel exists
  const chs = await listAllChannels();
  let dm = chs.find(c => c.type === "dm" && c.members?.[req.from] && c.members?.[req.to]);
  if (!dm) {
    dm = await createChannel({ type: "dm", members: { [req.from]: true, [req.to]: true }, name: `DM ${req.from.slice(0,4)}-${req.to.slice(0,4)}` });
  }
  // remove request (incoming and outgoing mirrors)
  if (!r) {
    removeLocalKey(`${pathFriendRequests()}/${userId}`, requestId);
  } else {
    await remove(r);
  }
  const rOut = refSafe(`${pathFriendRequests()}_sent/${req.from}/${requestId}`);
  if (!rOut) removeLocalKey(`${pathFriendRequests()}_sent/${req.from}`, requestId); else await remove(rOut);
  // notify both
  await sendNotification({ userId: req.from, title: "Amizade aceita", body: "Sua solicitação foi aceita." });
  await sendNotification({ userId: req.to, title: "Amizade criada", body: "Vocês agora são amigos!" });
}

export async function rejectFriendRequest(userId: string, requestId: string): Promise<void> {
  const r = refSafe(`${pathFriendRequests()}/${userId}/${requestId}`);
  let req: FriendRequest | null = null;
  if (!r) {
    const raw = readLocal<Record<string, FriendRequest>>(`${pathFriendRequests()}/${userId}`) ?? {};
    req = raw[requestId] ?? null;
  } else {
    const snap = await get(r);
    req = (snap.val() as FriendRequest) ?? null;
  }
  if (!r) removeLocalKey(`${pathFriendRequests()}/${userId}`, requestId); else await remove(r);
  if (req) {
    const rOut = refSafe(`${pathFriendRequests()}_sent/${req.from}/${requestId}`);
    if (!rOut) removeLocalKey(`${pathFriendRequests()}_sent/${req.from}`, requestId); else await remove(rOut);
    await sendNotification({ userId: req.from, title: "Amizade recusada", body: "Sua solicitação foi recusada." });
  }
}

export async function cancelFriendRequest(senderId: string, toUserId: string, requestId: string): Promise<void> {
  const r = refSafe(`${pathFriendRequests()}/${toUserId}/${requestId}`);
  if (!r) {
    removeLocalKey(`${pathFriendRequests()}/${toUserId}`, requestId);
  } else {
    const snap = await get(r);
    const req = (snap.val() as FriendRequest) ?? null;
    if (!req) return;
    if (req.from !== senderId) throw new Error("Not owner");
    await remove(r);
  }
  const rOut = refSafe(`${pathFriendRequests()}_sent/${senderId}/${requestId}`);
  if (!rOut) removeLocalKey(`${pathFriendRequests()}_sent/${senderId}`, requestId); else await remove(rOut);
}

export async function listFriends(userId: string): Promise<string[]> {
  const r = refSafe(`${pathFriends()}/${userId}`);
  if (!r) {
    const raw = readLocal<Record<string, boolean>>(`${pathFriends()}/${userId}`) ?? {};
    return Object.keys(raw);
  }
  const snap = await get(r);
  const val = (snap.val() as Record<string, boolean>) ?? {};
  return Object.keys(val);
}

async function ensureDmChannel(a: string, b: string): Promise<Channel> {
  const chs = await listAllChannels();
  let dm = chs.find(c => c.type === "dm" && c.members?.[a] && c.members?.[b]);
  if (!dm) {
    dm = await createChannel({ type: "dm", members: { [a]: true, [b]: true }, name: `DM ${a.slice(0,4)}-${b.slice(0,4)}` });
  }
  return dm;
}

export async function announceDuel(fromUserId: string, toUserId: string): Promise<void> {
  const a = await getUser(fromUserId);
  const b = await getUser(toUserId);
  const nameA = a?.name || fromUserId;
  const nameB = b?.name || toUserId;
  const dm = await ensureDmChannel(fromUserId, toUserId);
  const body = `ANUNCIO DE DUELO\n\n${nameA} Desafia ${nameB}`;
  await sendMessage({ channelId: dm.id, authorId: fromUserId, body });
  await sendGlobalNotification("ANUNCIO DE DUELO", `${nameA} Desafia ${nameB}`);
}

export async function getMessagesOnce(channelId: string): Promise<Message[]> {
  const r = refSafe(pathMessages(channelId));
  if (!r) {
    const raw = readLocal<Record<string, Message>>(pathMessages(channelId)) ?? {};
    return Object.values(raw).sort((a,b)=>a.createdAt - b.createdAt);
  }
  const snap = await get(r);
  const val = (snap.val() as Record<string, Message>) ?? {};
  return Object.values(val).sort((a,b)=>a.createdAt - b.createdAt);
}

// LocalStorage fallback (so the app is usable until Firebase keys are provided)
function readLocal<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function saveLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureLocal<T>(key: string, value: T): T {
  const existing = readLocal<T>(key);
  if (existing) return existing;
  saveLocal(key, value);
  return value;
}

function mergeLocal<T extends object>(key: string, patch: T): void {
  const cur = readLocal<object>(key) ?? {};
  const next = { ...(cur as any), ...(patch as any) };
  saveLocal(key, next as any);
}

function listenLocal<T>(key: string, cb: (value: T[]) => void): () => void {
  const id = setInterval(() => {
    const v = readLocal<Record<string, T>>(key) ?? {};
    cb(Object.values(v));
  }, 800);
  return () => clearInterval(id);
}

function removeLocalKey(key: string, id: string): void {
  const cur = readLocal<Record<string, unknown>>(key) ?? {};
  delete cur[id];
  saveLocal(key, cur);
}
