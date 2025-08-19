import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Save, X, MoreVertical } from 'lucide-react';
import { storiesApi } from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'react-hot-toast';

const StoryManageMenu = ({ story, isOwner, onUpdated, onDeleted }) => {
  const { getToken } = useAuth();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(story.content || '');
  const [background, setBackground] = useState(story.background_color || '#4f46e5');
  const [loading, setLoading] = useState(false);
  if (!isOwner) return null;

  const save = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const updated = await storiesApi.update(story._id, { content, background_color: background }, token);
      onUpdated && onUpdated(updated);
      setEditing(false);
    } catch (e) { toast.error('Story update failed'); } finally { setLoading(false); }
  };

  const del = async () => {
    if (!window.confirm('Delete this story?')) return;
    setLoading(true);
    try {
      const token = await getToken();
      await storiesApi.delete(story._id, token);
      onDeleted && onDeleted(story._id);
    } catch (e) { toast.error('Story delete failed'); } finally { setLoading(false); }
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  if (editing) {
    return (
      <div className='absolute top-1 right-1 z-20 bg-white/90 backdrop-blur rounded p-2 shadow space-y-2 w-40'>
        <textarea value={content} onChange={e=>setContent(e.target.value)} rows={3} className='w-full text-xs border rounded p-1'/>
        <input type='color' value={background} onChange={e=>setBackground(e.target.value)} className='w-full h-6 cursor-pointer' />
        <div className='flex gap-1 justify-end'>
          <button disabled={loading} onClick={save} className='bg-indigo-600 text-white rounded px-2 py-1 text-xs flex items-center gap-1'><Save size={12}/>Save</button>
          <button disabled={loading} onClick={()=>{setEditing(false);setContent(story.content||'');setBackground(story.background_color||'#4f46e5')}} className='bg-slate-200 text-slate-700 rounded px-2 py-1 text-xs flex items-center gap-1'><X size={12}/>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className='absolute top-1 right-1 z-20' ref={menuRef}>
      <button
        disabled={loading}
        onClick={()=>setMenuOpen(o=>!o)}
        className='p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white shadow focus:outline-none focus:ring focus:ring-white/30'
        aria-label='Story actions'
      >
        <MoreVertical size={16} />
      </button>
      {menuOpen && (
        <div className='mt-1 w-40 bg-white/95 backdrop-blur border border-slate-200 rounded-md shadow-lg overflow-hidden animate-fade-in'>
          <button
            onClick={()=>{ setMenuOpen(false); setEditing(true); }}
            className='w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 text-left'
          >
            <Pencil size={14}/> Edit story
          </button>
          <button
            onClick={()=>{ setMenuOpen(false); del(); }}
            className='w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left'
          >
            <Trash2 size={14}/> Delete story
          </button>
          <button
            onClick={()=>setMenuOpen(false)}
            className='w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 text-left'
          >
            <X size={14}/> Close
          </button>
        </div>
      )}
    </div>
  );
};

export default StoryManageMenu;
