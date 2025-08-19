import React, { useCallback, useRef, useState } from "react";
import { X, Image as ImageIcon, Video, Hash, Smile, Globe } from "lucide-react";
import { toast } from "react-hot-toast";
import { postsApi } from "../lib/api";
import { useAuth } from "@clerk/clerk-react";

const CreatePost = () => {
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const dropRef = useRef(null);

  const maxChars = 500; // soft content limit

  const handleFiles = (files) => {
    const valid = Array.from(files).filter((f) =>
      /image\/|video\//.test(f.type)
    );
    if (valid.length === 0) {
      toast.error("Only images and videos are allowed.");
      return;
    }
    setMediaFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
  };

  const onFileInput = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const removeMedia = (idx) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (e.dataTransfer.files?.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    []
  );

  const { getToken } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error("Please write something or add media.");
      return;
    }
    try {
      const token = await getToken();
      let payload;
  if (mediaFiles.length === 1) {
        const fd = new FormData();
        fd.append('content', content);
        fd.append('media', mediaFiles[0]);
        payload = fd;
      } else if (mediaFiles.length > 1) {
  // Backend supports single file: send first only.
        const fd = new FormData();
        fd.append('content', content);
        fd.append('media', mediaFiles[0]);
        payload = fd;
      } else {
        payload = { content, image_urls: [], video_url: undefined };
      }
      const created = await toast.promise(
        postsApi.create(payload, token),
        { loading: "Creating post...", success: "Post created!", error: "Failed to create post." }
      );
      // Redirect to feed (could optimistically insert into feed instead)
      setTimeout(()=>{ window.location.href = '/feed'; }, 400);
    } catch (e) {
      // already handled by toast
    }
  };

  return (
    <div className="flex justify-center relative">
      <div className="flex-1 max-w-xl space-y-4 rounded-2xl bg-gradient-to-b from-indigo-50 to-white shadow overflow-hidden border border-indigo-100">
        {/* Header */}
        <div className="px-5 py-4 bg-white/70 backdrop-blur border-b">
          <h2 className="text-xl font-semibold">Create a Post</h2>
          <p className="text-sm text-slate-500">Share updates, questions, or ideas.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="px-5 pt-4">
            <textarea
              className="w-full p-4 bg-white rounded-xl border focus:outline-none focus:ring focus:ring-indigo-300 resize-none"
              rows="5"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, maxChars))}
            />
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2 text-slate-500">
                <Globe size={16} /> <span className="text-xs">Public</span>
              </div>
              <span className="text-xs text-slate-500">
                {content.length}/{maxChars}
              </span>
            </div>
          </div>

          {/* Drag & Drop */}
          <div
            ref={dropRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="mx-5 mt-4 rounded-xl border-2 border-dashed border-indigo-200 bg-white p-4 text-center text-slate-500"
          >
            Drag & drop images/videos here or use the buttons below.
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="px-5 mt-4 grid grid-cols-2 gap-3">
              {previews.map((url, i) => {
                const isVideo = mediaFiles[i]?.type?.startsWith("video/");
                return (
                  <div key={i} className="relative group rounded-lg overflow-hidden border">
                    {isVideo ? (
                      <video src={url} controls className="w-full h-40 object-cover" />
                    ) : (
                      <img src={url} alt="preview" className="w-full h-40 object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition"
                      aria-label="Remove media"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="px-5 py-4 mt-3 bg-white/70 backdrop-blur flex items-center justify-between gap-3 border-t">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-indigo-600 cursor-pointer hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full">
                <ImageIcon size={18} />
                <span className="text-sm">Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileInput}
                  className="hidden"
                  multiple
                />
              </label>
              <label className="flex items-center gap-2 text-indigo-600 cursor-pointer hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full">
                <Video size={18} />
                <span className="text-sm">Video</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={onFileInput}
                  className="hidden"
                  multiple
                />
              </label>
              <button
                type="button"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full"
                onClick={() => setContent((c) => (c.endsWith(" ") ? c + "# " : c + " #"))}
              >
                <Hash size={18} />
                <span className="text-sm">Tag</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full"
                onClick={() => setContent((c) => c + " 🙂")}
              >
                <Smile size={18} />
                <span className="text-sm">Emoji</span>
              </button>
            </div>

            <button
              type="submit"
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 shadow"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;