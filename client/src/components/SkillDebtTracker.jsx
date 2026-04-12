// Component for tracking bi-directional SkillDebt balances between users

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import socket from '../socket';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const SkillDebtTracker = () => {
  const { token } = useUser();
  const [myDebts, setMyDebts]     = useState([]);
  const [owedToMe, setOwedToMe]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [repaying, setRepaying]   = useState(null); // debtId being processed

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchDebts = useCallback(async () => {
    if (!token) return;
    try {
      const [myRes, owedRes] = await Promise.all([
        fetch(`${API}/api/debts/my`,          { headers: authHeaders }),
        fetch(`${API}/api/debts/owed-to-me`,  { headers: authHeaders }),
      ]);
      const [myJson, owedJson] = await Promise.all([myRes.json(), owedRes.json()]);
      setMyDebts(myJson.debts   ?? []);
      setOwedToMe(owedJson.debts ?? []);
    } catch (err) {
      console.error('SkillDebtTracker fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  // ── Live updates via socket ───────────────────────────────────────────────────
  useEffect(() => {
    const handleDebtUpdate = ({ debts }) => {
      setMyDebts(debts ?? []);
    };
    socket.on('debt:update', handleDebtUpdate);
    return () => socket.off('debt:update', handleDebtUpdate);
  }, []);

  // ── Repay a debt ──────────────────────────────────────────────────────────────
  const handleRepay = async (debtId) => {
    setRepaying(debtId);
    try {
      const res = await fetch(`${API}/api/debts/${debtId}/repay`, {
        method:  'PATCH',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('Repay failed');
      // Remove locally — server will also emit debt:update
      setMyDebts((prev) => prev.filter((d) => d._id !== debtId));
    } catch (err) {
      console.error('Repay error:', err);
      alert('Failed to mark debt as repaid. Try again.');
    } finally {
      setRepaying(null);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading debts...</div>;
  }

  return (
    <div style={styles.container} className="skill-debt-columns">
      {/* ── You Owe ──────────────────────────────────────────────────────────── */}
      <div style={styles.panel} className="skill-debt-column">
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>
            <span style={styles.amberDot} />
            You Owe
          </h3>
          {myDebts.length > 0 && (
            <span style={styles.badge}>{myDebts.length}</span>
          )}
        </div>

        {myDebts.length === 0 ? (
          <div style={styles.empty}>🎉 You&apos;re all caught up!</div>
        ) : (
          <ul style={styles.list}>
            {myDebts.map((debt) => (
              <li key={debt._id} style={styles.debtCard} className="debt-card">
                <div style={styles.debtInfo}>
                  <span style={styles.debtText}>
                    You owe{' '}
                    <strong style={styles.username}>
                      @{debt.creditor?.username ?? '—'}
                    </strong>{' '}
                    a session on{' '}
                    <span style={styles.skill}>{debt.skillTaught}</span>
                  </span>
                  {debt.sessionId?.completedAt && (
                    <span style={styles.debtMeta}>
                      Session completed:{' '}
                      {new Date(debt.sessionId.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  style={{
                    ...styles.repayBtn,
                    opacity: repaying === debt._id ? 0.6 : 1,
                    cursor:  repaying === debt._id ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => handleRepay(debt._id)}
                  disabled={repaying === debt._id}
                >
                  {repaying === debt._id ? '...' : '✓ Mark Repaid'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Owed to You ──────────────────────────────────────────────────────── */}
      <div style={styles.panel} className="skill-debt-column">
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>
            <span style={styles.tealDot} />
            Owed to You
          </h3>
        </div>

        {owedToMe.length === 0 ? (
          <div style={styles.empty}>✅ No pending debts</div>
        ) : (
          <ul style={styles.list}>
            {owedToMe.map((debt) => (
              <li key={debt._id} style={{ ...styles.debtCard, ...styles.debtCardTeal }} className="debt-card">
                <div style={styles.debtInfo}>
                  <span style={styles.debtText}>
                    <strong style={styles.username}>
                      @{debt.debtor?.username ?? '—'}
                    </strong>{' '}
                    owes you a session on{' '}
                    <span style={{ ...styles.skill, color: '#2dd4bf' }}>
                      {debt.skillTaught}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    gap: '1.5rem',
    width: '100%',
  },
  panel: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
  },
  panelTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  amberDot: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#f59e0b',
    flexShrink: 0,
  },
  tealDot: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#01696f',
    flexShrink: 0,
  },
  badge: {
    backgroundColor: '#dc2626',
    color: '#fff',
    borderRadius: '999px',
    padding: '0.1rem 0.55rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    lineHeight: 1.6,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  debtCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    backgroundColor: '#111',
    border: '1px solid #292929',
    borderLeft: '3px solid #f59e0b',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
  },
  debtCardTeal: {
    borderLeft: '3px solid #01696f',
  },
  debtInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    flex: 1,
  },
  debtText: {
    color: '#d1d5db',
    fontSize: '0.9rem',
    lineHeight: 1.4,
  },
  debtMeta: {
    color: '#6b7280',
    fontSize: '0.75rem',
  },
  username: {
    color: '#f0f0f0',
    fontWeight: 600,
  },
  skill: {
    color: '#fbbf24',
    fontWeight: 600,
  },
  repayBtn: {
    backgroundColor: '#01696f',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  },
  empty: {
    color: '#6b7280',
    fontSize: '0.9rem',
    padding: '1rem 0',
    textAlign: 'center',
  },
  loading: {
    color: '#6b7280',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '2rem',
  },
};

export default SkillDebtTracker;
