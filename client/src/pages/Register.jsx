// Page component for new user registration — handles form input and sign-up request

import { useState } from 'react';
import { Eye, EyeOff, Zap, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

// ── Tag Input Component ───────────────────────────────────────────────────────
const TagInput = ({ label, tags, onAdd, onRemove, placeholder }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.trim();
      if (val && !tags.includes(val)) onAdd(val);
      setInput('');
    }
  };

  const handleAddClick = (e) => {
    e.preventDefault();
    const val = input.trim();
    if (val && !tags.includes(val)) onAdd(val);
    setInput('');
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
        <div className="skill-input-row" style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{ ...styles.tagInput, flex: 1 }}
          />
          <button
            type="button"
            onClick={handleAddClick}
            style={styles.addTagBtn}
          >
            Add
          </button>
        </div>
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

  const addOffered    = (skill) => setSkillsOffered((p) => [...p, skill]);
  const removeOffered = (skill) => setSkillsOffered((p) => p.filter((s) => s !== skill));
  const addWanted     = (skill) => setSkillsWanted((p) => [...p, skill]);
  const removeWanted  = (skill) => setSkillsWanted((p) => p.filter((s) => s !== skill));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      ...form,
      skillsOffered: skillsOffered.map((skill) => ({ skill, level: 'Beginner' })),
      skillsWanted,
    };
    try {
      const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      const response = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed. Try again.');
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
        <div style={styles.logoWrap}>
          <Zap size={28} color="var(--accent)" strokeWidth={2.5} />
          <h1 style={styles.logo}>SkillSync</h1>
        </div>
        <p style={styles.subtitle}>Create your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="username">Username</label>
            <input
              id="username" name="username" type="text" required
              value={form.username} onChange={handleChange}
              style={styles.input} placeholder="skillmaster42"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={form.email} onChange={handleChange}
              style={styles.input} placeholder="you@example.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">
              <Lock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Password
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" required minLength={6}
                value={form.password} onChange={handleChange}
                style={{ ...styles.input, paddingRight: '48px', width: '100%', boxSizing: 'border-box' }}
                placeholder="Min 6 characters"
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

          <TagInput label="Skills I can teach" tags={skillsOffered}
            onAdd={addOffered} onRemove={removeOffered} placeholder="e.g. Python, Guitar…" />
          <TagInput label="Skills I want to learn" tags={skillsWanted}
            onAdd={addWanted}  onRemove={removeWanted}  placeholder="e.g. Spanish, Figma…" />

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit" disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    transition: 'background-color 0.25s ease',
  },
  card: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '460px',
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
  tagBox: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '0.5rem 0.7rem',
    minHeight: '44px',
    alignItems: 'center',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    backgroundColor: 'var(--tag-offered-bg)',
    color: 'var(--tag-offered-text)',
    fontSize: '0.8rem',
    fontWeight: 500,
    padding: '0.25rem 0.6rem',
    borderRadius: '999px',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'opacity 0.15s',
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
    color: 'var(--text)',
    fontSize: '0.9rem',
    flex: 1,
    minWidth: '120px',
  },
  addTagBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
    flexShrink: 0,
  },
  hint: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    opacity: 0.7,
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
};

export default Register;
