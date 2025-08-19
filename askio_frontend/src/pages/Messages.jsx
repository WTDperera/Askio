import React, { useEffect, useState } from "react";
import { usersApi, messagesApi } from "../lib/api";
import { Eye, MessageSquare, MessageCirclePlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import moment from 'moment';

const Messages = () => {
  const navigate = useNavigate();
  const { getToken, userId } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const res = await messagesApi.conversations(token);
        setConversations(res.items || []);
      } catch (e) {
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
    const interval = setInterval(loadConversations, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (!showNew) return;
      try {
        const res = await usersApi.search(search);
        setSearchResults(res.items || []);
      } catch (e) { /* ignore */ }
    };
    const t = setTimeout(searchUsers, 300);
    return () => clearTimeout(t);
  }, [search, showNew]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <button onClick={() => { setShowNew(v=>!v); setSearch(''); }} className="flex items-center gap-2 px-3 py-2 rounded-full bg-indigo-500 text-white text-sm hover:bg-indigo-600">
          {showNew ? <><X size={16}/> Cancel</> : <><MessageCirclePlus size={16}/> New chat</>}
        </button>
      </div>

      {showNew && (
        <div className="mb-8 p-4 bg-white rounded-xl shadow">
          <h2 className="font-semibold mb-3">Start a new chat</h2>
          <input
            type="text"
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full mb-3 px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-indigo-200"
          />
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {searchResults.map(u => (
              <div key={u.clerkId} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <img src={u.profile_picture || '/default-avatar.png'} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-medium text-slate-800">{u.full_name || u.username}</p>
                    <p className="text-xs text-slate-500">@{u.username}</p>
                  </div>
                </div>
                <button onClick={()=>navigate(`/messages/${u.clerkId}`)} className="px-3 py-1.5 rounded-full bg-indigo-500 text-white text-xs hover:bg-indigo-600">Message</button>
              </div>
            ))}
            {searchResults.length === 0 && <p className="text-sm text-slate-500">No users found.</p>}
          </div>
        </div>
      )}

      {loading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {!loading && conversations.length === 0 && !showNew && (
        <p className="text-slate-500">No conversations yet. Start a new one!</p>
      )}
      <div className="space-y-3">
        {conversations.map(c => {
          const mine = c.peer?.clerkId === userId ? '(You)' : '';
          const lastFromMe = c.from === userId; // not present currently; fallback using text prefix maybe
          const unread = !c.seen && c.peer?.clerkId !== userId; // if last message unseen and not mine
          return (
            <div key={c.id} className="flex items-center justify-between p-4 bg-white rounded-xl shadow hover:shadow-md transition cursor-pointer" onClick={()=>navigate(`/messages/${c.peer?.clerkId}`)}>
              <div className="flex items-center gap-4 min-w-0">
                <img src={c.peer?.profile_picture || '/default-avatar.png'} className="w-12 h-12 rounded-full object-cover" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="truncate max-w-[180px]">{c.peer?.full_name || c.peer?.username}</span> {mine}
                    {unread && <span className="w-2 h-2 bg-indigo-500 rounded-full" />}
                  </h2>
                  <p className="text-sm text-slate-500 truncate max-w-xs">{c.text || (c.media_url ? 'Media' : '')}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-[11px] text-slate-400 whitespace-nowrap">{moment(c.createdAt).fromNow()}</p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/messages/${c.peer?.clerkId}`); }}
                    className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                    title="Open chat"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e)=>{ e.stopPropagation(); navigate(`/profile/${c.peer?.clerkId}`); }}
                    className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    title="View profile"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Messages;