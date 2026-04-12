// Page component for user login — handles form input and auth request

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Try again.');
      }
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
        {/* Logo / Title */}
        <div style={styles.logoWrap}>
          <span style={styles.logoIcon}>⚡</span>
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
            <label style={styles.label} htmlFor="password">Password</label>
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
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:'#666', cursor:'pointer',
                  display:'flex', alignItems:'center', padding:'0' }}>
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
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

// ── Inline styles ─────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '1rem',
  },
  card: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  logoIcon: {
    fontSize: '1.6rem',
  },
  logo: {
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#01696f',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#888',
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
    color: '#ccc',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  input: {
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#f0f0f0',
    fontSize: '0.95rem',
    padding: '0.65rem 0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#f87171',
    fontSize: '0.85rem',
    margin: 0,
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderRadius: '6px',
    border: '1px solid rgba(248,113,113,0.2)',
  },
  btn: {
    backgroundColor: '#01696f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    marginTop: '0.25rem',
  },
  footer: {
    color: '#666',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginTop: '1.5rem',
    marginBottom: 0,
  },
  link: {
    color: '#01696f',
    textDecoration: 'none',
    fontWeight: 600,
  },
};

export default Login;
