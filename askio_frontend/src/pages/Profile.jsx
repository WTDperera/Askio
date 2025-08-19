import React, { useMemo, useState, useEffect } from "react";
import { usersApi } from "../lib/api";
import { useAuth } from "@clerk/clerk-react";
// Keeping existing PostCard for now, but we also custom render within tabs
import { useParams, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Save, X, BadgeCheck, MapPin, Calendar, Image as ImageIcon, Heart, Users, Upload } from "lucide-react";
import { postsApi } from '../lib/api';
import { useUser } from "@clerk/clerk-react";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();

  // Local editable copy of current user (in real app this would come from API)
  const [profile, setProfile] = useState({});
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.full_name || "",
    username: profile.username || "",
    bio: profile.bio || "Passionate developer and lifelong learner.",
  });
  const [deleted, setDeleted] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Derived
  let user = profile;
  const [userPosts, setUserPosts] = useState([]);
  let posts = userPosts;
  const isOwnProfile = !userId || (clerkUser && userId === clerkUser.id);

  // Merge authenticated Clerk user data into own profile view (non-destructive demo)
  useEffect(() => {
    const load = async () => {
      if (!clerkLoaded || !clerkUser) return;
      try {
        // If viewing own profile
        if (isOwnProfile) {
          const token = await getToken();
          const me = await usersApi.me(token);
          setProfile(me);
          const myPosts = await usersApi.posts(me.clerkId, token);
          setUserPosts(myPosts.map(p => ({ id: p._id, ...p, user: { full_name: me.full_name, username: me.username, profile_picture: me.profile_picture } })));
        } else if (userId) {
          const remote = await usersApi.get(userId);
          setProfile(remote);
          const remotePosts = await usersApi.posts(userId);
          setUserPosts(remotePosts.map(p => ({ id: p._id, ...p, user: { full_name: remote.full_name, username: remote.username, profile_picture: remote.profile_picture } })));
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [isOwnProfile, clerkLoaded, clerkUser, userId]);

  // Tab state: posts | media | likes
  const [activeTab, setActiveTab] = useState('posts');
  const [connectionsTab, setConnectionsTab] = useState('followers');
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  const joinedDaysAgo = useMemo(() => {
    if (!user.createdAt) return null;
    const created = new Date(user.createdAt);
    const now = new Date();
    const diff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return diff;
  }, [user.createdAt]);

  // Filtered views per tab
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const resolve = (u) => (u && u.startsWith('/uploads') ? `${API_BASE}${u}` : u);
  const mediaPosts = useMemo(() => posts.filter(p => (p.image_urls && p.image_urls.length) || p.video_url), [posts]);
  // Demo likes: just reuse posts containing a hashtag # (placeholder logic)
  const likedPosts = useMemo(() => posts.filter(p => /#/i.test(p.content || '')), [posts]);

  const { userId: clerkId } = useAuth();

  const loadConnections = async (type) => {
    try {
      setLoadingConnections(true);
  const targetId = userId || profile.clerkId;
      if (!targetId) return;
      if (type === 'followers') {
        const res = await usersApi.followers(targetId);
        setFollowersList(res.items || []);
      } else {
        const res = await usersApi.following(targetId);
        setFollowingList(res.items || []);
      }
    } catch (e) {
      console.error('Failed to load connections', e);
    } finally { setLoadingConnections(false); }
  };

  useEffect(() => {
    if (activeTab === 'connections') {
      if (connectionsTab === 'followers' && !followersList.length) loadConnections('followers');
      if (connectionsTab === 'following' && !followingList.length) loadConnections('following');
    }
  }, [activeTab]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      const token = await getToken();
      await postsApi.delete(postId, token);
      setUserPosts(prev => prev.filter(p => p._id !== postId && p.id !== postId));
    } catch (e) { alert('Failed to delete post'); }
  };

  const renderPost = (post) => {
    const withHighlightedHashtags = (post.content || '').split(/(#[a-zA-Z0-9_]+)/g).map((part, i) =>
      part.startsWith('#') ? <span key={i} className="text-indigo-600 font-medium">{part}</span> : part
    );
    return (
      <div key={post.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
        <div className="flex items-start gap-3 mb-3">
          <img src={post.user?.profile_picture || user.profile_picture} alt={post.user?.full_name} className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-sm md:text-base">{post.user?.full_name || user.full_name}</h3>
              {user.verified && <BadgeCheck className="w-4 h-4 text-indigo-600" />}
              <span className="text-xs text-slate-500">@{post.user?.username || user.username}</span>
              <span className="text-xs text-slate-400">• 9 days ago</span>
            </div>
            {post.content && (
              <p className="text-sm md:text-[15px] leading-relaxed text-slate-700 mt-2 whitespace-pre-line">
                {withHighlightedHashtags}
              </p>
            )}
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-3">
                {post.image_urls.map((src, idx) => (
                  <img key={idx} src={resolve(src)} alt="post media" className="rounded-lg max-h-80 w-full object-cover" />
                ))}
              </div>
            )}
            {post.video_url && (
              <video controls className="mt-3 rounded-lg w-full max-h-96">
                <source src={resolve(post.video_url)} type="video/mp4" />
              </video>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex gap-6">
            <span>{post.likes?.length || 0} likes</span>
            <span>{post.comments?.length || 0} comments</span>
          </div>
          {post.userId === clerkId && (
            <button onClick={()=>handleDeletePost(post._id || post.id)} className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.username.trim()) return alert("Name & username required");
    try {
  const token = await getToken();
  const updated = await usersApi.updateMe(form, token);
      setProfile(p => ({ ...p, ...updated }));
      setEditing(false);
    } catch (e) {
      alert('Failed to save');
    }
  };

  const handleDelete = () => {
    if (!window.confirm("Are you sure you want to delete your profile? This cannot be undone (demo).")) return;
    // In real app: call API then sign out / redirect
    setDeleted(true);
    setTimeout(() => navigate("/feed"), 1200);
  };

  const handleCoverSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please choose an image file');
    try {
      setUploadingCover(true);
      const token = await getToken();
      const res = await usersApi.uploadCover(file, token);
  setProfile(p => ({ ...p, cover_picture: res.cover_picture, updatedAt: res.user?.updatedAt || Date.now() }));
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally { setUploadingCover(false); }
  };

  if (deleted) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">Profile Deleted</h2>
        <p className="text-slate-500">Redirecting to feed...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      {/* Cover */}
      <div className="relative group">
        { /* Resolve relative /uploads path & cache bust after upload */ }
        {(() => { /* IIFE just to keep logic scoped */ return null; })()}
        {(() => {
          const url = user.cover_picture ? resolve(user.cover_picture) : null;
          const bust = url && user.updatedAt ? `?v=${new Date(user.updatedAt).getTime()}` : '';
          const style = url ? { backgroundImage: `url(${url}${bust})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
          return (
            <div
              className="h-48 w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow overflow-hidden flex items-center justify-center"
              style={style}
            >
              {isOwnProfile && (
                <label className="absolute bottom-3 right-3 bg-white/85 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shadow">
                  <Upload className="w-4 h-4" /> {uploadingCover ? 'Uploading...' : 'Change Cover'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} disabled={uploadingCover} />
                </label>
              )}
            </div>
          );
        })()}
        <img src={resolve(user.profile_picture)} alt={user.full_name} className="w-32 h-32 rounded-full ring-4 ring-white shadow-lg object-cover absolute left-8 -bottom-16" />
      </div>
      {/* Details below cover (no overlap) */}
      <div className="pt-20 pb-6 px-1 md:px-2">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-1">
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                  <input name="full_name" value={form.full_name} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
                  <input name="username" value={form.username} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Bio</label>
                  <textarea name="bio" rows={3} value={form.bio} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">{user.full_name}{user.verified && <BadgeCheck className="w-6 h-6 text-indigo-600" />}</h1>
                <p className="text-slate-600">@{user.username}</p>
                {isOwnProfile && clerkLoaded && clerkUser && (
                  <p className="mt-1 text-xs text-slate-500">Account: <span className="font-medium">{clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress}</span></p>
                )}
                {user.bio && <p className="mt-3 text-sm md:text-[15px] text-slate-700 whitespace-pre-line leading-relaxed">{user.bio}</p>}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-xs md:text-sm text-slate-500">
                  {user.location && <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {user.location}</span>}
                  {joinedDaysAgo != null && <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" /> Joined {joinedDaysAgo} days ago</span>}
                </div>
              </div>
            )}
          </div>
          {isOwnProfile && (
            <div className="flex md:flex-col gap-2 md:items-end">
              {editing ? (
                <>
                  <button onClick={handleSave} className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs md:text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700"><Save className="w-4 h-4" /> Save</button>
                  <button onClick={() => { setEditing(false); setForm({ full_name: profile.full_name, username: profile.username, bio: profile.bio }); }} className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 text-xs md:text-sm font-medium px-4 py-2 rounded-md hover:bg-slate-300"><X className="w-4 h-4" /> Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 bg-white backdrop-blur text-slate-700 text-xs md:text-sm font-medium px-4 py-2 rounded-md border hover:bg-slate-50 shadow"><Pencil className="w-4 h-4" /> Edit</button>
                  <button onClick={handleDelete} className="inline-flex items-center gap-1 bg-rose-600 text-white text-xs md:text-sm font-medium px-4 py-2 rounded-md hover:bg-rose-700"><Trash2 className="w-4 h-4" /> Delete</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Posts</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">{posts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Followers</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">{user.followers?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Following</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">{user.following?.length || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {[ 
          { key: 'posts', label: 'Posts' },
          { key: 'media', label: 'Media', icon: <ImageIcon className="w-4 h-4" /> },
          { key: 'likes', label: 'Likes', icon: <Heart className="w-4 h-4" /> },
          { key: 'connections', label: 'Connections', icon: <Users className="w-4 h-4" /> }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border transition ${activeTab === t.key ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'}`}
          >
            {t.icon && t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {posts.length ? posts.map(renderPost) : <p className="text-slate-500">No posts yet</p>}
        </div>
      )}
      {activeTab === 'media' && (
        <div className="space-y-6">
          {mediaPosts.length ? mediaPosts.map(renderPost) : <p className="text-slate-500">No media posts</p>}
        </div>
      )}
      {activeTab === 'likes' && (
        <div className="space-y-6">
          {likedPosts.length ? likedPosts.map(renderPost) : <p className="text-slate-500">No liked posts (demo)</p>}
        </div>
      )}
      {activeTab === 'connections' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['followers','following'].map(k => (
              <button key={k} onClick={() => { setConnectionsTab(k); if ((k==='followers' && !followersList.length) || (k==='following' && !followingList.length)) loadConnections(k); }} className={`px-4 py-1.5 text-xs font-medium rounded-full border ${connectionsTab===k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'}`}>{k.charAt(0).toUpperCase()+k.slice(1)}</button>
            ))}
          </div>
          {loadingConnections && <p className="text-slate-500 text-sm mb-4">Loading...</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            {(connectionsTab==='followers' ? followersList : followingList).map(u => (
              <div key={u.clerkId} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                <img src={u.profile_picture || '/default-avatar.png'} alt={u.full_name} className="w-12 h-12 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                </div>
                <button onClick={() => window.location.href = `/profile/${u.clerkId}`} className="text-xs bg-slate-100 px-3 py-1 rounded-full hover:bg-slate-200">View</button>
              </div>
            ))}
            {!loadingConnections && (connectionsTab==='followers' ? !followersList.length : !followingList.length) && (
              <p className="text-slate-500 text-sm col-span-full">No {connectionsTab}</p>
            )}
          </div>
        </div>
      )}

  {/* End content */}
    </div>
  );
};

export default Profile;