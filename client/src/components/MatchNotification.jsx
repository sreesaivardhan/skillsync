import { useState, useEffect } from 'react';
import { Zap, CheckCircle, X } from 'lucide-react';

const MatchNotification = ({ matchData, onAccept, onDecline }) => {
  console.log('[UI] MatchNotification props:', JSON.stringify(matchData));
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
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
        <div style={styles.iconRow}>
          <Zap size={28} color="var(--text)" strokeWidth={2.5} />
        </div>
        <h2 style={styles.heading}>Match Found!</h2>

        <p style={styles.username}>{username}</p>
        <p style={styles.subtext}>is ready to learn with you.</p>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>They can teach you:</p>
          <div style={styles.skillsBox}>
            {skillsOffered.map((skillObj, i) => (
              <span key={i} style={styles.pillOffered}>
                {skillObj.skill}
              </span>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>They want to learn:</p>
          <div style={styles.skillsBox}>
            {skillsWanted.map((skillStr, i) => (
              <span key={i} style={styles.pillWanted}>
                {skillStr}
              </span>
            ))}
          </div>
        </div>

        {matchData.matchExplanation && (
          <blockquote style={styles.explanationBlock}>
            <p style={styles.explanationText}>
              <strong>Why you matched:</strong> {matchData.matchExplanation}
            </p>
          </blockquote>
        )}

        <p style={styles.timer}>
          Accept in: <strong>{timeLeft}s</strong>
        </p>
        <div style={styles.actions} className="match-btn-group">
          <button onClick={onDecline} style={styles.declineBtn} title="Decline match">
            <X size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Decline
          </button>
          <button onClick={onAccept} style={styles.acceptBtn} title="Accept match">
            <CheckCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
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
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'var(--overlay-bg)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'var(--surface)',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '90%',
    maxWidth: '450px',
    textAlign: 'center',
    boxShadow: 'var(--card-shadow)',
    border: '1px solid var(--border)',
  },
  iconRow: {
    marginBottom: '0.5rem',
    display: 'flex',
    justifyContent: 'center',
  },
  heading: {
    margin: '0 0 1rem',
    color: 'var(--text)',
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  username: {
    margin: 0,
    color: 'var(--text)',
    fontSize: '2.2rem',
    fontWeight: 700,
  },
  subtext: {
    margin: '0.25rem 0 2rem',
    color: 'var(--text-muted)',
    fontSize: '1rem',
  },
  section: {
    marginBottom: '1.5rem',
    textAlign: 'left',
  },
  sectionTitle: {
    margin: '0 0 0.5rem',
    color: 'var(--text-muted)',
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
  pillOffered: {
    backgroundColor: 'var(--tag-offered-bg)',
    color: 'var(--tag-offered-text)',
    padding: '0.4rem 0.8rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: 600,
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
  },
  pillWanted: {
    backgroundColor: 'var(--tag-wanted-bg)',
    color: 'var(--tag-wanted-text)',
    padding: '0.4rem 0.8rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: 600,
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
  },
  timer: {
    margin: '1.5rem 0',
    color: 'var(--text-muted)',
    fontSize: '1rem',
  },
  explanationBlock: {
    backgroundColor: 'rgba(128,128,128,0.08)',
    borderLeft: '3px solid var(--accent)',
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
    color: 'var(--text-muted)',
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
    border: '2px solid var(--border)',
    color: 'var(--text)',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    flex: 1,
    padding: '0.8rem',
    backgroundColor: 'var(--btn-primary-bg)',
    border: 'none',
    color: 'var(--btn-primary-text)',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transition: 'transform 0.1s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// Injects the fadein animation keyframes globally
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
    @keyframes fadein {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default MatchNotification;
