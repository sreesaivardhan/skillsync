import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

// Visual progress bar showing a user's current skill credit balance
const CreditBar = () => {
  const { credits } = useUser();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    // Trigger flash animation on credit change
    setFlash(true);
    const timer = setTimeout(() => {
      setFlash(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [credits]);

  return (
    <div style={styles.container} title="Your SkillSync Credits">
      <span style={styles.icon}>🪙</span>
      <span
        style={{
          ...styles.amount,
          color: flash ? '#fbbf24' : '#f0f0f0', // Yellow vs White
          textShadow: flash ? '0 0 8px rgba(251, 191, 36, 0.6)' : 'none',
          transform: flash ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {credits}
      </span>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#111',
    padding: '0.4rem 0.8rem',
    borderRadius: '999px',
    border: '1px solid #333',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
    overflow: 'visible', // to prevent clipping during scale transform
  },
  icon: {
    fontSize: '1rem',
    lineHeight: 1,
  },
  amount: {
    fontSize: '0.95rem',
    fontWeight: 700,
    lineHeight: 1,
    transition: 'all 0.3s ease',
    display: 'inline-block', // allows transform to work
  },
};

export default CreditBar;
