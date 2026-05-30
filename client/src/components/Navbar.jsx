// Top navigation bar component with links and the authenticated user's info

import { useState, useEffect, useRef } from 'react';
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
  const menuRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  if (!user) return null;

  return (
    <>
      {/* ── Fixed navbar bar — always exactly 64px tall ── */}
      <nav style={styles.nav} className="navbar-container">
        <div style={styles.left}>
          <Zap size={22} color="var(--accent)" strokeWidth={2.5} />
          <span style={styles.logoText}>SkillSync</span>
        </div>

        {/* Center — hidden on mobile, visible on desktop */}
        <div style={styles.center} className="navbar-links">
          <span style={styles.welcome}>Welcome, </span>
          <span style={styles.username}>{user.username}</span>
        </div>

        {/* Right — hidden on mobile, visible on desktop */}
        <div style={styles.right} className="navbar-stats">
          <CreditBar />
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark/light mode"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => navigate('/profile')} style={styles.profileBtn}>
            <UserCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Profile
          </button>
          <button onClick={handleLogout} style={styles.logoutBtn} className="logout-btn">
            <LogOut size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Logout
          </button>
        </div>

        {/* Hamburger — mobile only */}
        <div
          style={styles.mobileHamburger}
          className="mobile-only"
          onClick={() => setMobileMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          ☰
        </div>
      </nav>

      {/* ── Mobile drawer — renders BELOW the navbar, never inside it ── */}
      {mobileMenuOpen && (
        <div style={styles.mobileDrawer} ref={menuRef}>
          {/* User greeting */}
          <div style={styles.drawerGreeting}>
            <span style={styles.welcome}>Welcome,&nbsp;</span>
            <span style={styles.username}>{user.username}</span>
          </div>

          <div style={styles.drawerDivider} />

          {/* Credits */}
          <div style={styles.drawerRow}>
            <CreditBar />
          </div>

          <div style={styles.drawerDivider} />

          {/* Theme toggle */}
          <button
            onClick={() => { toggleTheme(); }}
            className="theme-toggle-btn"
            style={styles.drawerBtn}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={16} style={{ marginRight: '8px' }} /> : <Moon size={16} style={{ marginRight: '8px' }} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* Profile */}
          <button onClick={() => handleNavigate('/profile')} style={{ ...styles.drawerBtn, ...styles.profileBtn }}>
            <UserCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Profile
          </button>

          {/* Logout */}
          <button onClick={handleLogout} style={{ ...styles.drawerBtn, ...styles.logoutBtn }}>
            <LogOut size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Logout
          </button>
        </div>
      )}
    </>
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
    // Never wrap — keeps navbar at exactly 64px on all screen sizes
    flexWrap: 'nowrap',
    overflow: 'visible',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flex: 1,
    flexShrink: 0,
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '-0.5px',
    whiteSpace: 'nowrap',
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
    display: 'none',       // shown via .mobile-only CSS rule
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: 'var(--navbar-text)',
    marginLeft: 'auto',
    flexShrink: 0,
    padding: '0 4px',
  },
  // ── Mobile drawer ──────────────────────────────────────────────────────────
  mobileDrawer: {
    position: 'fixed',
    top: '64px',           // sits flush below the navbar
    left: 0,
    width: '100%',
    backgroundColor: 'var(--navbar-bg)',
    borderBottom: '1px solid var(--border)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    zIndex: 999,           // below navbar (1000) but above all page content
    display: 'flex',
    flexDirection: 'column',
    padding: '0.75rem 1.25rem 1rem',
    gap: '0.5rem',
    boxSizing: 'border-box',
  },
  drawerGreeting: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0 0.25rem',
  },
  drawerDivider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '0.25rem 0',
  },
  drawerRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.25rem 0',
  },
  drawerBtn: {
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.92rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
};

export default Navbar;
