// Renders a single skill tag/badge for display on user cards and profiles
const SkillBadge = ({ skill, variant = 'solid' }) => {
  const isSolid = variant === 'solid';

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: isSolid ? 'var(--tag-offered-bg)' : 'var(--tag-wanted-bg)',
        border: isSolid
          ? '1px solid var(--tag-offered-bg)'
          : '1px solid var(--tag-wanted-bg)',
        color: isSolid ? 'var(--tag-offered-text)' : 'var(--tag-wanted-text)',
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
