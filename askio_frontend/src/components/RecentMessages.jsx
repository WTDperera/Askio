import React from "react"; // RecentMessages: inbox preview list
import { Link } from "react-router-dom";
import moment from "moment";
import { messagesApi } from '../lib/api';
import { useAuth } from '@clerk/clerk-react';

const RecentMessages = () => {
  const [messages, setMessages] = React.useState([]);
  const { getToken } = useAuth();

  React.useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const res = await messagesApi.conversations(token);
        setMessages(res.items || []);
      } catch (e) { /* ignore */ }
    };
    load();
  }, []);

  const getPeer = (m) => m.peer || { clerkId: 'unknown', full_name: 'Unknown', username: 'unknown', profile_picture: '/default-avatar.png' };

  return (
    <div className="bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md shadow text-xs text-slate-800">
      <h3 className="font-semibold text-slate-800 mb-4">Recent Messages</h3>
      <div className="flex flex-col max-h-56 overflow-y-auto no-scrollbar">
        {messages.length === 0 && (
          <p className="text-slate-500 text-xs">No messages yet.</p>
        )}

        {messages.map((message) => {
          const peer = getPeer(message);
          return (
            <Link
              to={`/messages/${peer?.clerkId}`}
              key={message.id || message._id}
              className="flex items-start gap-2 py-2 px-2 rounded hover:bg-slate-100"
            >
              <img
                src={peer?.profile_picture || '/default-avatar.png'}
                className="w-10 h-10 rounded-full object-cover"
                alt={peer?.full_name || peer?.username}
              />
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900 truncate pr-2">
                    {peer?.full_name || peer?.username}
                  </p>
                  <p className="text-[11px] text-slate-500 whitespace-nowrap">
                    {moment(message.createdAt || message.created_at).fromNow()}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-gray-500 truncate">
                    {message.text ? message.text : (message.media_url ? 'Media' : '')}
                  </p>
                  {!message.seen && (
                    <span className="bg-indigo-500 text-white px-1.5 h-4 min-w-4 flex items-center justify-center rounded-full text-[10px]">
                      1
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default RecentMessages;