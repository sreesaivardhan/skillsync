import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Pencil, Lock, UserCircle, Award, Coins, GitBranch, CheckCircle, ExternalLink } from 'lucide-react';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

// ── Profile Tag Input (With optional level selector) ──────────────────────────
const ProfileTagInput = ({ label, tags, onAdd, onRemove, placeholder, withLevel }) => {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState('Beginner');

  const handleAdd = () => {
    const val = input.trim();
    if (!val) return;
    if (withLevel) {
      if (!tags.find(t => t.skill === val)) onAdd({ skill: val, level });
    } else {
      if (!tags.includes(val)) onAdd(val);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  };

  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.tagBox} className="tags-container skill-tags-container">
        {tags.map((tag, idx) => {
          const isObj = typeof tag === 'object';
          const text = isObj ? `${tag.skill} (${tag.level})` : tag;
          const id   = isObj ? tag.skill : tag;
          return (
            <span
              key={idx}
              style={{
                ...styles.pill,
                backgroundColor: withLevel ? 'var(--tag-offered-bg)' : 'var(--tag-wanted-bg)',
                color:           withLevel ? 'var(--tag-offered-text)' : 'var(--tag-wanted-text)',
              }}
              onClick={() => onRemove(id)}
              title="Click to remove"
            >
              {text} <span style={styles.pillX}>×</span>
            </span>
          );
        })}
        <div style={styles.inputGroup} className="skill-input-row">
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
  const { user, token, updateUserLocally } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading]           = useState(true);
  const [isEditing, setIsEditing]       = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd]       = useState(false);
  const [profileData, setProfileData]   = useState(null);
  const [pwdForm, setPwdForm]           = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd]           = useState(false);
  const [pwdError, setPwdError]         = useState('');
  const [pwdSuccess, setPwdSuccess]     = useState('');

  // ── GitHub state ───────────────────────────────────────────────────────────────
  const [githubUsername,    setGithubUsername]    = useState('');
  const [githubLoading,     setGithubLoading]     = useState(false);
  const [githubSuggestions, setGithubSuggestions] = useState([]);
  const [githubRepos,       setGithubRepos]       = useState([]);
  const [githubMessage,     setGithubMessage]     = useState('');
  const [githubImported,    setGithubImported]    = useState(false);
  const [githubError,       setGithubError]       = useState('');

  useEffect(() => {
    if (!token) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setProfileData(await res.json());
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  if (!user || loading || !profileData) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Profile...
        </div>
      </div>
    );
  }

  const handleProfileChange = (e) =>
    setProfileData({ ...profileData, [e.target.name]: e.target.value });

  const addOffered    = (skillObj) => setProfileData(p => ({ ...p, skillsOffered: [...p.skillsOffered, skillObj] }));
  const removeOffered = (n)        => setProfileData(p => ({ ...p, skillsOffered: p.skillsOffered.filter(s => s.skill !== n) }));
  const addWanted     = (s)        => setProfileData(p => ({ ...p, skillsWanted: [...p.skillsWanted, s] }));
  const removeWanted  = (s)        => setProfileData(p => ({ ...p, skillsWanted: p.skillsWanted.filter(x => x !== s) }));

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`${API}/api/users/${user._id || user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: profileData.username,
          skillsOffered: profileData.skillsOffered,
          skillsWanted:  profileData.skillsWanted,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfileData(updated);
        updateUserLocally(updated);
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
    setPwdError('');
    setPwdSuccess('');
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError("New passwords don't match.");
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch(`${API}/api/users/${user._id || user.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: pwdForm.currentPassword,
          newPassword:     pwdForm.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwdSuccess('Password updated successfully!');
        setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPwdError(data.message || data.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      setPwdError('Network error while updating password.');
    } finally {
      setSavingPwd(false);
    }
  };

  const cancelEdit = async () => {
    setIsEditing(false);
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setProfileData(await res.json());
  };

  // ── GitHub handlers ───────────────────────────────────────────────────────────
  const connectGithub = async () => {
    if (!githubUsername.trim()) return;
    setGithubLoading(true);
    setGithubMessage('');
    setGithubError('');
    setGithubSuggestions([]);
    setGithubRepos([]);
    setGithubImported(false);
    try {
      const res = await fetch(`${API}/api/github/connect`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ githubUsername: githubUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Connection failed.');
      setGithubSuggestions(data.suggestedSkills || []);
      setGithubRepos(data.repos || []);
      setGithubMessage(`Connected as @${data.githubUsername}`);
    } catch (err) {
      setGithubError(err.message || 'GitHub connection failed.');
    } finally {
      setGithubLoading(false);
    }
  };

  const importGithubSkills = async () => {
    try {
      const res = await fetch(`${API}/api/github/apply-skills`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ skills: githubSuggestions }),
      });
      const data = await res.json();
      if (res.ok) {
        updateUserLocally(data.user);
        setProfileData((prev) => ({ ...prev, skillsOffered: data.user.skillsOffered }));
        setGithubImported(true);
        setGithubMessage('Skills imported into your profile!');
      } else {
        setGithubError(data.message || 'Failed to import skills.');
      }
    } catch (err) {
      setGithubError(err.message || 'Failed to import skills.');
    }
  };

  return (
    <div style={styles.page} className="profile-page">
      <Navbar />

      <div style={styles.mainContainer} className="profile-container">
        <button
          onClick={() => navigate('/lobby')}
          style={styles.backBtn}
        >
          ← Back to Lobby
        </button>

        {/* Main Profile Info Card */}
        <div style={styles.card} className="auth-card profile-card">
          <div style={styles.headerRow} className="profile-header-row">
            <div style={styles.avatarWrap} className="profile-avatar-wrap">
              <div style={styles.avatar}>
                <UserCircle size={36} color="var(--navbar-text)" strokeWidth={1.5} />
              </div>
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
              <button style={styles.primaryBtn} onClick={() => setIsEditing(true)}>
                <Pencil size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={styles.cancelBtn} onClick={cancelEdit} disabled={savingProfile}>Cancel</button>
                <button style={styles.primaryBtn} onClick={handleSaveProfile} disabled={savingProfile}>
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
            <h3 style={styles.subHeading}>
              <Award size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Skills You Can Teach
            </h3>
            {isEditing ? (
              <ProfileTagInput label="" tags={profileData.skillsOffered}
                onAdd={addOffered} onRemove={removeOffered}
                placeholder="e.g. Python, Yoga..." withLevel={true} />
            ) : (
              <div style={styles.tagsContainer} className="tags-container">
                {profileData.skillsOffered.length > 0 ? (
                  profileData.skillsOffered.map((s, i) => (
                    <span key={i} style={{ ...styles.pill, backgroundColor: 'var(--tag-offered-bg)', color: 'var(--tag-offered-text)' }}>
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
              <ProfileTagInput label="" tags={profileData.skillsWanted}
                onAdd={addWanted} onRemove={removeWanted}
                placeholder="e.g. Spanish, SEO..." withLevel={false} />
            ) : (
              <div style={styles.tagsContainer} className="tags-container">
                {profileData.skillsWanted.length > 0 ? (
                  profileData.skillsWanted.map((s, i) => (
                    <span key={i} style={{ ...styles.pill, backgroundColor: 'var(--tag-wanted-bg)', color: 'var(--tag-wanted-text)' }}>
                      {typeof s === 'string' ? s : s.skill}
                    </span>
                  ))
                ) : (
                  <span style={styles.emptyText}>None listed</span>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={styles.skillsSection}>
            <h3 style={styles.subHeading}>
              <Award size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Stats Panel
            </h3>
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
                <div style={{ ...styles.statVal, color: 'var(--accent)' }}>{profileData.credits}</div>
                <div style={styles.statLabel}>
                  <Coins size={12} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                  Credits
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div style={styles.card} className="auth-card">
          <h3 style={styles.subHeading}>
            <Lock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Change Password
          </h3>
          <form style={styles.section} onSubmit={handleSavePassword}>
            <div style={styles.field}>
              <label style={styles.label}>Current Password</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwdForm.currentPassword}
                onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                required style={styles.formInput}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>New Password</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwdForm.newPassword}
                onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                required style={styles.formInput} minLength={6}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwdForm.confirmPassword}
                onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                required style={styles.formInput} minLength={6}
              />
            </div>
            {pwdError   && <p style={{ color: '#dc2626', fontSize: '13px', margin: '8px 0 0' }}>{pwdError}</p>}
            {pwdSuccess  && <p style={{ color: '#22c55e', fontSize: '13px', margin: '8px 0 0' }}>{pwdSuccess}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={showPwd} onChange={() => setShowPwd(!showPwd)} />{' '}
                Show Passwords
              </label>
              <button type="submit" style={styles.primaryBtn} disabled={savingPwd}>
                {savingPwd ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* ── GitHub Skill Import Card ───────────────────────────────────── */}
        <div style={styles.card} className="auth-card">
          <h3 style={styles.subHeading}>
            <GitBranch size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            GitHub Skill Import
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 1.2rem' }}>
            Enter your GitHub username to analyse your public repositories and auto-suggest skills for your profile.
          </p>

          {/* Input row */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="e.g. torvalds"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && connectGithub()}
              style={{ ...styles.formInput, flex: 1 }}
            />
            <button
              onClick={connectGithub}
              disabled={githubLoading || !githubUsername.trim()}
              style={{ ...styles.primaryBtn, opacity: (githubLoading || !githubUsername.trim()) ? 0.6 : 1 }}
            >
              {githubLoading ? 'Analysing…' : 'Connect'}
            </button>
          </div>

          {/* Status messages */}
          {githubMessage && !githubError && (
            <p style={styles.ghSuccess}>
              <CheckCircle size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {githubMessage}
            </p>
          )}
          {githubError && <p style={styles.ghError}>{githubError}</p>}

          {/* Suggested skills */}
          {githubSuggestions.length > 0 && (
            <div style={styles.ghSection}>
              <p style={styles.ghSectionTitle}>Suggested skills from your repos:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
                {githubSuggestions.map((skill) => (
                  <span key={skill} style={styles.ghSkillPill}>{skill}</span>
                ))}
              </div>
              <button
                onClick={importGithubSkills}
                disabled={githubImported}
                style={{
                  ...styles.primaryBtn,
                  opacity: githubImported ? 0.5 : 1,
                  cursor:  githubImported ? 'default' : 'pointer',
                }}
              >
                {githubImported ? (
                  <><CheckCircle size={14} style={{ marginRight: '6px' }} /> Imported!</>
                ) : (
                  'Import into Skills Offered'
                )}
              </button>
            </div>
          )}

          {/* Repo preview */}
          {githubRepos.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <p style={styles.ghSectionTitle}>Recent public repositories:</p>
              <div style={styles.repoGrid}>
                {githubRepos.slice(0, 6).map((repo) => (
                  <a
                    key={repo.name}
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.repoCard}
                  >
                    <div style={styles.repoName}>
                      {repo.name}
                      <ExternalLink size={12} style={{ marginLeft: '5px', opacity: 0.6 }} />
                    </div>
                    {repo.description && (
                      <div style={styles.repoDesc}>{repo.description}</div>
                    )}
                    {repo.language && (
                      <span style={styles.repoLang}>{repo.language}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
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
    background: 'var(--bg)',
    color: 'var(--text)',
    transition: 'background-color 0.25s ease',
  },
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    padding: '1rem',
  },
  card: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '2.5rem 3rem',
    width: '100%',
    maxWidth: '650px',
    boxShadow: 'var(--card-shadow)',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    alignSelf: 'flex-start',
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '1.5rem',
  },
  avatarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heading: {
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
  editInput: {
    padding: '10px 15px',
    fontSize: '1.2rem',
    borderRadius: '8px',
    border: '1px solid var(--accent)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text)',
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
    backgroundColor: 'var(--surface-2)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
  },
  label: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  value: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
  skillsSection: {
    marginBottom: '24px',
  },
  subHeading: {
    margin: '0 0 1rem 0',
    fontSize: '1.2rem',
    color: 'var(--text)',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
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
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  pillX: {
    marginLeft: '8px',
    fontWeight: 'bold',
    opacity: 0.8,
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    fontSize: '0.9rem',
    opacity: 0.7,
  },
  primaryBtn: {
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  addBtn: {
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
    padding: '0 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
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
    backgroundColor: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px',
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
    width: '100%',
    marginTop: '6px',
  },
  tagInput: {
    flex: 2,
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    outline: 'none',
  },
  levelSelect: {
    flex: 1,
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '0 10px',
    outline: 'none',
  },
  formInput: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '12px',
    fontSize: '1rem',
    outline: 'none',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    backgroundColor: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '20px',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  statVal: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: 'var(--text)',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
  },
  // ── GitHub section ──────────────────────────────────────────────────────────
  ghSuccess: {
    color: '#22c55e',
    backgroundColor: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: '6px',
    padding: '0.55rem 0.85rem',
    fontSize: '0.85rem',
    marginBottom: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
  },
  ghError: {
    color: '#dc2626',
    backgroundColor: 'rgba(220,38,38,0.06)',
    border: '1px solid rgba(220,38,38,0.2)',
    borderRadius: '6px',
    padding: '0.55rem 0.85rem',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  ghSection: {
    backgroundColor: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '1rem 1.2rem',
    marginTop: '0.5rem',
  },
  ghSectionTitle: {
    margin: '0 0 0.75rem',
    fontSize: '0.88rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  ghSkillPill: {
    backgroundColor: 'var(--tag-offered-bg)',
    color: 'var(--tag-offered-text)',
    padding: '0.35rem 0.85rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  repoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
  },
  repoCard: {
    display: 'block',
    backgroundColor: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    textDecoration: 'none',
    transition: 'border-color 0.2s',
  },
  repoName: {
    fontWeight: 600,
    fontSize: '0.88rem',
    color: 'var(--accent)',
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: '4px',
    wordBreak: 'break-all',
  },
  repoDesc: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
    marginBottom: '6px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  repoLang: {
    fontSize: '0.75rem',
    backgroundColor: 'var(--tag-wanted-bg)',
    color: 'var(--tag-wanted-text)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 500,
  },
};

export default Profile;
