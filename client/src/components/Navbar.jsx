// Top navigation bar component with links and the authenticated user's info

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import CreditBar from './CreditBar';

const Navbar = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav style={styles.nav} className="navbar-container">
      <div style={styles.left}>
        <span style={styles.logoIcon}>⚡</span>
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
        <button
          onClick={() => navigate('/profile')}
          style={styles.profileBtn}
        >
          Profile
        </button>
        <button
          onClick={handleLogout}
          style={styles.logoutBtn}
          className="logout-btn"
        >
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
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '0',
    padding: '0 2rem',
    boxSizing: 'border-box',
    zIndex: 1000,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flex: 1,
  },
  logoIcon: {
    fontSize: '1.4rem',
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#01696f', /* Teal accent */
    letterSpacing: '-0.5px',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  welcome: {
    color: '#888',
    fontSize: '0.95rem',
    marginRight: '0.3rem',
  },
  username: {
    color: '#f0f0f0',
    fontSize: '1rem',
    fontWeight: 600,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '20px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #333',
    color: '#ccc',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  profileBtn: {
    backgroundColor: '#01696f',
    border: 'none',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  mobileHamburger: {
    display: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#f0f0f0'
  }
};

export default Navbar;
