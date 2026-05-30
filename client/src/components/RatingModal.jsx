// Post-session peer rating modal — star rating + optional endorsement

import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { CheckCircle } from 'lucide-react';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const RatingModal = ({ sessionId, partnerName, partnerId, onClose }) => {
  const { token } = useUser();

  const [hoveredStar, setHoveredStar]   = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [endorsement, setEndorsement]   = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState('');

  const handleStarClick = (star) => setSelectedStar(star);

  const handleSubmit = async () => {
    if (selectedStar === 0) {
      setError('Please select a star rating before submitting.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API}/api/rating/submit`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          ratedUserId: partnerId,
          stars:       selectedStar,
          endorsement: endorsement.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? 'Submission failed. Please try again.');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('RatingModal submit error:', err);
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.card}>

        {submitted ? (
          <div style={styles.successBox}>
            <CheckCircle size={48} color="var(--accent)" strokeWidth={2} />
            <p style={styles.successText}>Rating submitted!</p>
          </div>
        ) : (
          <>
            <h2 style={styles.title}>
              Rate your session with{' '}
              <span style={styles.partnerName}>@{partnerName}</span>
            </h2>

            <div style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= (hoveredStar || selectedStar);
                return (
                  <span
                    key={star}
                    style={{
                      ...styles.star,
                      color:     isActive ? '#facc15' : 'var(--border)',
                      transform: isActive ? 'scale(1.2)' : 'scale(1)',
                    }}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => handleStarClick(star)}
                    role="button"
                    aria-label={`${star} star`}
                  >
                    ★
                  </span>
                );
              })}
            </div>

            {(hoveredStar || selectedStar) > 0 && (
              <p style={styles.starLabel}>
                {starLabel(hoveredStar || selectedStar)}
              </p>
            )}

            <textarea
              style={styles.textarea}
              value={endorsement}
              onChange={(e) => {
                if (e.target.value.length <= 200) setEndorsement(e.target.value);
              }}
              placeholder="Write an endorsement (optional)"
              rows={3}
            />
            <p style={styles.charCount}>{endorsement.length}/200</p>

            {error && <p style={styles.error}>{error}</p>}

            <div style={styles.actions}>
              <button
                style={{
                  ...styles.submitBtn,
                  opacity: submitting ? 0.6 : 1,
                  cursor:  submitting ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </button>

              <button style={styles.skipBtn} onClick={onClose}>
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const starLabel = (n) =>
  ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][n];

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'var(--overlay-bg)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '440px',
    boxShadow: 'var(--card-shadow)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    color: 'var(--text)',
    textAlign: 'center',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  partnerName: {
    color: 'var(--accent)',
  },
  starsRow: {
    display: 'flex',
    gap: '0.4rem',
    cursor: 'pointer',
    userSelect: 'none',
  },
  star: {
    fontSize: '2.6rem',
    lineHeight: 1,
    transition: 'color 0.15s, transform 0.15s',
  },
  starLabel: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#facc15',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    minHeight: '1.2rem',
  },
  textarea: {
    width: '100%',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '0.75rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  },
  charCount: {
    margin: 0,
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    alignSelf: 'flex-end',
    marginTop: '-0.5rem',
  },
  error: {
    margin: 0,
    color: '#dc2626',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    marginTop: '0.25rem',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'opacity 0.2s',
  },
  skipBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '0.25rem',
    alignSelf: 'flex-end',
    transition: 'color 0.15s',
  },
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 0',
  },
  successText: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
};

export default RatingModal;
