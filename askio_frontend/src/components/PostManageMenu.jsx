import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Pencil, X, Save, MoreHorizontal, Loader2 } from 'lucide-react';
import { postsApi } from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'react-hot-toast';

const PostManageMenu = ({ post, onUpdated, onDeleted, isOwner }) => {
  const { getToken } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content || '');
  const [loading, setLoading] = useState(false);

  if (!isOwner) return null;

  const save = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const updated = await postsApi.update(post.id, { content: draft }, token);
      onUpdated(updated);
      setEditing(false);
    } catch (e) { toast.error('Update failed'); } finally { setLoading(false); }
  };

  const del = async () => {
    if (!window.confirm('Delete this post?')) return;
    setLoading(true);
    try {
      const token = await getToken();
      await postsApi.delete(post.id, token);
      onDeleted(post.id);
    } catch (e) { toast.error('Delete failed'); } finally { setLoading(false); }
  };

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(()=>{
    const onClick = (e)=>{ if(open && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', onClick);
    return ()=> window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className='relative mt-2 ml-auto w-fit' ref={menuRef}>
      <button
        type='button'
        onClick={()=>setOpen(o=>!o)}
        className='p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition'
        aria-haspopup='true'
        aria-expanded={open}
        aria-label='Post menu'
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className='absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden animate-fade-in'>
          {!editing && (
            <>
              <button onClick={()=>{setEditing(true); setOpen(false);}} className='w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'>
                <Pencil size={14}/> Edit Post
              </button>
              <button onClick={del} disabled={loading} className='w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50'>
                <Trash2 size={14}/> Delete Post
              </button>
            </>
          )}
          {editing && (
            <div className='p-3 space-y-2'>
              <textarea className='w-full border rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500' rows={3} value={draft} onChange={e=>setDraft(e.target.value)} />
              <div className='flex justify-end gap-2'>
                <button disabled={loading} onClick={()=>{setEditing(false);setDraft(post.content||'')}} className='inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600'>
                  <X size={12}/> Cancel
                </button>
                <button disabled={loading} onClick={save} className='inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white'>
                  {loading ? <Loader2 size={12} className='animate-spin'/> : <Save size={12}/>} Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostManageMenu;
