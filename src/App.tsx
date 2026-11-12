import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import { isConfigured, supabase } from './lib/supabase';
import Login from './pages/Login';
import Today from './pages/Today';
import Leaderboard from './pages/Leaderboard';
import Groups from './pages/Groups';
import Join from './pages/Join';
import Setup from './pages/Setup';

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/icon.svg" alt="" width={26} height={26} />
          <span>Daily Dose</span>
        </div>
        <div className="me">
          {profile && <span className="muted">@{profile.username}</span>}
          <button className="link" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
      <nav className="tabs">
        <NavLink to="/" end>
          <span>🎯</span>Today
        </NavLink>
        <NavLink to="/leaderboard">
          <span>🏆</span>Leaderboard
        </NavLink>
        <NavLink to="/groups">
          <span>👥</span>Groups
        </NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  if (!isConfigured) return <Setup />;
  const protect = (el: ReactNode) => (
    <RequireAuth>
      <Shell>{el}</Shell>
    </RequireAuth>
  );
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={protect(<Today />)} />
      <Route path="/leaderboard" element={protect(<Leaderboard />)} />
      <Route path="/groups" element={protect(<Groups />)} />
      <Route path="/join/:code" element={protect(<Join />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
