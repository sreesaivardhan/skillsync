// Page component for new user registration — handles form input and sign-up request

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

// ── Tag Input Component ───────────────────────────────────────────────────────
const TagInput = ({ label, tags, onAdd, onRemove, placeholder }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.trim();
      if (val && !tags.includes(val)) {
        onAdd(val);
      }
      setInput('');
    }
  };

  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.tagBox} className="tags-container">
        {tags.map((tag) => (
          <span
            key={tag}
            style={styles.pill}
            onClick={() => onRemove(tag)}
            title="Click to remove"
          >
            {tag} <span style={styles.pillX}>×</span>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={styles.tagInput}
        />
      </div>
      <span style={styles.hint}>Press Enter to add a skill</span>
    </div>
  );
};

// ── Register Page ─────────────────────────────────────────────────────────────
const Register = () => {
  const { login } = useUser();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [skillsOffered, setSkillsOffered] = useState([]);
  const [skillsWanted, setSkillsWanted] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const addOffered = (skill) => setSkillsOffered((prev) => [...prev, skill]);
  const removeOffered = (skill) =>
    setSkillsOffered((prev) => prev.filter((s) => s !== skill));

  const addWanted = (skill) => setSkillsWanted((prev) => [...prev, skill]);
  const removeWanted = (skill) =>
    setSkillsWanted((prev) => prev.filter((s) => s !== skill));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Build skillsOffered as array of { skill, level } objects (default Beginner)
    const payload = {
      ...form,
      skillsOffered: skillsOffered.map((skill) => ({ skill, level: 'Beginner' })),
      skillsWanted,
    };

    try {
      const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      const response = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed. Try again.');
      }
      console.log('Register API response.user:', data.user);
      login(data.user, data.token);
      navigate('/lobby');
    } catch (err) {
      setError(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card} className="auth-card">
        {/* Header */}
        <div style={styles.logoWrap}>
          <span style={styles.logoIcon}>⚡</span>
          <h1 style={styles.logo}>SkillSync</h1>
        </div>
        <p style={styles.subtitle}>Create your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Username */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={form.username}
              onChange={handleChange}
              style={styles.input}
              placeholder="skillmaster42"
            />
          </div>

          {/* Email */}
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

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
                value={form.password}
                onChange={handleChange}
                style={{ ...styles.input, paddingRight: '48px', width: '100%', boxSizing: 'border-box' }}
                placeholder="Min 6 characters"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:'#666', cursor:'pointer',
                  display:'flex', alignItems:'center', padding:'0' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Skills I can teach */}
          <TagInput
            label="Skills I can teach"
            tags={skillsOffered}
            onAdd={addOffered}
            onRemove={removeOffered}
            placeholder="e.g. Python, Guitar…"
          />

          {/* Skills I want to learn */}
          <TagInput
            label="Skills I want to learn"
            tags={skillsWanted}
            onAdd={addWanted}
            onRemove={removeWanted}
            placeholder="e.g. Spanish, Figma…"
          />

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '2rem 1rem',
  },
  card: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  logoIcon: { fontSize: '1.6rem' },
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
  },
  // Tag input box — wraps pills + text input
  tagBox: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '0.5rem 0.7rem',
    minHeight: '44px',
    alignItems: 'center',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    backgroundColor: '#01696f',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 500,
    padding: '0.25rem 0.6rem',
    borderRadius: '999px',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.15s',
  },
  pillX: {
    fontSize: '0.95rem',
    lineHeight: 1,
    opacity: 0.8,
  },
  tagInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f0f0f0',
    fontSize: '0.9rem',
    flex: 1,
    minWidth: '120px',
  },
  hint: {
    color: '#555',
    fontSize: '0.75rem',
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

export default Register;
