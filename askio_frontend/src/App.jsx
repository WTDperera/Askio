// App: central route definitions & auth gating
import { Route, Routes, useLocation, useNavigate, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import MainLayout from "./layouts/MainLayout";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import Loading from "./components/Loading";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import Connections from "./pages/Connections";
import Discover from "./pages/Discover";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Chatbox from "./pages/Chatbox";
import CreatePost from "./pages/CreatePost";
import { Toaster } from "react-hot-toast";

// Protects private routes; waits for auth to resolve
const ProtectedRoute = ({ isLoaded, isSignedIn, children }) => {
  if (!isLoaded) return <Loading />;          // still determining auth state
  if (!isSignedIn) return <Navigate to="/" replace />; // redirect unauthenticated users
  return children;
};

// Public (login) route; forwards authenticated users to feed
const PublicRoute = ({ isLoaded, isSignedIn, children }) => {
  if (!isLoaded) return <Loading />;          // consistent splash while loading
  if (isSignedIn) return <Navigate to="/feed" replace />; // already signed in
  return children;
};

const App = () => {
  const { isLoaded, isSignedIn } = useAuth(); // Clerk auth snapshot
  const [ready, setReady] = useState(false);  // defers render to avoid flicker
  const navigate = useNavigate();             // kept if future redirects needed
  const location = useLocation();             // can be used for analytics / scroll restoration

  useEffect(() => { if (isLoaded) setReady(true); }, [isLoaded]); // once Clerk resolves, show app

  if (!ready) return <Loading />; // unified initial loading UX

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />
      <Routes>
        {/* Public auth-less entry */}
        <Route
          path="/"
          element={
            <PublicRoute isLoaded={isLoaded} isSignedIn={isSignedIn}>
              <Login />
            </PublicRoute>
          }
        />

  {/* Private shell (nested) */}
        <Route
          path="/"
          element={
            <ProtectedRoute isLoaded={isLoaded} isSignedIn={isSignedIn}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="feed" element={<Feed />} />
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:userId" element={<Chatbox />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:userId" element={<Profile />} />
          <Route path="create-post" element={<CreatePost />} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">404</h1>
              <p className="text-slate-500">The page you’re looking for doesn’t exist.</p>
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
};

export default App;