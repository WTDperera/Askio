import React from "react"; // Sidebar: main left navigation with user identity & sign-out
import { NavLink, useNavigate } from "react-router-dom";
import { CirclePlus, LogOut, Home, Users, Compass, MessageSquare, Bell, User as UserIcon } from "lucide-react";
import { assets } from "../assets/assets"; // only need logo here
import { UserButton, useClerk, useUser } from "@clerk/clerk-react";
// Static nav config. Add new sections here (order preserved in render)
const menuItems = [
  { to: "/feed", label: "Feed", Icon: Home },
  { to: "/profile", label: "Profile", Icon: UserIcon },
  { to: "/connections", label: "Connections", Icon: Users },
  { to: "/discover", label: "Discover", Icon: Compass },
  { to: "/messages", label: "Messages", Icon: MessageSquare },
  { to: "/notifications", label: "Notifications", Icon: Bell },
];

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { signOut } = useClerk();            // Clerk sign-out method
  const { user, isLoaded } = useUser();      // Authenticated user (null until loaded)
  const navigate = useNavigate();            // Client-side navigation

  // Human‑friendly name resolution (prioritized fallbacks)
  const displayName = React.useMemo(() => {
    if (!isLoaded || !user) return "Loading...";
    return (
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      user.primaryEmailAddress?.emailAddress ||
      "User"
    );
  }, [isLoaded, user]);

  // Handle / slug derivation used for @username line
  const handle = React.useMemo(() => {
    if (!isLoaded || !user) return "";
    return (
      user.username ||
      user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      displayName.replace(/\s+/g, "_").toLowerCase()
    );
  }, [isLoaded, user, displayName]);

  return (
    <div
      className={`w-60 bg-white border-r border-gray-200 flex flex-col justify-between max-sm:absolute top-0 bottom-0 z-50 transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
      }`}
    >
  <div>
        <img
          onClick={() => navigate("/feed")}
          src={assets.logo}
          className="w-28 mx-auto my-4 cursor-pointer"
          alt="Logo"
        />
        <nav className="space-y-1 px-4">
          {menuItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => navigate("/create-post")}
          className="flex items-center justify-center gap-2 py-2.5 mt-6 mx-4 w-[calc(100%-2rem)] rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white cursor-pointer"
        >
          <CirclePlus className="w-5 h-5" />
          Post a Problem
        </button>
      </div>
  {/* User identity + sign out */}
  <div className="border-t border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserButton />
          <div>
            <h1 className="text-sm font-medium">{displayName}</h1>
            {handle && <p className="text-xs text-gray-500">@{handle}</p>}
          </div>
        </div>
        <LogOut
          onClick={() => signOut()}
          className="w-5 h-5 text-gray-400 hover:text-gray-700 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default Sidebar;
