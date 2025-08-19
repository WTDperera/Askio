import React, { useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import moment from 'moment';
import { useAuth } from '@clerk/clerk-react';
import { notificationsApi } from '../lib/api';

const typeLabel = (n) => {
  if (n.message) return n.message;
  switch (n.type) {
    case 'follow': return `${n.actor?.full_name || 'Someone'} started following you`;
    case 'like': return `${n.actor?.full_name || 'Someone'} liked your post`;
  case 'comment': return `${n.actor?.full_name || 'Someone'} commented on your post`;
  case 'message': return `${n.actor?.full_name || 'Someone'} sent you a message`;
    default: return 'Notification';
  }
};

const Notifications = () => {
  const { getToken } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await notificationsApi.list({}, token);
      setItems(res.items || []);
    } catch (e) { /* ignore */ } finally { setLoading(false); }
  };

  const markAll = async () => {
    try { setMarking(true); const t = await getToken(); await notificationsApi.readAll(t); await load(); } finally { setMarking(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6"/>Notifications</h1>
        {items.some(i=>!i.read) && (
          <button onClick={markAll} disabled={marking} className="px-3 py-1.5 rounded-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
            {marking ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Mark all read
          </button>
        )}
      </div>
      {loading && <div className="bg-white rounded-xl shadow p-6 text-center text-slate-500 text-sm">Loading...</div>}
      {!loading && items.length === 0 && <div className="bg-white rounded-xl shadow p-6 text-center text-slate-500 text-sm">No notifications yet.</div>}
      <ul className="space-y-2">
        {items.map(n => (
          <li key={n.id} className={`p-4 bg-white rounded-xl shadow flex gap-3 items-start border ${n.read ? 'border-transparent' : 'border-indigo-200'} hover:shadow-md transition`}> 
            <img src={n.actor?.profile_picture || '/default-avatar.png'} className="w-10 h-10 rounded-full object-cover"/>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${n.read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>{typeLabel(n)}</p>
              <p className="text-[11px] text-slate-400 mt-1">{moment(n.createdAt).fromNow()}</p>
            </div>
            {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2"/>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notifications;