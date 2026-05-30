// Handles the redirect from Google OAuth — extracts token, stores user, navigates to lobby

import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      window.location.href = '/login';
      return;
    }

    localStorage.setItem('token', token);

    const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((user) => {
        // Normalise _id → id so UserContext is consistent
        const normalised = { ...user, id: user._id || user.id };
        localStorage.setItem('user', JSON.stringify(normalised));
        // Hard redirect — forces UserContext to re-read localStorage cleanly
        window.location.href = '/lobby';
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--bg)',
      }}
    >
      <p style={{ color: 'var(--text)', fontSize: '1.1rem' }}>Signing you in…</p>
    </div>
  );
}
