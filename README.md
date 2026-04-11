# SkillSync — Real-time Skill Exchange Platform

> A peer-to-peer skill exchange platform enabling real-time session matching, collaborative learning, and mutual accountability through a credit-based reciprocity system.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-skillsync--nine--mauve.vercel.app-teal?style=for-the-badge)](https://skillsync-nine-mauve.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge)](https://skillsync-server-2y9f.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## Deployment

| Service | URL |
|---|---|
| Frontend | https://skillsync-nine-mauve.vercel.app |
| Backend API | https://skillsync-server-2y9f.onrender.com |

---

## Overview

SkillSync is a full-stack, real-time web application built to facilitate structured skill exchange between users. The platform matches individuals based on complementary skill profiles, connects them in private session rooms, and enforces mutual accountability through an atomic credit system. It incorporates AI-generated session guidance, collaborative tools, and a reputation framework designed to sustain long-term peer engagement.

---

## Features

### Real-time Infrastructure
- **Live Lobby Presence** — WebSocket-driven online user registry; reflects join/leave events instantly without polling
- **Complementary Skill Matching** — server-side algorithm matches users whose `skillsOffered` intersect with the counterpart's `skillsWanted`
- **Session Rooms** — private, bidirectional chat channels with typing indicators per active session
- **File and Image Sharing** — Base64-encoded file transfer over Socket.io within active session rooms
- **Shared Notes** — collaborative notepad synchronized in real time between session participants
- **Atomic Credit System** — credits are exchanged only upon mutual session completion, preventing partial or disputed transactions

### Platform-Specific Capabilities
- **Skill Debt Tracker** — records outstanding reciprocal session obligations between users; enforces accountability unique to this platform
- **Skill Gap Radar Chart** — Chart.js radar visualization comparing a user's skill coverage against aggregated community demand across the top 8 skills; unlocks after three completed sessions
- **Reputation Score System** — cumulative peer rating computed as a running average from post-session evaluations, supplemented by endorsement tags
- **Post-Session Rating Modal** — structured 5-star rating interface with optional skill endorsement selection

### AI-Assisted Features *(activated with a valid Gemini API key)*
- **Match Explainer** — AI-generated two-sentence rationale surfaced in the match notification, describing why a given user pair is mutually beneficial
- **Session Agenda Generator** — AI-generated three-step, 30-minute structured agenda presented at session start; collapsible and dismissible by the user

---

## Tech Stack

| Technology | Role |
|---|---|
| React 18 + Vite | Frontend single-page application |
| Node.js + Express 5 | REST API server |
| Socket.io 4 | Real-time bidirectional communication |
| MongoDB + Mongoose | Database and object-document mapping |
| JWT + bcryptjs | Authentication and password hashing |
| Chart.js + react-chartjs-2 | Skill radar visualization |
| Google Gemini API | AI match explanation and session agenda generation |
| Vercel | Frontend deployment |
| Render | Backend deployment |
| MongoDB Atlas | Cloud-hosted database |

---

## Local Setup

### Prerequisites
- Node.js 18 or higher
- MongoDB running locally on port 27017
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/sreesaivardhan/skillsync.git
cd skillsync
```

### 2. Install Dependencies
```bash
# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install
```

### 3. Configure Environment Variables

Create `server/.env` with the following:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/skillsync_db
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Start the Application

```bash
# Terminal 1 — Backend server
cd server && npm run dev

# Terminal 2 — Frontend dev server
cd client && npm run dev
```

### 5. Access in Browser

```
http://localhost:5173
```

---

## Database Schema

| Collection | Description |
|---|---|
| `users` | Authentication credentials, `skillsOffered`, `skillsWanted`, credit balance, and reputation score |
| `sessions` | Session records including participants, status, and timestamps |
| `skilldebts` | Tracks reciprocal session obligations between user pairs |
| `ratings` | Post-session star ratings and associated skill endorsements |

---

## Socket Event Reference

| Event | Direction | Payload | Description |
|---|---|---|---|
| `user:online` | Client → Server | `{ userId, skills }` | Registers the user as active in the lobby |
| `lobby:update` | Server → Client | `[onlineUsers]` | Broadcasts the updated online user list |
| `match:request` | Client → Server | `{ targetUserId }` | Initiates a match request to a specific user |
| `match:found` | Server → Client | `{ roomId, partner, matchExplanation }` | Notifies both users of a successful match |
| `match:accept` | Client → Server | `{ roomId }` | Confirms acceptance of a pending match |
| `match:decline` | Client → Server | `{ roomId }` | Rejects a pending match request |
| `match:declined` | Server → Client | `{ message }` | Notifies the initiating user of a declined match |
| `room:join` | Client → Server | `{ roomId }` | Joins an established session room |
| `room:ready` | Server → Client | `{ sessionId, partnerName }` | Signals that both participants are connected and the session has begun |
| `session:agenda` | Server → Client | `{ agenda }` | Delivers the AI-generated session agenda |
| `chat:message` | Client → Server | `{ roomId, message, type }` | Sends a message or file within a session room |
| `chat:message` | Server → Client | `{ sender, message, type, timestamp }` | Broadcasts a message to all participants in the room |
| `notes:update` | Client → Server | `{ roomId, content }` | Submits a shared notes update |
| `notes:update` | Server → Client | `{ content }` | Broadcasts the updated notes to the session partner |
| `session:end` | Client → Server | `{ roomId, sessionId }` | Signals session termination |
| `session:confirmed` | Server → Client | `{ credits, sessionId }` | Confirms session persistence and credit transfer |
| `debt:update` | Server → Client | `{ debts }` | Refreshes the skill debt tracker on the client |

---

## Contributors

| Contributor | Responsibilities |
|---|---|
| [sreesaivardhan](https://github.com/sreesaivardhan) | Socket architecture, real-time matching engine, session rooms, lobby interface, Skill Debt Tracker, deployment |
| [yeshaswi-m](https://github.com/yeshaswi-m) | Authentication system, data models, React components, REST API routes, Skill Gap Radar Chart, rating system |

---

## License

MIT © 2026 SkillSync
