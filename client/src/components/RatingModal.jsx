// Post-session peer rating modal — star rating + optional endorsement

import { useState } from 'react';
import { useUser } from '../context/UserContext';

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

      // Show success state briefly then close
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
          // ── Success state ──────────────────────────────────────────────────
          <div style={styles.successBox}>
            <span style={styles.successIcon}>✅</span>
            <p style={styles.successText}>Rating submitted!</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <h2 style={styles.title}>
              Rate your session with{' '}
              <span style={styles.partnerName}>@{partnerName}</span>
            </h2>

            {/* Star rating */}
            <div style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= (hoveredStar || selectedStar);
                return (
                  <span
                    key={star}
                    style={{
                      ...styles.star,
                      color:     isActive ? '#facc15' : '#3a3a3a',
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

            {/* Numeric label */}
            {(hoveredStar || selectedStar) > 0 && (
              <p style={styles.starLabel}>
                {starLabel(hoveredStar || selectedStar)}
              </p>
            )}

            {/* Endorsement text area */}
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

            {/* Error message */}
            {error && <p style={styles.error}>{error}</p>}

            {/* Actions */}
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

// Map star count to a short label
const starLabel = (n) =>
  ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][n];

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#f0f0f0',
    textAlign: 'center',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  partnerName: {
    color: '#01696f',
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
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#f0f0f0',
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
    color: '#555',
    alignSelf: 'flex-end',
    marginTop: '-0.5rem',
  },
  error: {
    margin: 0,
    color: '#f87171',
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
    backgroundColor: '#01696f',
    color: '#fff',
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
    color: '#666',
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
  successIcon: {
    fontSize: '3rem',
    lineHeight: 1,
  },
  successText: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#4ade80',
  },
};

export default RatingModal;
