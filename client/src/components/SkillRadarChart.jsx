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

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const SkillRadarChart = () => {
  const { token } = useUser();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
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
      fetch(`${API}/api/analytics/my-profile`, { headers: authHeaders })
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
  if (!profile) return null;

  // Render a lock state if the user hasn't completed enough sessions
  if ((profile.totalSessions || 0) < 3) {
    return (
      <div style={styles.lockedContainer}>
        <div style={styles.lockedIcon}>🔒</div>
        <h3 style={styles.lockedTitle}>Analytics Locked</h3>
        <p style={styles.lockedText}>Complete 3+ sessions to unlock your radar chart</p>
      </div>
    );
  }

  // ── Calculate Chart Data ──────────────────────────────────────────────────
  const labels = communityTop.map((s) => s.skill);
  
  // Normalize community data to 0-10 scale
  const maxCount = Math.max(...communityTop.map(s => s.count), 1); // fallback 1 to avoid div by zero
  const communityValues = communityTop.map((s) => (s.count / maxCount) * 10);

  // Map user skill levels to 0-10 scale
  const levelValues = { Beginner: 4, Intermediate: 7, Expert: 10 };
  
  const userValues = communityTop.map((communitySkill) => {
    // Check if the user offers this top community skill
    const userHasSkill = profile.skillsOffered?.find(
      (offered) => offered.skill.toLowerCase() === communitySkill.skill.toLowerCase()
    );
    if (!userHasSkill) return 0;
    return levelValues[userHasSkill.level] || 4; // default to Beginner weight if undefined
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Community Average',
        data: communityValues,
        backgroundColor: 'rgba(1, 105, 111, 0.3)',
        borderColor: '#01696f',
        pointBackgroundColor: '#01696f',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#01696f',
        pointRadius: 4,
        borderWidth: 2,
      },
      {
        label: 'Your Skills',
        data: userValues,
        backgroundColor: 'rgba(251, 146, 60, 0.3)',
        borderColor: '#fb923c',
        pointBackgroundColor: '#fb923c',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#fb923c',
        pointRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#e2e8f0', font: { family: "'Inter', sans-serif" } }
      },
      title: {
        display: true,
        text: 'Your Skill Coverage vs Community',
        color: '#f0f0f0',
        font: { size: 16, family: "'Inter', sans-serif", weight: 'bold' }
      }
    },
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: { display: false, stepSize: 2 },
        angleLines: { color: 'rgba(255,255,255,0.1)' },
        grid: { color: 'rgba(255,255,255,0.1)' },
        pointLabels: {
          color: '#d1d5db',
          font: { size: 12, family: "'Inter', sans-serif" }
        }
      }
    }
  };

  // ── Calculate Insights ────────────────────────────────────────────────────
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
              <span style={styles.emptyText}>You offer all top skills! 🚀</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  loading: {
    color: '#888',
    textAlign: 'center',
    padding: '2rem',
  },
  lockedContainer: {
    backgroundColor: '#1a1a1a',
    border: '1px dashed #444',
    borderRadius: '12px',
    padding: '3rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
  lockedIcon: {
    fontSize: '3rem',
    opacity: 0.8,
  },
  lockedTitle: {
    margin: 0,
    color: '#f0f0f0',
    fontSize: '1.2rem',
    fontWeight: 600,
  },
  lockedText: {
    margin: 0,
    color: '#888',
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
    borderTop: '1px solid #2a2a2a',
    paddingTop: '1rem',
  },
  insightBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  insightLabel: {
    margin: 0,
    color: '#d1d5db',
    fontSize: '0.9rem',
  },
  inDemandBadge: {
    backgroundColor: '#fb923c',
    color: '#111',
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
    backgroundColor: 'rgba(1, 105, 111, 0.2)',
    color: '#2dd4bf',
    border: '1px solid rgba(1, 105, 111, 0.4)',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  emptyText: {
    color: '#888',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  }
};

export default SkillRadarChart;
