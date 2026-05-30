// Page component for user login — handles form input and auth request

import { useState } from 'react';
import { Eye, EyeOff, Zap, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const Login = () => {
  const { login } = useUser();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      console.log('Login payload:', { email: form.email, password: form.password });
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed. Try again.');
      login(data.user, data.token);
      navigate('/lobby');
    } catch (err) {
      setError(err.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card} className="auth-card">
        <div style={styles.logoWrap}>
          <Zap size={28} color="var(--accent)" strokeWidth={2.5} />
          <h1 style={styles.logo}>SkillSync</h1>
        </div>
        <p style={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">
              <Lock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Password
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                style={{ ...styles.input, paddingRight: '48px', width: '100%', boxSizing: 'border-box' }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {/* ── Google OAuth ─────────────────────────────────── */}
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <span style={styles.dividerLine} />
          </div>

          <button
            type="button"
            onClick={() =>
              (window.location.href = `${
                import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
              }/api/auth/google`)
            }
            style={styles.googleBtn}
          >
            <img
              src="https://www.google.com/favicon.ico"
              width="18"
              height="18"
              alt="Google"
            />
            Continue with Google
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Register</Link>
        </p>
      </div>
    </div>
  );
};

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
  card: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: 'var(--card-shadow)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  logo: {
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    margin: '0.25rem 0 1.75rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontSize: '0.95rem',
    padding: '0.65rem 0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '0',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.85rem',
    margin: 0,
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderRadius: '6px',
    border: '1px solid rgba(220,38,38,0.2)',
  },
  btn: {
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginTop: '0.25rem',
  },
  footer: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginTop: '1.5rem',
    marginBottom: 0,
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 600,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '0.25rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--border)',
  },
  dividerText: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    flexShrink: 0,
  },
  googleBtn: {
    width: '100%',
    padding: '0.72rem',
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontWeight: 500,
    fontSize: '0.95rem',
    transition: 'border-color 0.2s, background 0.2s',
  },
};

export default Login;
