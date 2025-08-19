import React, { useState } from "react"; // PostCard – feed item card
import { Heart, MessageCircle, Share2, Send, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { postsApi } from "../lib/api";
import { useAuth } from "@clerk/clerk-react";
import PostManageMenu from './PostManageMenu';
import moment from 'moment';

const PostCard = ({ post, currentUserId, onPostUpdated, onPostDeleted }) => {
  const { getToken } = useAuth();
  const api = { like: async (id) => postsApi.like(id, await getToken()), comment: async (id, content) => postsApi.comment(id, content, await getToken()) };
  const [liked, setLiked] = useState(() => (post.likes || []).includes(currentUserId));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState(
    (post.comments || []).map((c) => ({
      id: c._id || c.id || Math.random().toString(36).slice(2),
      content: c.content || c.text || "",
      createdAt: c.createdAt,
      userId: c.userId || c.user?.userId,
      user: c.user ? {
        full_name: c.user.full_name,
        username: c.user.username,
        profile_picture: c.user.profile_picture
      } : { full_name: c.userId || 'Anonymous', username: c.userId || 'anon', profile_picture: '/default-avatar.png' }
    }))
  );

  const commentCount = comments.length;

  const handleLike = async () => {
    const prevLiked = liked;
    const optimisticLiked = !prevLiked;
    setLiked(optimisticLiked);
    setLikeCount(likeCount + (optimisticLiked ? 1 : -1));
    try {
      const data = await api.like(post.id);
      setLikeCount(data.likes.length);
      setLiked(data.liked);
    } catch (e) {
      setLiked(prevLiked);
      setLikeCount(likeCount);
      toast.error("Failed to like");
    }
  };

  const handleShare = async () => { // share via Web Share API or clipboard
    const url = `${window.location.origin}/feed#${post.id}`;
    const shareData = {
      title: `${post.user?.full_name || "Askio"}`,
      text: post.content?.slice(0, 100) || "Check out this post on Askio!",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Post link copied to clipboard!");
      }
    } catch {
      toast.error("Could not share the post.");
    }
  };

  const handleAddComment = async (e) => { // append local comment + backend
    e?.preventDefault?.();
    const text = commentInput.trim();
    if (!text) return;
    const tempId = Math.random().toString(36).slice(2);
    const optimistic = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      user: { full_name: "You", username: "you", profile_picture: "/default-avatar.png" }
    };
    setComments(prev => [...prev, optimistic]);
    setCommentInput("");
    if (!commentsOpen) setCommentsOpen(true);
    try {
  const saved = await api.comment(post.id, text);
  setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: saved._id || saved.id, createdAt: saved.createdAt, user: saved.user ? { full_name: saved.user.full_name, username: saved.user.username, profile_picture: saved.user.profile_picture } : c.user } : c));
    } catch (err) {
      setComments(prev => prev.filter(c => c.id !== tempId));
      toast.error("Failed to comment");
    }
  };

  // Highlight hashtags (#tag) inside the post content
  const renderContent = (text) => {
    if (!text) return null;
    const parts = [];
    const regex = /#[A-Za-z0-9_]+/g; // basic hashtag pattern
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const tag = match[0];
      parts.push(
        <span
          key={match.index}
          className="text-orange-500 hover:underline cursor-pointer font-medium"
          onClick={() => (window.location.href = `/tag/${tag.substring(1)}`)}
        >
          {tag}
        </span>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  };

  const isOwner = currentUserId && (post.user?.username === currentUserId || post.user?.full_name === currentUserId || post.userId === currentUserId || post.user?.clerkId === currentUserId);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const resolve = (u) => (u && u.startsWith('/uploads') ? `${API_BASE}${u}` : u);

  return (
    <article className="bg-white rounded-2xl shadow p-4 border border-slate-100">
  {/* Author */}
      <header className="flex items-center gap-3 mb-3">
        <img
          src={post.user?.profile_picture || "/default-avatar.png"}
          alt={post.user?.full_name || "User"}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-slate-900">{post.user?.full_name}</h2>
            <span className="text-xs text-slate-400">• @{post.user?.username}</span>
            {post.createdAt && (
              <span className="text-xs text-slate-400">• {moment(post.createdAt).fromNow()}</span>
            )}
          </div>
        </div>
      </header>

  {/* Text content */}
      {post.content && (
        <p className="mb-3 text-slate-800 whitespace-pre-line">
          {renderContent(post.content)}
        </p>
      )}

  {/* Video attachment */}
  {post.video_url && (
        <div className="mb-3">
          <video
    src={resolve(post.video_url)}
            controls
            className="w-full rounded-lg max-h-96 bg-black"
            preload="metadata"
          >
            Sorry, your browser doesn't support embedded videos.
          </video>
        </div>
      )}

  {/* Image gallery */}
  {post.image_urls?.length > 0 && (
        <div className="grid gap-2">
          {post.image_urls.map((img, i) => (
            <img
              key={i}
      src={resolve(img)}
              alt="Post media"
              className="rounded-lg max-h-96 object-cover w-full"
            />
          ))}
        </div>
      )}

  {/* Post actions */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-5 text-slate-600">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 transition ${
              liked ? "text-red-500" : ""
            }`}
            aria-label="Like"
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-red-500" : ""}`} />
            <span className="text-sm">{likeCount}</span>
          </button>

          <button
            onClick={() => setCommentsOpen((p) => !p)}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 transition"
            aria-label="Comments"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{commentCount}</span>
          </button>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-sm">Share</span>
        </button>
      </div>

  {/* Owner manage */}
      <PostManageMenu post={post} isOwner={isOwner} onUpdated={(u)=>onPostUpdated && onPostUpdated(u)} onDeleted={(id)=>onPostDeleted && onPostDeleted(id)} />

  {/* Comments thread */}
      {commentsOpen && (
        <div className="mt-3 border-t pt-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-slate-500">No comments yet.</p>
          )}
          {comments.map((c) => {
            const canDelete = isOwner || c.userId === currentUserId || (c.user?.username === currentUserId) || (c.user?.full_name === currentUserId);
            return (
              <div key={c.id} className="flex items-start gap-2 group">
                <img
                  src={c.user?.profile_picture || "/default-avatar.png"}
                  alt={c.user?.full_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="bg-slate-50 rounded-lg px-3 py-2 flex-1 relative">
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1 flex-wrap">
                    <span>{c.user?.full_name}</span> <span>@{c.user?.username}</span>{c.createdAt && <span className="text-[10px] text-slate-400">• {moment(c.createdAt).fromNow()}</span>}
                  </p>
                  <p className="text-sm text-slate-800">{c.content}</p>
                  {canDelete && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this comment?')) return;
                        // optimistic removal
                        const prev = comments;
                        setComments(cs => cs.filter(x => x.id !== c.id));
                        try {
                          const token = await getToken();
                          // backend expects _id format; try c.id
                          await postsApi.deleteComment(post.id, c.id, token);
                        } catch (e) {
                          toast.error('Failed to delete');
                          setComments(prev);
                        }
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/80 hover:bg-white text-rose-600 rounded p-1"
                      title="Delete comment"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 text-sm p-2 border rounded-lg focus:outline-none focus:ring focus:ring-indigo-300"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleAddComment(e);
              }}
            />
            <button
              type="submit"
              className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
              title="Send"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
};

export default PostCard;