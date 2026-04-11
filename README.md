# SkillSync — Real-time Skill Exchange Platform

> *Exchange skills. Build together. In real time.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-skillsync--nine--mauve.vercel.app-teal?style=for-the-badge)](https://skillsync-nine-mauve.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge)](https://skillsync-server-2y9f.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| **Frontend** | https://skillsync-nine-mauve.vercel.app |
| **Backend API** | https://skillsync-server-2y9f.onrender.com |

---

## ✨ Features

### ⚡ Real-time Core
- 🟢 **Live Lobby Presence** — see who's online in real time via WebSocket
- 🎯 **Complementary Skill Matching** — matches users whose skillsOffered ↔ skillsWanted overlap
- 💬 **Session Rooms** — private bidirectional chat with typing indicators
- 📁 **File & Image Sharing** — send files and images inside sessions via Base64 socket encoding
- 📝 **Shared Notes** — collaborative note pad synced live between both users
- 🪙 **Atomic Credit System** — credits exchanged only on mutual session completion

### 🔥 Differentiators
- 📊 **Skill Debt Tracker** — tracks who owes whom a session; a reciprocity-accountability system unique to this platform
- 🕸️ **Skill Gap Radar Chart** — Chart.js radar visualizing your skill coverage vs community demand (top 8 skills), locked until 3 sessions
- ⭐ **Reputation Score System** — running average from post-session peer ratings with endorsement tags
- 🏅 **Rating Modal** — 5-star post-session ratings with optional skill endorsements

### 🤖 AI-Powered (GPT/Gemini Ready)
- 🤝 **Match Explainer** — AI-generated 2-sentence explanation of why two users complement each other, shown in the match notification
- 🗓️ **Session Agenda Generator** — AI-generated 3-step 30-minute agenda on session start, collapsible and dismissible
- *(AI features activate automatically when a valid Gemini API key is provided)*

---

## 🧱 Tech Stack

| Technology | Purpose |
|---|---|
| **React 18 + Vite** | Frontend SPA |
| **Node.js + Express 5** | REST API server |
| **Socket.io 4** | Real-time bidirectional communication |
| **MongoDB + Mongoose** | Database & ODM |
| **JWT + bcryptjs** | Auth & password hashing |
| **Chart.js + react-chartjs-2** | Skill Radar visualization |
| **Google Gemini API** | AI match explanation & session agenda |
| **Vercel** | Frontend deployment |
| **Render** | Backend deployment |
| **MongoDB Atlas** | Cloud database |

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017
- Git

### 1. Clone the repo
```bash
git clone https://github.com/sreesaivardhan/skillsync.git
cd skillsync
```

### 2. Install dependencies
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 3. Configure environment variables
Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/skillsync_db
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the app
```bash
# Terminal 1 — Start backend
cd server && npm run dev

# Terminal 2 — Start frontend
cd client && npm run dev
```

### 5. Open in browser
```
http://localhost:5173
```

---

## 🗄️ Database Collections

| Collection | Purpose |
|---|---|
| `users` | Auth credentials, skillsOffered, skillsWanted, credits, reputationScore |
| `sessions` | Session records, participants, status, timestamps |
| `skilldebts` | Tracks reciprocal session obligations between users |
| `ratings` | Post-session star ratings and skill endorsements |

---

## 🔌 Socket Events

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `user:online` | Client → Server | `{ userId, skills }` | Register user as online in lobby |
| `lobby:update` | Server → Client | `[onlineUsers]` | Broadcast updated online users list |
| `match:request` | Client → Server | `{ targetUserId }` | Initiate a match request |
| `match:found` | Server → Client | `{ roomId, partner, matchExplanation }` | Notify both users of a match |
| `match:accept` | Client → Server | `{ roomId }` | Accept a match |
| `match:decline` | Client → Server | `{ roomId }` | Decline a match |
| `match:declined` | Server → Client | `{ message }` | Notify accepting user that partner declined |
| `room:join` | Client → Server | `{ roomId }` | Join a session room |
| `room:ready` | Server → Client | `{ sessionId, partnerName }` | Both users connected, session starts |
| `session:agenda` | Server → Client | `{ agenda }` | AI-generated session agenda |
| `chat:message` | Client → Server | `{ roomId, message, type }` | Send a chat message or file |
| `chat:message` | Server → Client | `{ sender, message, type, timestamp }` | Broadcast message to room |
| `notes:update` | Client → Server | `{ roomId, content }` | Sync shared notes |
| `notes:update` | Server → Client | `{ content }` | Broadcast notes to partner |
| `session:end` | Client → Server | `{ roomId, sessionId }` | End the session |
| `session:confirmed` | Server → Client | `{ credits, sessionId }` | Session saved, credits updated |
| `debt:update` | Server → Client | `{ debts }` | Refresh skill debt tracker |

---

## 🤝 Contributors

| Contributor | Contributions |
|---|---|
| **[sreesaivardhan](https://github.com/sreesaivardhan)** | Socket architecture, real-time matching engine, session rooms, lobby UI, Skill Debt Tracker, deployment |
| **[yeshaswi-m](https://github.com/yeshaswi-m)** | Auth system, data models, React components, API routes, Radar Chart, Rating system |

---

## 📄 License

MIT © 2026 SkillSync
