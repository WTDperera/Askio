import { ArrowLeft, Sparkle, Text as TextIcon, Upload } from "lucide-react";
import React from "react";
import { toast } from "react-hot-toast";
import { storiesApi } from "../lib/api";
import { useAuth } from "@clerk/clerk-react";

const StoryModal = ({ setShowmodal, fetchStories }) => {
  const [mode, setMode] = React.useState("text");
  const [Background, setBackground] = React.useState("#4f46e5");
  const [text, setText] = React.useState("");
  const [media, setMedia] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);

  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setMedia(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMode("media");
    }
  };

  const { getToken } = useAuth();

  const handleCreateStory = () =>
    new Promise(async (resolve, reject) => {
      const isText = mode === "text";
      if (isText && !text.trim()) return reject(new Error("Please write something for your story."));
      if (!isText && !media) return reject(new Error("Please select an image or video."));

      try {
        const token = await getToken();
        if (isText) {
          await storiesApi.create({ media_type: 'text', content: text, background_color: Background }, token);
        } else {
          const fd = new FormData();
          fd.append('media_type', media.type.startsWith('image/') ? 'image' : 'video');
            fd.append('media', media);
            fd.append('content', '');
          await storiesApi.create(fd, token);
        }
        setShowmodal(false);
        setText("");
        setMedia(null);
        setPreviewUrl(null);
        fetchStories?.();
        resolve();
      } catch (e) {
        reject(e);
      }
    });

  const allBgColors = [
    { color: "#4f46e5", label: "Indigo" },
    { color: "#6d28d9", label: "Deep Purple" },
    { color: "#a21caf", label: "Fuchsia" },
    { color: "#f472b6", label: "Pink" },
    { color: "#f59e42", label: "Orange" },
    { color: "#e11d48", label: "Red" },
    { color: "#0ea5e9", label: "Blue" },
    { color: "#22c55e", label: "Green" },
    { color: "#fde68a", label: "Light Yellow" },
    { color: "#64748b", label: "Slate" },
  ];

  return (
    <div className="fixed inset-0 z-50 min-h-screen bg-black/80 backdrop-blur text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl p-0 bg-transparent">
        <div className="text-center mb-4 flex items-center justify-between">
          <button
            onClick={() => setShowmodal(false)}
            className="text-white p-2 cursor-pointer"
            aria-label="Close"
          >
            <ArrowLeft />
          </button>
          <h2 className="text-lg font-semibold">Create Story</h2>
          <span className="w-10" />
        </div>

        <div
          className="rounded-lg h-72 flex items-center justify-center relative mb-4 overflow-hidden"
          style={{ backgroundColor: Background, opacity: mode === "text" ? 0.9 : 1 }}
        >
          {mode === "text" && (
            <textarea
              className="bg-transparent text-white w-full h-full p-6 text-lg resize-none focus:outline-none"
              placeholder="what's on your mind?"
              onChange={(e) => setText(e.target.value)}
              value={text}
            />
          )}

          {mode === "media" && previewUrl && (media?.type.startsWith("image/") ? (
            <img
              src={previewUrl}
              alt="Media Preview"
              className="object-contain max-h-full max-w-full h-full"
            />
          ) : (
            <video
              src={previewUrl}
              controls
              className="object-contain max-h-full max-w-full h-full"
            />
          ))}
        </div>

  {/* Background palette */}
        <div className="flex flex-wrap gap-2 justify-center mt-2 mb-4">
          {allBgColors.map(({ color, label }) => (
            <button
              key={color}
              className={`rounded-full w-7 h-7 border-2 ${
                Background === color ? "border-white" : "border-transparent"
              } transition-all`}
              style={{ backgroundColor: color, opacity: 0.8, cursor: "pointer" }}
              title={label}
              onClick={() => setBackground(color)}
            />
          ))}
        </div>

  {/* Mode select */}
        <div className="flex gap-3 justify-center mt-2 mb-4">
          <button
            className={`w-full h-12 rounded-lg px-4 py-2 transition-colors duration-200 font-semibold focus:outline-none flex items-center justify-center gap-2 cursor-pointer
              ${
                mode === "text"
                  ? "bg-white/80 text-indigo-600 shadow-lg"
                  : "bg-indigo-500/80 text-white hover:bg-indigo-600/80"
              }`}
            onClick={() => setMode("text")}
          >
            <TextIcon size={18} />
            Text
          </button>
          <label
            className={`w-full h-12 rounded-lg px-4 py-2 transition-colors duration-200 font-semibold focus:outline-none flex items-center justify-center gap-2 cursor-pointer
              ${
                mode === "media"
                  ? "bg-white/80 text-indigo-600 shadow-lg"
                  : "bg-indigo-500/80 text-white hover:bg-indigo-600/80"
              }`}
          >
            <Upload size={18} />
            Media
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleMediaUpload}
            />
          </label>
        </div>

  {/* Submit */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() =>
              toast.promise(handleCreateStory(), {
                loading: "Creating story...",
                success: <p>Story created successfully!</p>,
                error: (e) => <p>{e.message}</p>,
              })
            }
            className="w-full h-14 bg-gradient-to-r from-indigo-500/80 via-purple-500/80 to-pink-500/80 hover:from-indigo-600/80 hover:via-purple-600/80 hover:to-pink-600/80 text-white font-semibold px-12 py-4 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-lg"
          >
            <Sparkle size={22} />
            <span className="mx-auto">Create Story</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryModal;