import { useEffect, useState } from "react";
import { createPost, listenFeed, Post } from "@/lib/data";

export default function Feed({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");

  useEffect(() => listenFeed(setPosts), []);

  async function submit() {
    if (!text.trim()) return;
    await createPost({ authorId: userId, body: text.trim() });
    setText("");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="O que está acontecendo?"
          className="w-full resize-none bg-transparent outline-none text-sm text-white/90 placeholder:text-neutral-400"
          rows={3}
        />
        <div className="flex justify-end">
          <button onClick={submit} className="px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-sm">Postar</button>
        </div>
      </div>

      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-neutral-400">{new Date(p.createdAt).toLocaleString()}</div>
            <div className="text-white/90 whitespace-pre-wrap">{p.body}</div>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-8">Sem posts por enquanto</p>
        )}
      </div>
    </div>
  );
}
