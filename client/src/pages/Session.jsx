// Page component for an active skill-exchange session between two matched users

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import { useUser } from '../context/UserContext';
import Navbar from '../components/Navbar';

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

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Sockets & Event Listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || !roomId) return;

    socket.emit('room:join', { roomId, userId: user.id });

    const handleRoomReady = () => setSessionStatus('active');

    const handleChatBroadcast = (msg) => {
      // Map both `msg.message` and `msg.text` safely to `text`
      setMessages((prev) => [...prev, { ...msg, text: msg.message }]);
    };

    const handleNotesSync = ({ content }) => setSharedNotes(content);

    const handleSessionConfirmed = () => setSessionStatus('completed');

    const handlePartnerLeft = () => setPartnerLeft(true);

    socket.on('room:ready', handleRoomReady);
    socket.on('chat:broadcast', handleChatBroadcast);
    socket.on('notes:sync', handleNotesSync);
    socket.on('session:confirmed', handleSessionConfirmed);
    socket.on('room:partner_left', handlePartnerLeft);

    return () => {
      socket.off('room:ready', handleRoomReady);
      socket.off('chat:broadcast', handleChatBroadcast);
      socket.off('notes:sync', handleNotesSync);
      socket.off('session:confirmed', handleSessionConfirmed);
      socket.off('room:partner_left', handlePartnerLeft);
    };
  }, [roomId, user]);

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
              Partner: {roomId ? (roomId.split('_')[1] === user.id ? 'Host' : 'Guest') : '...'}
            </span>
          </div>

          {partnerLeft && (
            <div style={styles.partnerLeftBanner}>Your partner disconnected</div>
          )}
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Left Panel: Chat (60%) */}
        <div style={styles.leftPanel}>
          <div style={styles.chatBox}>
            {messages.map((m, i) => {
              const isSelf = m.senderId === user?.id;
              return (
                <div key={i} style={isSelf ? styles.msgSelfRow : styles.msgOtherRow}>
                  <div style={isSelf ? styles.msgSelf : styles.msgOther}>
                    <p style={styles.msgName}>
                      {isSelf ? 'You' : m.senderName}
                    </p>
                    <p style={styles.msgText}>{m.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div style={styles.chatInputContainer}>
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
        <div style={styles.rightPanel}>
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
            {completionPending ? (
              <p style={styles.pendingText}>Waiting for partner to confirm...</p>
            ) : (
              <button
                onClick={handleCompleteSession}
                style={{
                  ...styles.completeBtn,
                  opacity: sessionStatus !== 'active' ? 0.5 : 1,
                }}
                disabled={sessionStatus !== 'active'}
              >
                Complete Session
              </button>
            )}
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
    backgroundColor: '#22c55e',
    color: '#fff',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  pendingText: {
    color: '#eab308',
    fontWeight: 600,
    margin: 0,
    fontSize: '0.95rem',
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
};

export default Session;
