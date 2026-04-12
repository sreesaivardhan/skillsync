// Root React component — sets up routing between all pages of SkillSync

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import Session from './pages/Session';
import Profile from './pages/Profile';

// ── Protected Route ───────────────────────────────────────────────────────────
// Redirects unauthenticated users to /login
const ProtectedRoute = ({ children }) => {
  const { user } = useUser();
  return user ? children : <Navigate to="/login" replace />;
};

// ── Root redirect ─────────────────────────────────────────────────────────────
// / → /lobby if logged in, else /login
const RootRedirect = () => {
  const { user } = useUser();
  return <Navigate to={user ? '/lobby' : '/login'} replace />;
};

// ── App ───────────────────────────────────────────────────────────────────────
const AppRoutes = () => (
  <Routes>
    {/* Root redirect */}
    <Route path="/" element={<RootRedirect />} />

    {/* Public routes */}
    <Route path="/login"    element={<Login />} />
    <Route path="/register" element={<Register />} />

    {/* Protected routes */}
    <Route
      path="/lobby"
      element={
        <ProtectedRoute>
          <Lobby />
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/session/:roomId"
      element={
        <ProtectedRoute>
          <Session />
        </ProtectedRoute>
      }
    />

    {/* Fallback — redirect unknown paths */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  </BrowserRouter>
);

export default App;
