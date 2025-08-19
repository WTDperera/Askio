import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Smile, Paperclip, Mic, CheckCheck, ArrowLeft } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { usersApi, messagesApi } from '../lib/api';
import { useAuth } from '@clerk/clerk-react';

const dayLabel = (d) => {
  const date = new Date(d);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString();
};

const Chatbox = () => {
  const { userId: peerId } = useParams();
  const navigate = useNavigate();
  const { getToken, userId: myId } = useAuth();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);

  // Load peer basic info (public profile) & messages
  useEffect(() => {
    const load = async () => {
      if (!peerId) return;
      try {
        setLoading(true);
        const [profileRes, token] = await Promise.all([
          usersApi.get(peerId),
          getToken()
        ]);
        setSelectedUser(profileRes.user || profileRes); // shape maybe {user}
        const msgs = await messagesApi.listWith(peerId, token);
        setMessages(msgs.items || []);
        // mark seen
        await messagesApi.markSeen(peerId, token);
      } catch (e) {
        setError('Failed to load chat');
      } finally {
        setLoading(false);
      }
    };
    load();
    // polling for new messages
    const interval = setInterval(async () => {
      try {
        const token = await getToken();
        const msgs = await messagesApi.listWith(peerId, token);
        setMessages(msgs.items || []);
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [peerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const grouped = useMemo(() => {
    const map = {};
    messages.forEach((m) => {
      const key = dayLabel(m.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const optimistic = {
      _id: 'tmp-' + Math.random().toString(36).slice(2),
      from: myId,
      to: peerId,
      text,
      createdAt: new Date().toISOString(),
      seen: false,
      optimistic: true
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    try {
      setSending(true);
      const token = await getToken();
      const saved = await messagesApi.send(peerId, { text }, token);
      setMessages(prev => prev.map(m => m._id === optimistic._id ? saved : m));
    } catch (e) {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setError('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (loading) {
    return <div className="flex-1 max-w-xl rounded-xl p-6 shadow bg-white">Loading...</div>;
  }
  if (error) {
    return <div className="flex-1 max-w-xl rounded-xl p-6 shadow bg-white text-red-500 text-sm">{error}</div>;
  }
  if (!selectedUser) {
    return <div className="flex-1 max-w-xl rounded-xl p-6 shadow bg-white">User not found.</div>;
  }

  return (
    <div className="flex-1 max-w-3xl rounded-xl shadow bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b sticky top-0 bg-white z-10">
        <button onClick={()=>navigate('/messages')} className="p-2 rounded-full hover:bg-slate-100"><ArrowLeft size={18} /></button>
        <img
          src={selectedUser.profile_picture || '/default-avatar.png'}
          alt={selectedUser.full_name || selectedUser.username}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800">
            {selectedUser.full_name || selectedUser.username}
          </h3>
          <p className="text-xs text-slate-500">direct message</p>
        </div>
      </div>

      {/* Chat area */}
      <div
        className="relative p-3 sm:p-4 h-[65vh] overflow-y-auto"
        style={{
          background:
            "radial-gradient(#e5e7eb 1px, transparent 1px), radial-gradient(#e5e7eb 1px, transparent 1px)",
          backgroundPosition: "0 0, 10px 10px",
          backgroundSize: "20px 20px",
        }}
      >
        {Object.entries(grouped).map(([day, msgs]) => (
          <div key={day}>
            <div className="flex justify-center my-2">
              <span className="text-[11px] bg-white/70 backdrop-blur px-2 py-1 rounded-full text-slate-600 border">
                {day}
              </span>
            </div>
            {msgs.map((m) => {
              const mine = m.from === myId;
              return (
                <div
                  key={m._id || m.id}
                  className={`flex mb-2 ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl shadow-sm text-sm ${
                      mine
                        ? "bg-indigo-500 text-white rounded-br-sm"
                        : "bg-white text-slate-800 rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <div className="flex items-center gap-1 justify-end mt-1 opacity-80">
                      <span className="text-[10px]">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {mine && <CheckCheck size={14} className={(m.seen ? 'text-cyan-200' : 'text-white/70')} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 pl-2 pb-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-slate-600">typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 p-3 border-t bg-white"
      >
        <button type="button" className="p-2 rounded-full hover:bg-slate-100" title="Emoji">
          <Smile size={20} className="text-slate-600" />
        </button>
        <button type="button" className="p-2 rounded-full hover:bg-slate-100" title="Attach">
          <Paperclip size={20} className="text-slate-600" />
        </button>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message"
          className="flex-1 resize-none max-h-28 p-2 rounded-xl border focus:outline-none focus:ring focus:ring-indigo-200"
        />
        <button
          type="submit"
          className="p-2 rounded-full bg-indigo-500 text-white hover:bg-indigo-600"
          title="Send"
        >
          <Send size={20} />
        </button>
        <button type="button" className="p-2 rounded-full hover:bg-slate-100" title="Voice">
          <Mic size={20} className="text-slate-600" />
        </button>
      </form>
    </div>
  );
};

export default Chatbox;