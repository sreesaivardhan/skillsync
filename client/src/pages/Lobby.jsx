// Page component for the real-time lobby where users browse and match with others

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import { useUser } from '../context/UserContext';
import Navbar from '../components/Navbar';
import UserCard from '../components/UserCard';
import MatchNotification from '../components/MatchNotification';
// Import SkillBadge purely to satisfy the requirement if it's meant to be top-level, 
// though it's typically used inside UserCard/MatchNotification.
import SkillBadge from '../components/SkillBadge';

const Lobby = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [timeoutMsg, setTimeoutMsg] = useState(null);

  useEffect(() => {
    if (!user) return;

    const handleLobbyUpdate = (users) => {
      // Filter out current user from the lobby list
      setOnlineUsers(users.filter(u => String(u.userId) !== String(user.id)));
    };

    const handleMatchFound = (data) => {
      setMatchData(data);
      setIsSearching(false);
    };

    const handleMatchTimeout = () => {
      setIsSearching(false);
      setTimeoutMsg("No match found. Try again.");
    };

    const handleMatchSearching = () => {
      setIsSearching(true);
      setTimeoutMsg(null);
    };

    socket.on('lobby:update', handleLobbyUpdate);
    socket.on('match:found', handleMatchFound);
    socket.on('match:timeout', handleMatchTimeout);
    socket.on('match:searching', handleMatchSearching);

    return () => {
      socket.off('lobby:update', handleLobbyUpdate);
      socket.off('match:found', handleMatchFound);
      socket.off('match:timeout', handleMatchTimeout);
      socket.off('match:searching', handleMatchSearching);
    };
  }, [user]);

  const handleFindMatch = () => {
    socket.emit('match:request', { userId: user.id });
  };

  const handleAcceptMatch = () => {
    if (!matchData) return;
    const { roomId } = matchData;
    socket.emit('match:accept', { roomId, userId: user.id });
    socket.emit('room:join', { roomId, userId: user.id });
    navigate(`/session/${roomId}`);
  };

  const handleDeclineMatch = () => {
    if (!matchData) return;
    const { roomId } = matchData;
    socket.emit('match:declined', { roomId, userId: user.id });
    setMatchData(null);
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.mainContainer}>
        {/* Left Panel */}
        <div style={styles.leftPanel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.heading}>Online Now</h2>
            <span style={styles.badge}>{onlineUsers.length}</span>
          </div>
          <div style={styles.userList}>
            {onlineUsers.length > 0 ? (
              onlineUsers.map(u => (
                <UserCard key={u.userId} user={u} />
              ))
            ) : (
              <p style={styles.emptyText}>No other users are currently online.</p>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          <div style={styles.matchCard}>
            <h2 style={styles.matchHeading}>Ready to learn?</h2>
            <p style={styles.matchSub}>We will pair you with someone whose skills match your interests.</p>
            
            <button 
              onClick={handleFindMatch} 
              disabled={isSearching}
              style={{
                ...styles.findBtn,
                opacity: isSearching ? 0.7 : 1,
                cursor: isSearching ? 'not-allowed' : 'pointer'
              }}
            >
              {isSearching ? (
                <span style={styles.flexCenter}>
                  <span style={styles.spinner}></span> Searching for a match...
                </span>
              ) : 'Find Match'}
            </button>
            
            {timeoutMsg && <p style={styles.timeoutMsg}>{timeoutMsg}</p>}
          </div>
        </div>
      </div>

      {/* Match Notification Modal */}
      {matchData && (
        <MatchNotification 
          matchData={matchData} 
          onAccept={handleAcceptMatch} 
          onDecline={handleDeclineMatch} 
        />
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    paddingTop: '64px', // Space for Navbar
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: '#f0f0f0',
  },
  mainContainer: {
    display: 'flex',
    maxWidth: '1200px',
    margin: '0 auto',
    height: 'calc(100vh - 64px)',
    padding: '2rem',
    gap: '2rem',
    boxSizing: 'border-box',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  heading: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 600,
  },
  badge: {
    backgroundColor: '#01696f',
    color: '#fff',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  userList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  emptyText: {
    color: '#888',
    fontSize: '0.9rem',
    textAlign: 'center',
    marginTop: '2rem',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
    padding: '3rem 2rem',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  matchHeading: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.6rem',
    color: '#f0f0f0',
  },
  matchSub: {
    margin: '0 0 2rem 0',
    color: '#888',
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
  findBtn: {
    backgroundColor: '#01696f',
    color: '#fff',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: 600,
    width: '100%',
    transition: 'background-color 0.2s',
  },
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  timeoutMsg: {
    color: '#f87171',
    fontSize: '0.9rem',
    marginTop: '1.5rem',
  }
};

// Add keyframes for spinner dynamically to avoid needing a separate CSS file
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default Lobby;
