// Renders a single skill tag/badge for display on user cards and profiles
const SkillBadge = ({ skill, variant = 'solid' }) => {
  const isSolid = variant === 'solid';

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: isSolid ? '#01696f' : 'transparent',
        border: isSolid ? '1px solid #01696f' : '1px solid #01696f',
        color: isSolid ? '#ffffff' : '#01696f',
      }}
    >
      {skill}
    </span>
  );
};

const styles = {
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
};

export default SkillBadge;
