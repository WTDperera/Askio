import React, { useEffect, useState } from "react"; // Feed timeline
import { assets } from "../assets/assets"; // only static images
import { postsApi } from "../lib/api";
import { useAuth } from '@clerk/clerk-react';
import Loading from "../components/Loading";
import StoriesBar from "../components/StoriesBar";
import PostCard from "../components/PostCard";
import RecentMessages from "../components/RecentMessages";
import { useUser } from "@clerk/clerk-react";

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { userId: clerkId } = useAuth();

  const fetchPosts = async () => {
    try {
      const data = await postsApi.list();
      // Normalize to shape expected by PostCard
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const resolve = (u) => (u && u.startsWith('/uploads') ? `${API_BASE}${u}` : u);
      const items = data.items?.map(p => {
        const mapUser = (uId, uObj) => {
          const base = uObj || {};
            const pic = base.profile_picture || '/default-avatar.png';
            return {
              full_name: base.full_name || uId,
              username: base.username || uId,
              profile_picture: resolve(pic)
            };
        };
        return {
          id: p._id,
          userId: p.userId,
          content: p.content,
          image_urls: (p.image_urls || []).map(resolve),
          video_url: resolve(p.video_url),
          user: mapUser(p.userId, p.user),
          likes: p.likes || [],
          comments: (p.comments || []).map(c => ({
            id: c._id,
            content: c.content,
            createdAt: c.createdAt,
            userId: c.userId,
            user: mapUser(c.userId, c.user)
          })),
          createdAt: p.createdAt
        };
      }) || [];
      setPosts(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  if (loading) return <Loading />;

  // Removed 'Who to follow' suggestions section per request

  return (
    <>
      <StoriesBar />
      <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
        <div className="flex-[2] max-w-xl w-full space-y-4">
          {/* Post composer */}
          <div className="bg-white rounded-2xl shadow p-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <img
                src={user?.imageUrl || "/default-avatar.png"}
                alt={user?.fullName || "You"}
                className="w-10 h-10 rounded-full object-cover"
              />
              <input
                readOnly
                onClick={() => (window.location.href = "/create-post")}
                placeholder="Share something with the community..."
                className="flex-1 bg-slate-50 hover:bg-slate-100 transition rounded-full px-4 py-2 cursor-pointer text-sm"
              />
            </div>
          </div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={clerkId}
              onPostUpdated={(updated)=> setPosts(prev => prev.map(p => p.id === updated._id || p.id === updated.id ? { ...p, ...updated, id: updated._id || updated.id } : p))}
              onPostDeleted={(id)=> setPosts(prev => prev.filter(p => p.id !== id))}
            />
          ))}
        </div>

  {/* Right column */}
        <div className="hidden lg:block flex-1 max-w-xs space-y-4 sticky top-[72px] h-fit">
          {/* Trending hashtags (static placeholder) */}
          <div className="bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md shadow">
            <h3 className="font-semibold text-slate-800 mb-3">
              Trending Questions
            </h3>
            <ul className="text-sm space-y-2">
              <li>
                <a href="#" className="hover:underline">
                  #ReactJs
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  #Firebase
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  #MongoDB
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  #Docker
                </a>
              </li>
            </ul>
          </div>

          {/* (Removed Who to follow section) */}

          {/* Sponsored / Ad slot */}
          <div className="bg-white p-4 rounded-md shadow">
            <h3 className="font-semibold text-slate-800 mb-3">Sponsored</h3>
            <img
              src={assets.sponsored_img}
              className="w-full rounded-md object-cover"
              alt="Sponsored"
            />
            <p className="text-xs text-slate-500 mt-2">
              Level up your dev stack with the latest tools.
            </p>
          </div>

          <RecentMessages />
        </div>
      </div>
    </>
  );
};

export default Feed;