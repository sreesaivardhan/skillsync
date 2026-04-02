// React context providing logged-in user state and auth actions across the app

import { createContext, useContext, useEffect, useState } from 'react';
import socket from '../socket';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Rehydrate from localStorage on page refresh
    const saved = localStorage.getItem('ss_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('ss_token') ?? null);

  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem('ss_user');
    return saved ? JSON.parse(saved).credits ?? 10 : 10;
  });

  // ── login ────────────────────────────────────────────────────────────────────
  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setCredits(userData.credits ?? 10);

    // Persist to localStorage for refresh survival
    localStorage.setItem('ss_user', JSON.stringify(userData));
    localStorage.setItem('ss_token', authToken);

    // Connect socket and register presence
    socket.auth = { userId: userData._id || userData.id };
    socket.connect();

    const registerPayload = {
      userId: userData._id || userData.id,
      username: userData.username,
      skillsOffered: userData.skillsOffered,
      skillsWanted: userData.skillsWanted,
      credits: userData.credits,
    };
    
    console.log('Registering socket with:', userData);
    console.log('user:register emit payload (login):', registerPayload);
    socket.emit('user:register', registerPayload);
  };

  // ── logout ───────────────────────────────────────────────────────────────────
  const logout = () => {
    socket.disconnect();

    setUser(null);
    setToken(null);
    setCredits(10);

    localStorage.removeItem('ss_user');
    localStorage.removeItem('ss_token');
  };

  // ── Live credit updates from server ─────────────────────────────────────────
  useEffect(() => {
    const handleCreditUpdate = ({ userId, newBalance }) => {
      if (user && String(userId) === String(user.id)) {
        setCredits(newBalance);

        // Keep localStorage in sync
        const updated = { ...user, credits: newBalance };
        localStorage.setItem('ss_user', JSON.stringify(updated));
        setUser(updated);
      }
    };

    socket.on('credit:update', handleCreditUpdate);

    return () => {
      socket.off('credit:update', handleCreditUpdate);
    };
  }, [user]);

  // ── Re-register presence if socket reconnects (e.g. after page refresh) ─────
  useEffect(() => {
    if (!user) return;

    const handleConnect = () => {
      const registerPayload = {
        userId: user._id || user.id,
        username: user.username,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted,
        credits: user.credits || credits,
      };
      
      console.log('user:register emit payload (reconnect):', registerPayload);
      socket.emit('user:register', registerPayload);
    };

    // If already connected on mount (rehydrated session), re-register
    if (!socket.connected) {
      socket.auth = { userId: user.id };
      socket.connect();
    } else {
      handleConnect();
    }

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UserContext.Provider value={{ user, token, credits, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

// ── Custom hook ───────────────────────────────────────────────────────────────
export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
};
