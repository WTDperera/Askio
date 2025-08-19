import React, { useEffect, useState, useCallback } from "react";
import { UserPlus, Eye, UserCheck, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usersApi } from "../lib/api";
import { useAuth } from "@clerk/clerk-react";

// Simple debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const Connections = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actioning, setActioning] = useState({}); // map clerkId => bool

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // use token when available to get correct isFollowing flags
      let res;
      try {
        const token = await getToken();
        if (token) {
          res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/users${debounced ? `?q=${encodeURIComponent(debounced)}` : ''}`, { headers: { Authorization: `Bearer ${token}` }}).then(r => r.json());
        }
      } catch (_) { /* fall back to public */ }
      if (!res) res = await usersApi.search(debounced);
      setUsers(res.items || []);
    } catch (e) {
      setError("Failed to load users");
    } finally { setLoading(false); }
  }, [debounced]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleFollow = async (u) => {
    const follow = !u.isFollowing;
    setActioning(a => ({ ...a, [u.clerkId]: true }));
    // optimistic update
    setUsers(prev => prev.map(x => x.clerkId === u.clerkId ? { ...x, isFollowing: follow, followers: (x.followers || 0) + (follow ? 1 : -1) } : x));
    try {
      const token = await getToken();
      if (follow) await usersApi.follow(u.clerkId, token); else await usersApi.unfollow(u.clerkId, token);
    } catch (e) {
      // revert on error
      setUsers(prev => prev.map(x => x.clerkId === u.clerkId ? { ...x, isFollowing: !follow, followers: (x.followers || 0) + (follow ? -1 : 1) } : x));
    } finally {
      setActioning(a => ({ ...a, [u.clerkId]: false }));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Connections</h1>

      <div className="mb-6 relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search people by name or @username"
          className="w-full pl-9 pr-9 py-2 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && <p className="text-rose-600 mb-4 text-sm">{error}</p>}
      {loading && <p className="text-slate-500 text-sm mb-4">Searching...</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <div key={user.clerkId} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow transition flex flex-col items-center text-center">
            <img
              src={user.profile_picture || '/default-avatar.png'}
              alt={user.full_name}
              className="w-16 h-16 rounded-full object-cover mb-3"
            />
            <h2 className="font-semibold text-slate-800 flex items-center gap-1">{user.full_name}</h2>
            <p className="text-sm text-slate-500">@{user.username}</p>
            {user.bio && <p className="text-xs text-slate-400 mt-2 line-clamp-3 min-h-[2.25rem]" title={user.bio}>{user.bio}</p>}
            <div className="flex gap-3 text-[10px] uppercase tracking-wide text-slate-400 mt-3">
              <span>{user.followers} Followers</span>
              <span>{user.following} Following</span>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => navigate(`/profile/${user.clerkId}`)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium flex items-center gap-1"
              >
                <Eye className="w-4 h-4" /> View
              </button>
              {!user.isSelf && (
                <button
                  disabled={actioning[user.clerkId]}
                  onClick={() => toggleFollow(user)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${user.isFollowing ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-500 text-white hover:bg-indigo-600'} disabled:opacity-50`}
                >
                  {user.isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {user.isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && users.length === 0 && (
          <div className="col-span-full text-center text-slate-500 text-sm">No users found</div>
        )}
      </div>
    </div>
  );
};

export default Connections;