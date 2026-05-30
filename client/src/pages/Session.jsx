// Page component for an active skill-exchange session between two matched users

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import { useUser } from '../context/UserContext';
import Navbar from '../components/Navbar';
import RatingModal from '../components/RatingModal';
import { MessageSquare, FileText, Paperclip, X } from 'lucide-react';

const Session = () => {
  const { roomId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [messages, setMessages]             = useState([]);
  const [inputText, setInputText]           = useState('');
  const [sharedNotes, setSharedNotes]       = useState('');
  const [sessionStatus, setSessionStatus]   = useState('waiting');
  const [partnerLeft, setPartnerLeft]       = useState(false);
  const [completionPending, setCompletionPending] = useState(false);
  const [partnerCompleted, setPartnerCompleted]   = useState(false);
  const [partnerName, setPartnerName]       = useState('');

  const dbSessionIdRef  = useRef(null);
  const [partnerDetails, setPartnerDetails] = useState({ name: '', id: '' });
  const [showRatingModal, setShowRatingModal] = useState(false);

  const [agenda, setAgenda]                 = useState(null);
  const [agendaCollapsed, setAgendaCollapsed] = useState(false);
  const [agendaDismissed, setAgendaDismissed] = useState(false);

  const [mobileTab, setMobileTab]           = useState('chat');

  const typingTimeoutRef  = useRef(null);
  const messagesEndRef    = useRef(null);
  const navigateTimeoutRef = useRef(null);
  const fileInputRef      = useRef(null);

  // ── Sockets ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !roomId) return;
    socket.emit('room:join', { roomId, userId: user.id });

    const handleRoomReady = ({ users, sessionId }) => {
      setSessionStatus('active');
      if (sessionId) {
        dbSessionIdRef.current = sessionId;
        console.log('[Session] dbSessionIdRef set to:', sessionId);
      }
      const myId = user._id || user.id;
      const partner = users?.find(u => String(u.userId) !== String(myId));
      if (partner) {
        setPartnerName(partner.username);
        setPartnerDetails({ name: partner.username, id: partner.userId });
      }
    };

    const handleChatBroadcast = (msg) => {
      setMessages((prev) => [...prev, {
        ...msg,
        text: msg.message,
        imageData: msg.imageData,
        fileUrl:   msg.fileUrl,
        fileName:  msg.fileName,
      }]);
    };

    const handleNotesSync       = ({ content }) => setSharedNotes(content);
    const handlePartnerLeft     = ()             => setPartnerLeft(true);
    const handlePartnerCompleted = ()            => setPartnerCompleted(true);
    const handleAgenda          = (data)         => {
      console.log('Agenda received:', data);
      setAgenda(data.agenda);
    };

    socket.on('room:ready',                 handleRoomReady);
    socket.on('chat:broadcast',             handleChatBroadcast);
    socket.on('notes:sync',                 handleNotesSync);
    socket.on('room:partner_left',          handlePartnerLeft);
    socket.on('session:partner_completed',  handlePartnerCompleted);
    socket.on('session:agenda',             handleAgenda);

    return () => {
      socket.off('room:ready',                handleRoomReady);
      socket.off('chat:broadcast',            handleChatBroadcast);
      socket.off('notes:sync',                handleNotesSync);
      socket.off('room:partner_left',         handlePartnerLeft);
      socket.off('session:partner_completed', handlePartnerCompleted);
      socket.off('session:agenda',            handleAgenda);
    };
  }, [roomId, user]);

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

  useEffect(() => {
    const handleMatchDeclined = () => {
      console.log('[Session] match:declined received — partner declined, redirecting');
      navigate('/lobby');
    };
    socket.on('match:declined', handleMatchDeclined);
    return () => socket.off('match:declined', handleMatchDeclined);
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleSendMessage = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputText.trim()) return;
    const payload = {
      roomId,
      message:    inputText.trim(),
      senderId:   user.id,
      senderName: user.username,
      timestamp:  new Date().toISOString(),
    };
    socket.emit('chat:message', payload);
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
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('notes:update', { roomId, content: val });
    }, 500);
  };

  const handleCompleteSession = () => {
    socket.emit('session:complete', { roomId, userId: user.id });
    setCompletionPending(true);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }

    const base = { roomId, senderId: user.id, senderName: user.username, message: '' };

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const payload = { ...base, imageData: reader.result };
        socket.emit('chat:message', payload);
        setMessages((prev) => [...prev, { ...payload, text: '', timestamp: new Date().toISOString() }]);
      };
      reader.readAsDataURL(file);
    } else {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: formData });
        const json = await response.json();
        if (json.status !== 'success' || !json.data?.url) throw new Error('Upload failed');
        const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        const payload = { ...base, fileUrl: directUrl, fileName: file.name };
        socket.emit('chat:message', payload);
        setMessages((prev) => [...prev, { ...payload, text: '', timestamp: new Date().toISOString() }]);
      } catch (err) {
        console.error(err);
        alert('File upload failed. Please try again.');
      }
    }
  };

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
                  sessionStatus === 'waiting'   ? '#ea580c' :
                  sessionStatus === 'active'    ? '#22c55e' : '#3b82f6',
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

      {/* Rating Modal */}
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

      {/* Completion Pending Banner */}
      {completionPending && sessionStatus !== 'completed' && (
        <div style={styles.pendingBanner}>
          Waiting... You marked this complete — waiting for your partner to also click Complete...
        </div>
      )}

      {/* Partner Completed Banner */}
      {partnerCompleted && !completionPending && sessionStatus !== 'completed' && (
        <div style={styles.partnerCompletedBanner}>
          <CheckCircleIcon /> Your partner marked the session complete. Click <strong>Mark as Complete</strong> to finish!
        </div>
      )}

      <div style={styles.mainContent} className="session-main-content">

        {/* Mobile Tab Toggle */}
        <div className="mobile-only" style={styles.mobileTabNav}>
          <button
            style={{
              ...styles.mobileTabBtn,
              borderBottom: mobileTab === 'chat' ? '2px solid var(--accent)' : '2px solid transparent',
              color: mobileTab === 'chat' ? 'var(--text)' : 'var(--text-muted)',
            }}
            onClick={() => setMobileTab('chat')}
          >
            <MessageSquare size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Chat
          </button>
          <button
            style={{
              ...styles.mobileTabBtn,
              borderBottom: mobileTab === 'notes' ? '2px solid var(--accent)' : '2px solid transparent',
              color: mobileTab === 'notes' ? 'var(--text)' : 'var(--text-muted)',
            }}
            onClick={() => setMobileTab('notes')}
          >
            <FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Notes {agenda && !agendaDismissed && '*'}
          </button>
        </div>

        {/* Left Panel: Chat */}
        <div style={styles.leftPanel} className={mobileTab === 'chat' ? 'session-panel-active' : 'session-panel-hidden'}>
          <div style={styles.chatBox} className="session-chat-box">
            {messages.map((m, i) => {
              const isSelf = m.senderId === user?.id;
              return (
                <div key={i} style={isSelf ? styles.msgSelfRow : styles.msgOtherRow}>
                  <div style={isSelf ? styles.msgSelf : styles.msgOther}>
                    <p style={styles.msgName}>{isSelf ? 'You' : m.senderName}</p>

                    {m.imageData && (
                      <a href={m.imageData} target="_blank" rel="noreferrer">
                        <img src={m.imageData} alt="shared" style={styles.msgImage} />
                      </a>
                    )}

                    {m.fileUrl && (
                      <div style={styles.fileCard}>
                        <Paperclip size={18} color="var(--text-muted)" />
                        <div>
                          <p style={styles.fileName}>{m.fileName}</p>
                          <a href={m.fileUrl} target="_blank" rel="noreferrer" style={styles.fileLink}>
                            Download
                          </a>
                        </div>
                      </div>
                    )}

                    {m.text && <p style={styles.msgText}>{m.text}</p>}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div style={styles.chatInputContainer} className="session-msg-input-container">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              style={styles.attachBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={sessionStatus === 'completed'}
              title="Attach file"
            >
              <Paperclip size={18} color="var(--text-muted)" />
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

        {/* Right Panel: Notes */}
        <div style={styles.rightPanel} className={mobileTab === 'notes' ? 'session-panel-active' : 'session-panel-hidden'}>
          {/* Agenda Card */}
          {agenda && !agendaDismissed && (
            <div style={styles.agendaCard}>
              <div style={styles.agendaHeader}>
                <span
                  style={styles.agendaTitle}
                  onClick={() => setAgendaCollapsed(c => !c)}
                >
                  <FileText size={16} style={{ marginRight: '6px' }} />
                  Session Agenda (AI Generated){' '}
                  <span style={styles.agendaToggle}>{agendaCollapsed ? '▶' : '▼'}</span>
                </span>
                <button
                  onClick={() => setAgendaDismissed(true)}
                  style={styles.closeAgendaBtn}
                  title="Dismiss Agenda"
                >
                  <X size={16} />
                </button>
              </div>
              {!agendaCollapsed && (
                <div style={styles.agendaBody}>{agenda}</div>
              )}
            </div>
          )}

          <div style={styles.notesHeader}>
            <h3 style={styles.notesTitle}>
              <FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Shared Notes
            </h3>
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
                cursor:  (sessionStatus !== 'active' || completionPending) ? 'not-allowed' : 'pointer',
              }}
              disabled={sessionStatus !== 'active' || completionPending}
            >
              {completionPending ? 'Marked Complete' : 'Mark as Complete ✓'}
            </button>
          </div>
        </div>
      </div>

      {/* Completion Overlay */}
      {sessionStatus === 'completed' && (
        <div style={styles.overlay}>
          <div style={styles.modalCard}>
            <h2 style={styles.modalTitle}>Session Complete!</h2>
            <p style={styles.modalSub}>
              Great job learning and sharing! You've earned <strong>+1 credit</strong>.
            </p>
            <button onClick={() => navigate('/lobby')} style={styles.returnBtn}>
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CheckCircleIcon = () => (
  <span style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }}>✓</span>
);

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    overflow: 'hidden',
    transition: 'background-color 0.25s ease',
  },
  topBar: {
    height: '60px',
    marginTop: '64px',
    backgroundColor: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
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
    color: 'var(--text)',
  },
  statusBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fff',
  },
  partnerInfo: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  partnerLeftBanner: {
    backgroundColor: 'rgba(220,38,38,0.08)',
    color: '#dc2626',
    border: '1px solid rgba(220,38,38,0.2)',
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
    borderRight: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
  },
  chatBox: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  msgSelfRow:  { display: 'flex', justifyContent: 'flex-end' },
  msgOtherRow: { display: 'flex', justifyContent: 'flex-start' },
  msgSelf: {
    backgroundColor: 'var(--msg-self-bg)',
    color: 'var(--msg-self-text)',
    padding: '0.8rem',
    borderRadius: '12px 12px 0 12px',
    maxWidth: '75%',
    wordBreak: 'break-word',
  },
  msgOther: {
    backgroundColor: 'var(--msg-other-bg)',
    color: 'var(--msg-other-text)',
    padding: '0.8rem',
    borderRadius: '12px 12px 12px 0',
    maxWidth: '75%',
    wordBreak: 'break-word',
    border: '1px solid var(--border)',
  },
  msgName: { margin: '0 0 0.3rem 0', fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 },
  msgText: { margin: 0, fontSize: '0.95rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' },
  chatInputContainer: {
    padding: '1rem',
    backgroundColor: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    gap: '0.8rem',
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '0.8rem',
    resize: 'none',
    height: '60px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '0 1.5rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  attachBtn: {
    backgroundColor: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '0 0.8rem',
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
    backgroundColor: 'var(--surface-2)',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    marginTop: '0.3rem',
  },
  fileName: {
    margin: 0,
    fontSize: '0.85rem',
    color: 'var(--text)',
    fontWeight: 500,
    wordBreak: 'break-all',
  },
  fileLink: {
    color: 'var(--accent)',
    fontSize: '0.8rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
  rightPanel: {
    flex: '40%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--surface-2)',
  },
  notesHeader: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesTitle:  { margin: 0, fontSize: '1rem', color: 'var(--text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center' },
  notesSub:    { fontSize: '0.75rem', color: 'var(--text-muted)' },
  notesArea: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    padding: '1.5rem',
    color: 'var(--text)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  completeBox: {
    padding: '1.5rem',
    borderTop: '1px solid var(--border)',
    textAlign: 'center',
  },
  completeBtn: {
    width: '100%',
    padding: '1rem',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'opacity 0.2s',
  },
  agendaCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderLeft: '4px solid var(--accent)',
    borderRadius: '8px',
    margin: '1rem',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  agendaHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.8rem 1rem',
    backgroundColor: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
  },
  agendaTitle: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--text)',
    cursor: 'pointer',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  agendaToggle: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  closeAgendaBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 0.2rem',
    transition: 'color 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  agendaBody: {
    padding: '1rem',
    color: 'var(--text)',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  pendingBanner: {
    backgroundColor: '#f59e0b',
    borderBottom: '1px solid #d97706',
    color: '#142d4c',
    padding: '0.9rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    textAlign: 'center',
    letterSpacing: '0.01em',
    flexShrink: 0,
  },
  partnerCompletedBanner: {
    backgroundColor: 'var(--accent)',
    borderBottom: '1px solid var(--border)',
    color: 'var(--tag-offered-text)',
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
    backgroundColor: 'var(--overlay-bg)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    padding: '3rem',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: 'var(--card-shadow)',
  },
  modalTitle:  { color: 'var(--text)',       margin: '0 0 1rem 0',  fontSize: '2rem', fontWeight: 700 },
  modalSub:    { color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.1rem' },
  returnBtn: {
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  mobileTabNav: {
    display: 'none',
    width: '100%',
    backgroundColor: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    justifyContent: 'space-between',
  },
  mobileTabBtn: {
    flex: 1,
    padding: '12px 0',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'color 0.15s, border-bottom-color 0.15s',
  },
};

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
