import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import LoggedInNavigation from './components/LoggedInNavigation';
import LoggedOutNavigation from './components/LoggedOutNavigation';
import Home from './pages/Home';
import HomeLoggedIn from './pages/HomeLoggedIn';
import MindMap from './pages/MindMap';
import MindMapList from './pages/MindMapList';
import Profile from './pages/Profile';
import SignUp from './pages/SignUp';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import PricingPage from './pages/Pro';
import MindMapDebug from './components/MindMapDebug';
import ForgotPassword from './pages/ForgotPassword';
import UserProfile from './pages/UserProfile';
import ViewMindMap from './pages/ViewMindMap';
import './styles/theme.css';
import { useAuthStore } from './store/authStore';

function App() {
  const { isLoggedIn, validateSession, forceLoggedOut } = useAuthStore();
  const [username, setUsername] = useState<string | null>(null);
  const [isValidatingSession, setIsValidatingSession] = useState(true);

  // Validate session on app startup
  useEffect(() => {
    const validateUserSession = async () => {
      setIsValidatingSession(true);
      try {
        // This will automatically log the user out if the session is invalid
        await validateSession();
      } catch (error) {
        console.error('Error validating session:', error);
      } finally {
        setIsValidatingSession(false);
      }
    };

    validateUserSession();
  }, [validateSession]);

  // Fetch username when logged in
  useEffect(() => {
    const fetchUsername = async () => {
      if (!isLoggedIn || isValidatingSession) return;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error fetching user:', userError);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching username:', error);
      } else {
        setUsername(data?.username || null);
      }
    };

    if (isLoggedIn) {
      fetchUsername();
    }
  }, [isLoggedIn, isValidatingSession]);

  // Determine effective logged in state (force logged out overrides isLoggedIn)
  const effectivelyLoggedIn = isLoggedIn && !forceLoggedOut;

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="flex flex-col min-h-screen bg-fixed bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {effectivelyLoggedIn && <LoggedInNavigation />}
        {!effectivelyLoggedIn &&
          !['/', '/login', '/signup'].includes(window.location.pathname) && (
            <LoggedOutNavigation />
          )} {/* Show only when not logged in and not on home, login, or signup */}
        <main className="flex-1 min-h-0 container mx-auto px-1 py-0">
          <Routes>
            <Route path="/" element={effectivelyLoggedIn ? <HomeLoggedIn /> : <Home />} />
            <Route path="/mindmap" element={<MindMapList />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/signup" element={effectivelyLoggedIn ? <Navigate to="/" /> : <SignUp />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/chat" element={effectivelyLoggedIn ? <Chat /> : <Navigate to="/login" />} />
            <Route path="/chat/:supabaseId" element={effectivelyLoggedIn ? <Chat /> : <Navigate to="/login" />} />
            <Route path="/pro" element={<PricingPage />} />
            <Route path="/debug" element={<MindMapDebug />} />
            <Route path="/login" element={effectivelyLoggedIn ? <Navigate to="/" /> : <Home />} />
            <Route path="/reset-password" element={<ForgotPassword />} />
            <Route path="/@:username" element={<UserProfile />} /> {/* Route for @username to redirect to main map */}
            <Route path="/:username" element={<UserProfile />} /> {/* Dynamic username route */}
            {username && <Route path={`/${username}`} element={<Profile />} />} {/* Route for fetched username */}
            <Route path="/:username/:id/edit" element={<MindMap />} /> {/* Updated route for editing mindmaps */}
            <Route path="/:username/:id" element={<ViewMindMap />} /> {/* Route for viewing mind maps */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;