import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Coins } from 'lucide-react';

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
      <Coins
        size={18}
        color={flash ? '#fbbf24' : 'var(--accent)'}
        style={{ transition: 'color 0.3s ease', flexShrink: 0 }}
      />
      <span
        style={{
          ...styles.amount,
          color: flash ? '#fbbf24' : 'var(--navbar-text)',
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: '0.4rem 0.8rem',
    borderRadius: '999px',
    border: '1px solid var(--border)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
    overflow: 'visible',
    width: 'fit-content',
    whiteSpace: 'nowrap',
  },
  amount: {
    fontSize: '0.95rem',
    fontWeight: 700,
    lineHeight: 1,
    transition: 'all 0.3s ease',
    display: 'inline-block',
  },
};

export default CreditBar;
