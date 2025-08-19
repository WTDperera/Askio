import React, { useEffect, useState } from "react";
import { BadgeCheck, X } from "lucide-react";
import StoryManageMenu from './StoryManageMenu';

const StoryViewer = ({ viewStory, setViewStory, currentUserId }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!viewStory) return;

    if (viewStory.media_type === "video") {
      setProgress(0);
      return;
    }

    setProgress(0);
    let interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setViewStory(null);
          return 100;
        }
        return prev + 1;
      });
    }, 50); // 5 seconds
    return () => clearInterval(interval);
  }, [viewStory, setViewStory]);

  if (!viewStory) return null;

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const resolve = (u) => (u && u.startsWith('/uploads') ? `${API_BASE}${u}` : u);

  return (
    <div
      className="fixed inset-0 h-screen bg-black bg-opacity-90 z-50 flex items-center justify-center"
      style={{
        backgroundColor:
          viewStory.media_type === "text"
            ? viewStory.background_color
            : "#000000",
      }}
    >
  {/* Progress */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-700">
        <div
          className="h-full bg-white transition-all duration-100 linear"
          style={{ width: `${progress}%` }}
        />
      </div>

  {/* Close button (always visible; shift left when owner to avoid overlap with action menu) */}
      <button
        onClick={() => setViewStory(null)}
        className={`absolute top-4 ${!!currentUserId && viewStory.userId === currentUserId ? 'right-14' : 'right-4'} text-white hover:text-gray-300 transition`}
        aria-label="Close story"
      >
        <X size={28} />
      </button>

  {/* User */}
      <div className="absolute top-4 left-4 flex items-center space-x-3 p-2 px-4 sm:p-4 sm:px-8 backdrop-blur-2xl rounded bg-black/50">
        <img
          src={viewStory.user?.profile_picture}
          alt="User"
          className="w-7 sm:w-8 h-7 sm:h-8 rounded-full object-cover border border-white"
        />
        <div className="flex items-center gap-1 text-white">
          <span>{viewStory.user?.full_name}</span>
          <BadgeCheck size={18} />
        </div>
      </div>
      <StoryManageMenu
        story={viewStory}
        isOwner={!!currentUserId && viewStory.userId === currentUserId}
        onUpdated={(u)=>setViewStory(prev=>prev && prev._id===u._id ? { ...prev, ...u } : prev)}
        onDeleted={()=>setViewStory(null)}
      />

  {/* Body */}
      {viewStory.media_type === "image" && (
        <img
          src={resolve(viewStory.media_url)}
          alt="Story"
          className="max-h-full max-w-full object-contain"
        />
      )}
      {viewStory.media_type === "video" && (
        <video
          src={resolve(viewStory.media_url)}
          autoPlay
          className="max-h-full max-w-full object-contain"
          onEnded={() => setViewStory(null)}
        />
      )}
      {viewStory.media_type === "text" && (
        <p className="text-white text-lg p-8 text-center max-w-2xl">
          {viewStory.content}
        </p>
      )}
    </div>
  );
};

export default StoryViewer;