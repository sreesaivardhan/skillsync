// Top navigation bar component with links and the authenticated user's info

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import CreditBar from './CreditBar';
import { Zap, UserCircle, LogOut, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav style={styles.nav} className="navbar-container">
      <div style={styles.left}>
        <Zap size={22} color="var(--accent)" strokeWidth={2.5} />
        <span style={styles.logoText}>SkillSync</span>
      </div>

      <div style={styles.mobileHamburger} className="mobile-only" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        ☰
      </div>

      <div style={styles.center} className={`navbar-links ${mobileMenuOpen ? 'menu-open' : ''}`}>
        <span style={styles.welcome}>Welcome, </span>
        <span style={styles.username}>{user.username}</span>
      </div>

      <div style={styles.right} className={`navbar-stats ${mobileMenuOpen ? 'menu-open' : ''}`}>
        <CreditBar />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle dark/light mode"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={() => navigate('/profile')}
          style={styles.profileBtn}
        >
          <UserCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Profile
        </button>
        <button
          onClick={handleLogout}
          style={styles.logoutBtn}
          className="logout-btn"
        >
          <LogOut size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Logout
        </button>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '64px',
    backgroundColor: 'var(--navbar-bg)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '0',
    padding: '0 2rem',
    boxSizing: 'border-box',
    zIndex: 1000,
    transition: 'background-color 0.25s ease',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flex: 1,
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '-0.5px',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  welcome: {
    color: 'var(--accent)',
    fontSize: '0.95rem',
    marginRight: '0.3rem',
    opacity: 0.7,
  },
  username: {
    color: 'var(--navbar-text)',
    fontSize: '1rem',
    fontWeight: 600,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--navbar-text)',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
  },
  profileBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--accent)',
    color: 'var(--accent)',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
  },
  mobileHamburger: {
    display: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: 'var(--navbar-text)',
  }
};

export default Navbar;
