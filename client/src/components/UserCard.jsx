// Displays a user's profile card with name, avatar, and skill tags in the lobby

import { useState } from 'react';
import SkillBadge from './SkillBadge';

const UserCard = ({ user }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!user) return null;

  const { username, skillsOffered = [], skillsWanted = [], status, credits } = user;
  
  const isAvailable = status === 'available';

  return (
    <div 
      style={{
        ...styles.card,
        borderColor: isHovered ? '#01696f' : '#2a2a2a'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Row: Username + Status */}
      <div style={styles.topRow}>
        <span style={styles.username}>{username}</span>
        <div style={styles.statusBadge}>
          <span 
            style={{
              ...styles.statusDot, 
              backgroundColor: isAvailable ? '#22c55e' : '#eab308' 
            }} 
          />
          <span style={styles.statusText}>
            {isAvailable ? 'Available' : 'In Session'}
          </span>
        </div>
      </div>

      {/* Middle: Skills */}
      <div style={styles.skillsSection}>
        <div style={styles.skillGroup}>
          <span style={styles.skillLabel}>Teaches:</span>
          <div style={styles.skillList}>
            {skillsOffered.length > 0 ? (
              skillsOffered.map((s, i) => (
                <SkillBadge key={i} skill={s.skill} variant="solid" />
              ))
            ) : (
              <span style={styles.emptySkill}>None listed</span>
            )}
          </div>
        </div>

        <div style={styles.skillGroup}>
          <span style={styles.skillLabel}>Learns:</span>
          <div style={styles.skillList}>
            {skillsWanted.length > 0 ? (
              skillsWanted.map((s, i) => (
                <SkillBadge key={i} skill={s} variant="outline" />
              ))
            ) : (
              <span style={styles.emptySkill}>None listed</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Credits */}
      <div style={styles.bottomRow}>
        <span style={styles.creditsText}>🪙 {credits} credits</span>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #2a2a2a',
    borderRadius: '10px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    transition: 'border-color 0.25s ease',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontWeight: 'bold',
    fontSize: '1rem',
    color: '#f0f0f0',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '0.2rem 0.5rem',
    borderRadius: '999px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '0.75rem',
    color: '#ccc',
    fontWeight: 500,
  },
  skillsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  skillGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  skillLabel: {
    fontSize: '0.75rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  skillList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  emptySkill: {
    fontSize: '0.8rem',
    color: '#555',
    fontStyle: 'italic',
  },
  bottomRow: {
    marginTop: '0.2rem',
    display: 'flex',
    justifyContent: 'flex-start',
  },
  creditsText: {
    fontSize: '0.85rem',
    color: '#777',
    fontWeight: 500,
  }
};

export default UserCard;
