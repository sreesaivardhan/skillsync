import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

// ── Profile Tag Input (With optional level selector) ──────────────────────────
const ProfileTagInput = ({ label, tags, onAdd, onRemove, placeholder, withLevel }) => {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState('Beginner');

  const handleAdd = () => {
    const val = input.trim();
    if (!val) return;
    
    if (withLevel) {
      if (!tags.find(t => t.skill === val)) {
        onAdd({ skill: val, level });
      }
    } else {
      if (!tags.includes(val)) {
        onAdd(val);
      }
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.tagBox} className="tags-container">
        {tags.map((tag, idx) => {
          const isObj = typeof tag === 'object';
          const text = isObj ? `${tag.skill} (${tag.level})` : tag;
          const id = isObj ? tag.skill : tag;
          return (
            <span
              key={idx}
              style={{ ...styles.pill, backgroundColor: withLevel ? '#01696f' : '#ea580c' }}
              onClick={() => onRemove(id)}
              title="Click to remove"
            >
              {text} <span style={styles.pillX}>×</span>
            </span>
          );
        })}
        <div style={styles.inputGroup}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={styles.tagInput}
          />
          {withLevel && (
            <select style={styles.levelSelect} value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
            </select>
          )}
          <button type="button" onClick={handleAdd} style={styles.addBtn}>Add</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Profile Component ────────────────────────────────────────────────────
const Profile = () => {
  const { user, token } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  
  const [profileData, setProfileData] = useState(null);
  
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  if (!user || loading || !profileData) {
    return <div style={styles.page}><Navbar /><div style={{padding:'100px', textAlign:'center'}}>Loading Profile...</div></div>;
  }

  // Edit Handlers
  const handleProfileChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
  
  // Tag Handlers
  const addOffered = (skillObj) => setProfileData(p => ({ ...p, skillsOffered: [...p.skillsOffered, skillObj] }));
  const removeOffered = (skillName) => setProfileData(p => ({ ...p, skillsOffered: p.skillsOffered.filter(s => s.skill !== skillName) }));
  
  const addWanted = (skillStr) => setProfileData(p => ({ ...p, skillsWanted: [...p.skillsWanted, skillStr] }));
  const removeWanted = (skillStr) => setProfileData(p => ({ ...p, skillsWanted: p.skillsWanted.filter(s => s !== skillStr) }));

  // Form Submits
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: profileData.username,
          skillsOffered: profileData.skillsOffered,
          skillsWanted: profileData.skillsWanted
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfileData(updated);
        setIsEditing(false);
        alert('Profile saved successfully!');
      } else {
        alert('Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      return alert("New passwords don't match.");
    }
    setSavingPwd(true);
    try {
      const res = await fetch(`${API}/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: pwdForm.currentPassword,
          newPassword: pwdForm.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Password updated successfully!');
        setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        alert(data.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating password.');
    } finally {
      setSavingPwd(false);
    }
  };

  const cancelEdit = async () => {
    setIsEditing(false);
    // Refresh to previous state
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProfileData(await res.json());
  };

  return (
    <div style={styles.page} className="profile-page">
      <Navbar />
      
      <div style={styles.mainContainer}>
        <button onClick={() => navigate('/lobby')}
          style={{ display:'flex', alignItems:'center', gap:'6px', alignSelf: 'flex-start', background:'none',
            border:'1px solid #444', color:'#aaa', padding:'8px 14px',
            borderRadius:'6px', cursor:'pointer', marginBottom:'0px', fontSize:'14px' }}>
          ← Back to Lobby
        </button>

        {/* Main Profile Info Card */}
        <div style={styles.card} className="auth-card">
          <div style={styles.headerRow}>
            <div style={styles.avatarWrap}>
              <div style={styles.avatar}>{profileData.username.charAt(0).toUpperCase()}</div>
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  style={styles.editInput}
                />
              ) : (
                <h2 style={styles.heading}>{profileData.username}</h2>
              )}
            </div>
            
            {!isEditing ? (
              <button style={styles.tealBtn} onClick={() => setIsEditing(true)}>Edit Profile</button>
            ) : (
              <div style={{display:'flex', gap:'10px'}}>
                <button style={styles.cancelBtn} onClick={cancelEdit} disabled={savingProfile}>Cancel</button>
                <button style={styles.tealBtn} onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div style={styles.section}>
            <div style={styles.infoRow}>
              <span style={styles.label}>Email (Read-only)</span>
              <span style={styles.value}>{profileData.email}</span>
            </div>
          </div>

          <div style={styles.skillsSection}>
            <h3 style={styles.subHeading}>Skills You Can Teach</h3>
            {isEditing ? (
              <ProfileTagInput
                label=""
                tags={profileData.skillsOffered}
                onAdd={addOffered}
                onRemove={removeOffered}
                placeholder="e.g. Python, Yoga..."
                withLevel={true}
              />
            ) : (
              <div style={styles.tagsContainer} className="tags-container">
                {profileData.skillsOffered.length > 0 ? (
                  profileData.skillsOffered.map((s, i) => (
                    <span key={i} style={{ ...styles.pill, backgroundColor: '#01696f' }}>
                      {s.skill} ({s.level || 'Beginner'})
                    </span>
                  ))
                ) : (
                  <span style={styles.emptyText}>None listed</span>
                )}
              </div>
            )}
          </div>

          <div style={styles.skillsSection}>
            <h3 style={styles.subHeading}>Skills You Want to Learn</h3>
            {isEditing ? (
              <ProfileTagInput
                label=""
                tags={profileData.skillsWanted}
                onAdd={addWanted}
                onRemove={removeWanted}
                placeholder="e.g. Spanish, SEO..."
                withLevel={false}
              />
            ) : (
              <div style={styles.tagsContainer} className="tags-container">
                {profileData.skillsWanted.length > 0 ? (
                  profileData.skillsWanted.map((s, i) => (
                    <span key={i} style={{ ...styles.pill, backgroundColor: '#ea580c' }}>
                      {typeof s === 'string' ? s : s.skill}
                    </span>
                  ))
                ) : (
                  <span style={styles.emptyText}>None listed</span>
                )}
              </div>
            )}
          </div>
          
          {/* Stats Panel */}
          <div style={styles.skillsSection}>
            <h3 style={styles.subHeading}>Stats Panel</h3>
            <div style={styles.statsGrid} className="stats-grid">
              <div style={styles.statBox}>
                <div style={styles.statVal}>{profileData.reputationScore}</div>
                <div style={styles.statLabel}>Reputation</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statVal}>{profileData.totalSessions}</div>
                <div style={styles.statLabel}>Sessions</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statVal}>{profileData.ratingCount}</div>
                <div style={styles.statLabel}>Ratings</div>
              </div>
              <div style={styles.statBox}>
                <div style={{...styles.statVal, color:'#22c55e'}}>{profileData.credits}</div>
                <div style={styles.statLabel}>Credits</div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div style={styles.card} className="auth-card">
          <h3 style={styles.subHeading}>Change Password</h3>
          <form style={styles.section} onSubmit={handleSavePassword}>
            <div style={styles.field}>
              <label style={styles.label}>Current Password</label>
              <input
                type={showPwd ? "text" : "password"}
                value={pwdForm.currentPassword}
                onChange={e => setPwdForm({...pwdForm, currentPassword: e.target.value})}
                required style={styles.formInput}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>New Password</label>
              <input
                type={showPwd ? "text" : "password"}
                value={pwdForm.newPassword}
                onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})}
                required style={styles.formInput}
                minLength={6}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type={showPwd ? "text" : "password"}
                value={pwdForm.confirmPassword}
                onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})}
                required style={styles.formInput}
                minLength={6}
              />
            </div>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <label style={{color: '#888', fontSize:'0.9rem'}}>
                <input type="checkbox" checked={showPwd} onChange={() => setShowPwd(!showPwd)} /> Show Passwords
              </label>
              <button type="submit" style={styles.tealBtn} disabled={savingPwd}>
                {savingPwd ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    overflowY: 'auto',
    paddingTop: '80px',
    paddingBottom: '40px',
    background: '#0f0f0f',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: '#f0f0f0',
  },
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '16px',
    padding: '2.5rem 3rem',
    width: '100%',
    maxWidth: '650px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    borderBottom: '1px solid #333',
    paddingBottom: '1.5rem',
  },
  avatarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#01696f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#fff'
  },
  heading: {
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: 600,
    color: '#f0f0f0',
  },
  editInput: {
    padding: '10px 15px',
    fontSize: '1.2rem',
    borderRadius: '8px',
    border: '1px solid #01696f',
    backgroundColor: '#111',
    color: '#fff',
    outline: 'none',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
    marginBottom: '24px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#111',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  label: {
    color: '#888',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  value: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  skillsSection: {
    marginBottom: '24px',
  },
  subHeading: {
    margin: '0 0 1rem 0',
    fontSize: '1.2rem',
    color: '#01696f',
    fontWeight: 600,
  },
  tagsContainer: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  pill: {
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  pillX: {
    marginLeft: '8px',
    fontWeight: 'bold',
    opacity: 0.8
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: '0.9rem',
  },
  tealBtn: {
    backgroundColor: '#01696f',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  cancelBtn: {
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  addBtn: {
    backgroundColor: '#444',
    color: '#fff',
    border: 'none',
    padding: '0 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  tagBox: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '12px',
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
    width: '100%',
    marginTop: '6px'
  },
  tagInput: {
    flex: 2,
    backgroundColor: 'transparent',
    border: '1px solid #444',
    borderRadius: '6px',
    color: '#fff',
    padding: '10px 12px',
    fontSize: '0.9rem',
    outline: 'none',
  },
  levelSelect: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '6px',
    padding: '0 10px',
    outline: 'none'
  },
  formInput: {
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    padding: '12px',
    fontSize: '1rem',
    outline: 'none',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px'
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  statVal: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#fff'
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#888',
    textTransform: 'uppercase'
  }
};

export default Profile;
