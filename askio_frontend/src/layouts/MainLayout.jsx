import React, { useState, useRef, useEffect } from "react"; // MainLayout: persistent chrome (sidebar + topbar + content outlet)
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { Menu, Bell, Loader2, Check } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { useAuth } from '@clerk/clerk-react';
import { notificationsApi } from '../lib/api';
import moment from 'moment';

// Hook: fires handler when clicking outside the referenced element
const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
};

// Small in-memory notifications dropdown placeholder
const NotificationsPopover = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [marking, setMarking] = useState(false);
  const { getToken } = useAuth();
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const load = async () => {
    try { setLoading(true); const t = await getToken(); const res = await notificationsApi.list({ limit: 8 }, t); setItems(res.items || []); } finally { setLoading(false); }
  };
  const markAll = async () => { try { setMarking(true); const t = await getToken(); await notificationsApi.readAll(t); await load(); } finally { setMarking(false); } };

  useEffect(() => { if (open) load(); }, [open]);
  const unread = items.filter(i=>!i.read).length;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-full hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg w-80 border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <p className="text-sm font-medium">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} disabled={marking} className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
                {marking ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} mark all
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y">
            {loading && <div className="p-4 text-xs text-slate-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/>Loading...</div>}
            {!loading && items.length === 0 && <div className="p-4 text-xs text-slate-500">No notifications</div>}
            {items.map(n => (
              <div key={n.id} className={`p-3 flex gap-3 hover:bg-slate-50 ${!n.read ? 'bg-indigo-50/40' : ''}`}> 
                <img src={n.actor?.profile_picture || '/default-avatar.png'} className="w-8 h-8 rounded-full object-cover"/>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${n.read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>{n.actor?.full_name || 'Someone'} {n.type === 'follow' && 'followed you'} {n.type === 'like' && 'liked your post'} {n.type === 'comment' && 'commented on your post'} {n.type === 'message' && 'sent you a message'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{moment(n.createdAt).fromNow()}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2"/>}
              </div>
            ))}
          </div>
          <div className="p-2 text-center">
            <a href="/notifications" className="text-[11px] text-indigo-600 hover:underline">View all</a>
          </div>
        </div>
      )}
    </div>
  );
};

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar toggle

  return (
    <div className="flex h-screen bg-slate-50">
  {/* Sidebar (slides on mobile) */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

  {/* Main content column */}
      <div className="flex-1 flex flex-col sm:ml-64">
  {/* Top navigation bar */}
        <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Menu
              className="w-6 h-6 cursor-pointer sm:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            />
            <h1 className="text-xl font-semibold text-slate-800">Askio</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationsPopover />
            <UserButton />
          </div>
        </header>

  {/* Routed page content */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;