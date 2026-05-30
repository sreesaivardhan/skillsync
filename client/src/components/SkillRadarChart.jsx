import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { useUser } from '../context/UserContext';
import { Lock } from 'lucide-react';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const SkillRadarChart = () => {
  const { token } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [communityTop, setCommunityTop] = useState([]);

  useEffect(() => {
    if (!token) return;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    Promise.all([
      fetch(`${API}/api/analytics/community-skills`, { headers: authHeaders }),
      fetch(`${API}/api/analytics/my-profile`,       { headers: authHeaders }),
    ])
      .then(async ([commRes, profRes]) => {
        const commData = await commRes.json();
        const profData = await profRes.json();
        setCommunityTop(commData.skills || []);
        setProfile(profData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching analytics:', err);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div style={styles.loading}>Loading analytics...</div>;
  if (!profile)  return null;

  if ((profile.totalSessions || 0) < 3) {
    return (
      <div style={styles.lockedContainer}>
        <Lock size={40} color="var(--text-muted)" strokeWidth={1.5} />
        <h3 style={styles.lockedTitle}>Analytics Locked</h3>
        <p style={styles.lockedText}>Complete 3+ sessions to unlock your radar chart</p>
      </div>
    );
  }

  const labels = communityTop.map((s) => s.skill);
  const maxCount = Math.max(...communityTop.map(s => s.count), 1);
  const communityValues = communityTop.map((s) => (s.count / maxCount) * 10);
  const levelValues = { Beginner: 4, Intermediate: 7, Expert: 10 };
  const userValues = communityTop.map((cs) => {
    const match = profile.skillsOffered?.find(
      (o) => o.skill.toLowerCase() === cs.skill.toLowerCase()
    );
    return match ? (levelValues[match.level] || 4) : 0;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Community Average',
        data: communityValues,
        backgroundColor: 'rgba(159, 211, 199, 0.2)',
        borderColor: '#9fd3c7',
        pointBackgroundColor: '#9fd3c7',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#9fd3c7',
        pointRadius: 4,
        borderWidth: 2,
      },
      {
        label: 'Your Skills',
        data: userValues,
        backgroundColor: 'rgba(56, 81, 112, 0.2)',
        borderColor: '#385170',
        pointBackgroundColor: '#385170',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#385170',
        pointRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  // Chart.js colors can't use CSS vars — we use consistent hex values here
  // that look good in both themes (the chart sits on its own surface card)
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#888', font: { family: "'Inter', sans-serif" } },
      },
      title: {
        display: true,
        text: 'Your Skill Coverage vs Community',
        color: '#888',
        font: { size: 16, family: "'Inter', sans-serif", weight: 'bold' },
      },
    },
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: { display: false, stepSize: 2 },
        angleLines: { color: 'rgba(128,128,128,0.2)' },
        grid:       { color: 'rgba(128,128,128,0.15)' },
        pointLabels: {
          color: '#888',
          font: { size: 12, family: "'Inter', sans-serif" },
        },
      },
    },
  };

  const userSkillNames = new Set(
    (profile.skillsOffered || []).map(s => s.skill.toLowerCase())
  );
  let inDemandCount = 0;
  const underservedSkills = [];
  communityTop.forEach((s) => {
    if (userSkillNames.has(s.skill.toLowerCase())) {
      inDemandCount++;
    } else {
      underservedSkills.push(s.skill);
    }
  });

  return (
    <div style={styles.container}>
      <div style={styles.chartWrapper}>
        <Radar data={data} options={options} />
      </div>

      <div style={styles.insightsRow}>
        <div style={styles.insightBox}>
          <p style={styles.insightLabel}>Skills you have that are in demand:</p>
          <span style={styles.inDemandBadge}>{inDemandCount}</span>
        </div>

        <div style={styles.underservedBox}>
          <p style={styles.insightLabel}>Skills the community needs:</p>
          <div style={styles.pillsRow}>
            {underservedSkills.length > 0 ? (
              underservedSkills.map((skill) => (
                <span key={skill} style={styles.tealPill}>{skill}</span>
              ))
            ) : (
              <span style={styles.emptyText}>You offer all top skills!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  loading: {
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '2rem',
  },
  lockedContainer: {
    backgroundColor: 'var(--surface)',
    border: '1px dashed var(--border)',
    borderRadius: '12px',
    padding: '3rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
  lockedTitle: {
    margin: 0,
    color: 'var(--text)',
    fontSize: '1.2rem',
    fontWeight: 600,
  },
  lockedText: {
    margin: 0,
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  chartWrapper: {
    height: '350px',
    width: '100%',
    position: 'relative',
  },
  insightsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderTop: '1px solid var(--border)',
    paddingTop: '1rem',
  },
  insightBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  insightLabel: {
    margin: 0,
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  inDemandBadge: {
    backgroundColor: 'var(--tag-wanted-bg)',
    color: 'var(--tag-wanted-text)',
    fontWeight: 700,
    fontSize: '0.85rem',
    padding: '0.1rem 0.6rem',
    borderRadius: '999px',
  },
  underservedBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  pillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  tealPill: {
    backgroundColor: 'var(--tag-offered-bg)',
    color: 'var(--tag-offered-text)',
    border: '1px solid var(--accent)',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
};

export default SkillRadarChart;
