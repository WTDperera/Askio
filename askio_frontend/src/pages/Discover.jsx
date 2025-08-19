import React, { useEffect, useState } from "react";
import { assets } from "../assets/assets";
import PostCard from "../components/PostCard";
import RecentMessages from "../components/RecentMessages";
import { Search } from "lucide-react";
import { postsApi, usersApi } from "../lib/api";

const Discover = () => {
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const p = await postsApi.list();
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const resolve = (u) => (u && u.startsWith('/uploads') ? `${API_BASE}${u}` : u);
        const items = p.items?.map(post => ({
          id: post._id,
          content: post.content,
          image_urls: (post.image_urls||[]).map(resolve),
          video_url: resolve(post.video_url),
          user: post.user ? { full_name: post.user.full_name, username: post.user.username, profile_picture: post.user.profile_picture } : { full_name: post.userId, username: post.userId, profile_picture: '/default-avatar.png' },
          likes: post.likes || [],
          comments: post.comments || []
        })) || [];
        setPosts(items);
        const u = await usersApi.search('');
        setSuggestions((u.items || []).slice(0,5));
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
      <div className="max-w-xl flex-1 space-y-4">
        {/* Search Bar */}
        <div className="p-4 bg-white rounded-2xl shadow flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-500" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by keyword (client filter)" className="w-full focus:outline-none" />
        </div>
        {posts.filter(p=>!q || (p.content||'').toLowerCase().includes(q.toLowerCase())).map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <div className="hidden lg:block w-full max-w-xs space-y-4 sticky top-[72px] h-fit">
        <div className="bg-white p-4 rounded-md shadow">
          <div className="flex items-center gap-2 mb-3">
            <img src={assets.group_users} alt="suggestions" className="w-6 h-6" />
            <h3 className="font-semibold text-slate-800">You may know</h3>
          </div>
          <div className="space-y-3">
            {suggestions.map((u) => (
              <div key={u.clerkId} className="flex items-center gap-3">
                <img
                  src={u.profile_picture || '/default-avatar.png'}
                  className="w-8 h-8 rounded-full object-cover"
                  alt={u.full_name || u.username}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {u.full_name || u.username}
                  </p>
                  <p className="text-xs text-slate-500">@{u.username}</p>
                </div>
                <button className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full hover:bg-slate-300">
                  View
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-md shadow">
          <h3 className="font-semibold text-slate-800 mb-3">Sponsored</h3>
          <img
            src={assets.sponsored_img}
            className="w-full rounded-md object-cover"
            alt="Sponsored"
          />
        </div>

        <RecentMessages />
      </div>
    </div>
  );
};

export default Discover;