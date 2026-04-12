import { useState, useEffect } from 'react';

const MatchNotification = ({ matchData, onAccept, onDecline }) => {
  console.log('[UI] MatchNotification props:', JSON.stringify(matchData));
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    // When the timer reaches 0, auto-decline and exit
    if (timeLeft <= 0) {
      onDecline();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onDecline]);

  if (!matchData?.matchedUser) return null;

  const { username, skillsOffered = [], skillsWanted = [] } = matchData.matchedUser;

  return (
    <div style={styles.overlay}>
      <div style={styles.card} className="match-modal-container">
        <h2 style={styles.heading}>⚡ Match Found!</h2>

        <p style={styles.username}>{username}</p>
        <p style={styles.subtext}>is ready to learn with you.</p>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>They can teach you:</p>
          <div style={styles.skillsBox}>
            {skillsOffered.map((skillObj, i) => (
              <span key={i} style={{ ...styles.pill, backgroundColor: '#01696f' }}>
                {skillObj.skill}
              </span>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>They want to learn:</p>
          <div style={styles.skillsBox}>
            {skillsWanted.map((skillStr, i) => (
              <span key={i} style={{ ...styles.pill, backgroundColor: '#ea580c' }}>
                {skillStr}
              </span>
            ))}
          </div>
        </div>

        {matchData.matchExplanation && (
          <blockquote style={styles.explanationBlock}>
            <p style={styles.explanationText}>
              <strong>🤖 Why you matched:</strong> {matchData.matchExplanation}
            </p>
          </blockquote>
        )}

        <p style={styles.timer}>
          Accept in: <strong>{timeLeft}s</strong>
        </p>
        <div style={styles.actions} className="match-btn-group">
          <button onClick={onDecline} style={styles.declineBtn} title="Decline match">
            Decline
          </button>
          <button onClick={onAccept} style={styles.acceptBtn} title="Accept match">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '90%',
    maxWidth: '450px',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  },
  heading: {
    margin: '0 0 1rem',
    color: '#01696f',
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  username: {
    margin: 0,
    color: '#111',
    fontSize: '2.2rem',
    fontWeight: 700,
  },
  subtext: {
    margin: '0.25rem 0 2rem',
    color: '#666',
    fontSize: '1rem',
  },
  section: {
    marginBottom: '1.5rem',
    textAlign: 'left',
  },
  sectionTitle: {
    margin: '0 0 0.5rem',
    color: '#444',
    fontWeight: 600,
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  skillsBox: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  pill: {
    color: '#fff',
    padding: '0.4rem 0.8rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: 600,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  timer: {
    margin: '1.5rem 0',
    color: '#666',
    fontSize: '1rem',
  },
  explanationBlock: {
    backgroundColor: 'rgba(1, 105, 111, 0.1)',
    borderLeft: '3px solid #01696f',
    padding: '1rem',
    margin: '1.5rem 0 0 0',
    borderRadius: '4px 8px 8px 4px',
    textAlign: 'left',
    animation: 'fadein 0.5s ease-in forwards',
  },
  explanationText: {
    margin: 0,
    fontSize: '0.85rem',
    fontStyle: 'italic',
    color: '#333',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  declineBtn: {
    flex: 1,
    padding: '0.8rem',
    backgroundColor: 'transparent',
    border: '2px solid #222',
    color: '#222',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  acceptBtn: {
    flex: 1,
    padding: '0.8rem',
    backgroundColor: '#01696f',
    border: 'none',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(1, 105, 111, 0.3)',
    transition: 'transform 0.1s',
  },
};

// Injects the fadein animation keyframes globally
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
    @keyframes fadein {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default MatchNotification;
