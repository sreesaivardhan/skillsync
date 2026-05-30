// Reset Password page — validates token then allows user to set a new password
import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [message,     setMessage]     = useState('');
  const [error,       setError]       = useState('');
  const [tokenValid,  setTokenValid]  = useState(null); // null = loading
  const [loading,     setLoading]     = useState(false);

  const token = new URLSearchParams(window.location.search).get('token');
  const API   = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  // Validate token on mount
  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    fetch(`${API}/api/auth/reset-password?token=${token}`)
      .then((r) => r.json())
      .then((d) => setTokenValid(d.valid === true))
      .catch(() => setTokenValid(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Something went wrong.');
      } else {
        setMessage(data.message);
        setTimeout(() => (window.location.href = '/login'), 2500);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (tokenValid === null) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--text)' }}>Validating link…</p>
      </div>
    );
  }

  // ── Invalid / expired token ────────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <p style={{ color: '#f44336', marginBottom: '1rem' }}>
            This reset link is invalid or has expired.
          </p>
          <a href="/forgot-password" style={styles.link}>
            Request a new reset link →
          </a>
        </div>
      </div>
    );
  }

  // ── Valid token — show form ────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <Zap size={26} color="var(--accent)" strokeWidth={2.5} />
          <span style={styles.logo}>SkillSync</span>
        </div>

        <h2 style={styles.title}>Set New Password</h2>
        <p style={styles.sub}>Choose a strong password — at least 6 characters.</p>

        {message && <p style={styles.success}>{message}</p>}
        {error   && <p style={styles.errorMsg}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={styles.input}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    transition: 'background-color 0.25s ease',
  },
  center: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: 'var(--card-shadow)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  logo: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.5px',
  },
  title: {
    margin: '0 0 0.35rem',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  sub: {
    margin: '0 0 1.5rem',
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
  },
  success: {
    color: '#4caf50',
    backgroundColor: 'rgba(76,175,80,0.08)',
    border: '1px solid rgba(76,175,80,0.25)',
    borderRadius: '6px',
    padding: '0.6rem 0.85rem',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  errorMsg: {
    color: '#f44336',
    backgroundColor: 'rgba(244,67,54,0.07)',
    border: '1px solid rgba(244,67,54,0.2)',
    borderRadius: '6px',
    padding: '0.6rem 0.85rem',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  input: {
    width: '100%',
    padding: '0.7rem 0.9rem',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  btn: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 600,
  },
};
