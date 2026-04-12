// Page component for an active skill-exchange session between two matched users

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import { useUser } from '../context/UserContext';
import Navbar from '../components/Navbar';
import RatingModal from '../components/RatingModal';

const Session = () => {
  const { roomId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sharedNotes, setSharedNotes] = useState('');
  const [sessionStatus, setSessionStatus] = useState('waiting');
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [completionPending, setCompletionPending] = useState(false);
  const [partnerCompleted, setPartnerCompleted] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  
  // Rating specific state — useRef so value survives re-render cycles
  const dbSessionIdRef = useRef(null);
  const [partnerDetails, setPartnerDetails] = useState({ name: '', id: '' });
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Agenda specific state
  const [agenda, setAgenda] = useState(null);
  const [agendaCollapsed, setAgendaCollapsed] = useState(false);
  const [agendaDismissed, setAgendaDismissed] = useState(false);
  
  // Mobile layout state
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' or 'notes'

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigateTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Sockets & Event Listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || !roomId) return;

    socket.emit('room:join', { roomId, userId: user.id });

    const handleRoomReady = ({ users, sessionId }) => {
      setSessionStatus('active');
      // Persist in ref — immune to re-render cycles
      if (sessionId) {
        dbSessionIdRef.current = sessionId;
        console.log('[Session] dbSessionIdRef set to:', sessionId);
      }

      // Find the user who is NOT the current user — that's the partner
      const myId = user._id || user.id;
      const partner = users?.find(u => String(u.userId) !== String(myId));
      if (partner) {
        setPartnerName(partner.username);
        setPartnerDetails({ name: partner.username, id: partner.userId });
      }
    };

    const handleChatBroadcast = (msg) => {
      // Preserve imageData / fileUrl alongside text
      setMessages((prev) => [...prev, {
        ...msg,
        text: msg.message,
        imageData: msg.imageData,
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
      }]);
    };

    const handleNotesSync = ({ content }) => setSharedNotes(content);

    const handlePartnerLeft = () => setPartnerLeft(true);
    const handlePartnerCompleted = () => setPartnerCompleted(true);
    const handleAgenda = (data) => {
      console.log('Agenda received:', data);
      setAgenda(data.agenda);
    };

    socket.on('room:ready', handleRoomReady);
    socket.on('chat:broadcast', handleChatBroadcast);
    socket.on('notes:sync', handleNotesSync);
    socket.on('room:partner_left', handlePartnerLeft);
    socket.on('session:partner_completed', handlePartnerCompleted);
    socket.on('session:agenda', handleAgenda);

    return () => {
      socket.off('room:ready', handleRoomReady);
      socket.off('chat:broadcast', handleChatBroadcast);
      socket.off('notes:sync', handleNotesSync);
      socket.off('room:partner_left', handlePartnerLeft);
      socket.off('session:partner_completed', handlePartnerCompleted);
      socket.off('session:agenda', handleAgenda);
    };
  }, [roomId, user]);

  // ── session:confirmed — isolated so navigate is never stale ─────────────────
  useEffect(() => {
    const handleSessionConfirmed = () => {
      console.log('session:confirmed received — showing rating modal');
      setSessionStatus('completed');
      setCompletionPending(false);
      setShowRatingModal(true);
    };

    socket.on('session:confirmed', handleSessionConfirmed);

    return () => {
      socket.off('session:confirmed', handleSessionConfirmed);
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
    };
  }, [navigate]);

  // ── match:declined — fires if partner declines AFTER we already navigated ────
  // Without this, the accepted user is permanently stuck on a 'waiting' session
  useEffect(() => {
    const handleMatchDeclined = ({ message }) => {
      console.log('[Session] match:declined received — partner declined, redirecting');
      // Navigate back to lobby immediately
      navigate('/lobby');
    };

    socket.on('match:declined', handleMatchDeclined);

    return () => {
      socket.off('match:declined', handleMatchDeclined);
    };
  }, [navigate]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleSendMessage = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputText.trim()) return;

    const payload = {
      roomId,
      message: inputText.trim(),
      senderId: user.id,
      senderName: user.username,
      timestamp: new Date().toISOString(),
    };

    socket.emit('chat:message', payload);
    
    // Optimistic UI update
    setMessages((prev) => [...prev, { ...payload, text: payload.message }]);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setSharedNotes(val);

    // Debounce notes emit by 500ms
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('notes:update', { roomId, content: val });
    }, 500);
  };

  const handleCompleteSession = () => {
    socket.emit('session:complete', { roomId, userId: user.id });
    setCompletionPending(true);
  };

  // ── File sharing ─────────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large (max 5MB)');
      return;
    }

    const base = { roomId, senderId: user.id, senderName: user.username, message: '' };

    if (file.type.startsWith('image/')) {
      // ── Image: read as Base64 and emit inline ──────────────────────────────
      const reader = new FileReader();
      reader.onload = () => {
        const payload = { ...base, imageData: reader.result };
        socket.emit('chat:message', payload);
        // Optimistic update
        setMessages((prev) => [...prev, { ...payload, text: '', timestamp: new Date().toISOString() }]);
      };
      reader.readAsDataURL(file);
    } else {
      // ── PDF / doc: upload to tmpfiles.org and share link ─────────────────
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData
        });
        const json = await response.json();
        
        if (json.status !== 'success' || !json.data?.url) {
           throw new Error('Upload failed');
        }
        
        // tmpfiles.org returns a view page URL by default.
        // We inject /dl/ into it to create a direct download link.
        const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

        const payload = { ...base, fileUrl: directUrl, fileName: file.name };
        socket.emit('chat:message', payload);
        // Optimistic update
        setMessages((prev) => [...prev, { ...payload, text: '', timestamp: new Date().toISOString() }]);
      } catch (err) {
        console.error(err);
        alert('File upload failed. Please try again.');
      }
    }
  };

  // Derive simple short room string for display
  const shortRoomId = roomId ? roomId.split('_')[2]?.slice(-6) || 'Sync' : '';

  return (
    <div style={styles.page}>
      <Navbar />

      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarContent}>
          <div style={styles.roomInfo}>
            <span style={styles.roomLabel}>Room #{shortRoomId}</span>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor:
                  sessionStatus === 'waiting'
                    ? '#ea580c'
                    : sessionStatus === 'active'
                    ? '#22c55e'
                    : '#3b82f6',
              }}
            >
              {sessionStatus.toUpperCase()}
            </span>
            <span style={styles.partnerInfo}>
              Partner: {partnerName || 'Connecting...'}
            </span>
          </div>

          {partnerLeft && (
            <div style={styles.partnerLeftBanner}>Your partner disconnected</div>
          )}
        </div>
      </div>

      {/* ── Rating Modal ─────────────────────────────────────────────────── */}
      {showRatingModal && partnerDetails.id && (() => {
        console.log('[RatingModal] dbSessionIdRef.current at open:', dbSessionIdRef.current);
        return (
          <RatingModal
            sessionId={dbSessionIdRef.current}
            partnerName={partnerDetails.name}
            partnerId={partnerDetails.id}
            onClose={() => {
              setShowRatingModal(false);
              navigateTimeoutRef.current = setTimeout(() => navigate('/lobby'), 3000);
            }}
          />
        );
      })()}

      {/* Completion Pending Banner — shown to user who clicked Complete first */}
      {completionPending && sessionStatus !== 'completed' && (
        <div style={styles.pendingBanner}>
          ⏳ You marked this complete — waiting for your partner to also click Complete...
        </div>
      )}

      {/* Partner Completed Banner — shown to the second user, prompting them to click */}
      {partnerCompleted && !completionPending && sessionStatus !== 'completed' && (
        <div style={styles.partnerCompletedBanner}>
          ✅ Your partner marked the session complete. Click <strong>Mark as Complete ✓</strong> to finish!
        </div>
      )}

      <div style={styles.mainContent} className="session-main-content">
        
        {/* Mobile Tab Toggle */}
        <div className="mobile-only" style={styles.mobileTabNav}>
          <button 
            style={{...styles.mobileTabBtn, borderBottom: mobileTab === 'chat' ? '2px solid #01696f' : '2px solid transparent', color: mobileTab === 'chat' ? '#fff' : '#888'}} 
            onClick={() => setMobileTab('chat')}
          >
            💬 Chat
          </button>
          <button 
            style={{...styles.mobileTabBtn, borderBottom: mobileTab === 'notes' ? '2px solid #01696f' : '2px solid transparent', color: mobileTab === 'notes' ? '#fff' : '#888'}} 
            onClick={() => setMobileTab('notes')}
          >
            📝 Notes {agenda && !agendaDismissed && '🌟'}
          </button>
        </div>

        {/* Left Panel: Chat (60%) */}
        <div style={styles.leftPanel} className={mobileTab === 'chat' ? "session-panel-active" : "session-panel-hidden"}>
          <div style={styles.chatBox} className="session-chat-box">
            {messages.map((m, i) => {
              const isSelf = m.senderId === user?.id;
              return (
                <div key={i} style={isSelf ? styles.msgSelfRow : styles.msgOtherRow}>
                  <div style={isSelf ? styles.msgSelf : styles.msgOther}>
                    <p style={styles.msgName}>{isSelf ? 'You' : m.senderName}</p>

                    {/* Image message */}
                    {m.imageData && (
                      <a href={m.imageData} target="_blank" rel="noreferrer">
                        <img
                          src={m.imageData}
                          alt="shared"
                          style={styles.msgImage}
                        />
                      </a>
                    )}

                    {/* File / document message */}
                    {m.fileUrl && (
                      <div style={styles.fileCard}>
                        <span style={styles.fileIcon}>📄</span>
                        <div>
                          <p style={styles.fileName}>{m.fileName}</p>
                          <a
                            href={m.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.fileLink}
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Regular text message */}
                    {m.text && <p style={styles.msgText}>{m.text}</p>}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div style={styles.chatInputContainer} className="session-msg-input-container">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            {/* Attach button */}
            <button
              style={styles.attachBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={sessionStatus === 'completed'}
              title="Attach file"
            >
              📎
            </button>
            <textarea
              style={styles.chatInput}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Shift+Enter for a new line)"
              disabled={sessionStatus === 'completed'}
            />
            <button
              style={styles.sendBtn}
              onClick={handleSendMessage}
              disabled={!inputText.trim() || sessionStatus === 'completed'}
            >
              Send
            </button>
          </div>
        </div>

        {/* Right Panel: Notes (40%) */}
        <div style={styles.rightPanel} className={mobileTab === 'notes' ? "session-panel-active" : "session-panel-hidden"}>
          {/* ── AI Agenda Card ── */}
          {agenda && !agendaDismissed && (
            <div style={styles.agendaCard}>
              <div style={styles.agendaHeader}>
                <span 
                  style={styles.agendaTitle} 
                  onClick={() => setAgendaCollapsed(c => !c)}
                >
                  🗓️ Session Agenda (AI Generated) <span style={styles.agendaToggle}>{agendaCollapsed ? '▶' : '▼'}</span>
                </span>
                <button 
                  onClick={() => setAgendaDismissed(true)} 
                  style={styles.closeAgendaBtn}
                  title="Dismiss Agenda"
                >
                  ✕
                </button>
              </div>
              {!agendaCollapsed && (
                <div style={styles.agendaBody}>
                  {agenda}
                </div>
              )}
            </div>
          )}

          <div style={styles.notesHeader}>
            <h3 style={styles.notesTitle}>Shared Notes</h3>
            <span style={styles.notesSub}>Syncs automatically</span>
          </div>
          <textarea
            style={styles.notesArea}
            value={sharedNotes}
            onChange={handleNotesChange}
            placeholder="Write collaborative notes here..."
            disabled={sessionStatus === 'completed'}
          />

          <div style={styles.completeBox}>
            <button
              onClick={handleCompleteSession}
              style={{
                ...styles.completeBtn,
                opacity: (sessionStatus !== 'active' || completionPending) ? 0.45 : 1,
                cursor: (sessionStatus !== 'active' || completionPending) ? 'not-allowed' : 'pointer',
              }}
              disabled={sessionStatus !== 'active' || completionPending}
            >
              {completionPending ? '✓ Marked Complete' : 'Mark as Complete ✓'}
            </button>
          </div>
        </div>
      </div>

      {/* Completion Overlay */}
      {sessionStatus === 'completed' && (
        <div style={styles.overlay}>
          <div style={styles.modalCard}>
            <h2 style={styles.modalTitle}>🎉 Session Complete!</h2>
            <p style={styles.modalSub}>
              Great job learning and sharing! You've earned <strong>+1 credit</strong>.
            </p>
            <button
              onClick={() => navigate('/lobby')}
              style={styles.returnBtn}
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f0f0f',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: '#f0f0f0',
    overflow: 'hidden',
  },
  topBar: {
    height: '60px',
    marginTop: '64px', // Clears the fixed Navbar
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    alignItems: 'center',
    padding: '0 2rem',
  },
  topBarContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  roomInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  roomLabel: {
    fontWeight: 600,
    color: '#ccc',
  },
  statusBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fff',
  },
  partnerInfo: {
    color: '#888',
    fontSize: '0.9rem',
  },
  partnerLeftBanner: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    color: '#f87171',
    border: '1px solid rgba(248,113,113,0.3)',
    padding: '0.3rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    flex: '60%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #2a2a2a',
    backgroundColor: '#141414',
  },
  chatBox: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  msgSelfRow: { display: 'flex', justifyContent: 'flex-end' },
  msgOtherRow: { display: 'flex', justifyContent: 'flex-start' },
  msgSelf: {
    backgroundColor: '#01696f',
    color: '#fff',
    padding: '0.8rem',
    borderRadius: '12px 12px 0 12px',
    maxWidth: '75%',
    wordBreak: 'break-word',
  },
  msgOther: {
    backgroundColor: '#222',
    color: '#f0f0f0',
    padding: '0.8rem',
    borderRadius: '12px 12px 12px 0',
    maxWidth: '75%',
    wordBreak: 'break-word',
    border: '1px solid #333',
  },
  msgName: { margin: '0 0 0.3rem 0', fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 },
  msgText: { margin: 0, fontSize: '0.95rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' },
  chatInputContainer: {
    padding: '1rem',
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #2a2a2a',
    display: 'flex',
    gap: '0.8rem',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    padding: '0.8rem',
    resize: 'none',
    height: '60px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    backgroundColor: '#01696f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0 1.5rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  attachBtn: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '0 0.8rem',
    fontSize: '1.2rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'border-color 0.2s',
  },
  msgImage: {
    maxWidth: '200px',
    borderRadius: '8px',
    display: 'block',
    cursor: 'pointer',
    marginTop: '0.3rem',
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    marginTop: '0.3rem',
  },
  fileIcon: {
    fontSize: '1.4rem',
    lineHeight: 1,
  },
  fileName: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#f0f0f0',
    fontWeight: 500,
    wordBreak: 'break-all',
  },
  fileLink: {
    color: '#01696f',
    fontSize: '0.8rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
  rightPanel: {
    flex: '40%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a1a',
  },
  notesHeader: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesTitle: { margin: 0, fontSize: '1rem', color: '#ccc' },
  notesSub: { fontSize: '0.75rem', color: '#666' },
  notesArea: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    padding: '1.5rem',
    color: '#f0f0f0',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  completeBox: {
    padding: '1.5rem',
    borderTop: '1px solid #2a2a2a',
    textAlign: 'center',
  },
  completeBtn: {
    width: '100%',
    padding: '1rem',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#01696f',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'background-color 0.2s',
  },
  agendaCard: {
    backgroundColor: 'rgba(1, 105, 111, 0.05)',
    border: '1px solid #2a2a2a',
    borderLeft: '4px solid #01696f',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  agendaHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.8rem 1rem',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid #2a2a2a',
  },
  agendaTitle: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#2dd4bf',
    cursor: 'pointer',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  agendaToggle: {
    fontSize: '0.7rem',
    color: '#888',
  },
  closeAgendaBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '1.2rem',
    lineHeight: 1,
    padding: '0 0.2rem',
    transition: 'color 0.2s',
  },
  agendaBody: {
    padding: '1rem',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  pendingBanner: {
    backgroundColor: '#854d0e',
    borderBottom: '1px solid #a16207',
    color: '#fef08a',
    padding: '0.9rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    textAlign: 'center',
    letterSpacing: '0.01em',
    flexShrink: 0,
  },
  partnerCompletedBanner: {
    backgroundColor: '#14532d',
    borderBottom: '1px solid #166534',
    color: '#bbf7d0',
    padding: '0.9rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    textAlign: 'center',
    letterSpacing: '0.01em',
    flexShrink: 0,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    padding: '3rem',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
  },
  modalTitle: { color: '#01696f', margin: '0 0 1rem 0', fontSize: '2rem' },
  modalSub: { color: '#ccc', marginBottom: '2.5rem', fontSize: '1.1rem' },
  returnBtn: {
    backgroundColor: '#f0f0f0',
    color: '#111',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  mobileTabNav: {
    display: 'none', // Overridden by .mobile-only
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #333',
    justifyContent: 'space-between',
  },
  mobileTabBtn: {
    flex: 1,
    padding: '12px 0',
    backgroundColor: 'transparent',
    color: '#888',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 'bold',
  }
};

// Inject keyframe animations for banners
if (typeof document !== 'undefined') {
  const existing = document.getElementById('session-keyframes');
  if (!existing) {
    const styleEl = document.createElement('style');
    styleEl.id = 'session-keyframes';
    styleEl.innerHTML = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.65; }
      }
    `;
    document.head.appendChild(styleEl);
  }
}

export default Session;
