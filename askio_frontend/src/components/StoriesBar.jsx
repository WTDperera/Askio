import React, { useEffect } from "react"; // StoriesBar horizontal list
import { useAuth } from '@clerk/clerk-react';
import { storiesApi } from "../lib/api";
import { Plus } from "lucide-react";
import moment from "moment";
import StoryModal from "./StoryModal";
import StoryViewer from "./StoryViewer";
import StoryManageMenu from './StoryManageMenu';

const StoriesBar = () => {
  const [stories, setStories] = React.useState([]);
  const { userId } = useAuth();
  const [showModal, setShowModal] = React.useState(false);
  const [viewStory, setViewStory] = React.useState(null);

  const fetchStories = async () => {
    try {
      const data = await storiesApi.list();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const resolve = (u) => (u && u.startsWith('/uploads') ? `${API_BASE}${u}` : u);
  setStories(data.map(s => ({ ...s, media_url: resolve(s.media_url) })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchStories(); }, []);

  return (
    <div className="w-screen sm:w-[calc(100vw-256px)] lg:max-w-2xl no-scrollbar overflow-x-auto px-4">
      <div className="flex gap-4 pb-5">
        {/* Add Story Card */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg shadow-sm min-w-[7.5rem] max-w-[7.5rem] h-40 cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-dashed border-indigo-300 bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center"
        >
          <div className="flex flex-col items-center justify-center p-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-700 text-center">
              Create story
            </p>
          </div>
        </button>

        {/* Story Card */}
        {stories.map((story) => {
          const currentUserId = userId;
          const isOwner = !!currentUserId && (story.userId === currentUserId);
          return (
            <div
              onClick={() => setViewStory(story)}
              key={story._id}
              className="relative rounded-lg shadow min-w-[7.5rem] max-w-[7.5rem] h-40 cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
              aria-label={`Open story by ${story.user?.full_name}`}
            >
              {/* Manage menu (edit/delete) */}
              <StoryManageMenu
                story={story}
                isOwner={isOwner}
                onUpdated={(updated)=>setStories(prev=>prev.map(s=>s._id===updated._id?{...s,...updated}:s))}
                onDeleted={(id)=>setStories(prev=>prev.filter(s=>s._id!==id))}
              />
              {/* Media */}
              {story.media_type !== "text" ? (
                story.media_type === "image" ? (
                  <img
                    src={story.media_url}
                    alt={story.content || "Story"}
                    className="h-full w-full object-cover scale-100 hover:scale-105 transition duration-500"
                  />
                ) : (
                  <video
                    src={story.media_url}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                  />
                )
              ) : (
                <div
                  className="w-full h-full"
                  style={{ background: story.background_color || "#4f46e5", opacity: 0.9 }}
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              {/* Avatar */}
              <img
                src={story.user.profile_picture}
                alt={story.user.full_name}
                className="absolute w-8 h-8 top-3 left-3 z-10 rounded-full ring ring-white/80 shadow"
              />

              {/* Text */}
              <p className="absolute bottom-6 left-3 right-3 text-white/90 text-sm line-clamp-2">
                {story.content}
              </p>
              <p className="text-white absolute bottom-1 right-2 z-10 text-[11px]">
                {moment(story.createdAt).fromNow()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Add Story Modal */}
      {showModal && (
  <StoryModal setShowmodal={setShowModal} fetchStories={fetchStories} />
      )}

      {/* Story Viewer Modal */}
      {viewStory && (
        <StoryViewer currentUserId={userId} viewStory={viewStory} setViewStory={setViewStory} />
      )}
    </div>
  );
};

export default StoriesBar;