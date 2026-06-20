# DevPilot AI 🚀

> **AI-Powered Software Development & Project Management Platform**
> Built with React 19 + Vite 8, Node.js + Express 5, MongoDB + SQLite, Python FastAPI + LangChain + Groq (Llama 3)

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB (running locally on port 27017)
- Groq API Key (for the Free AI Engine)

> **No XAMPP or MySQL required!** We recently migrated to SQLite for seamless local authentication out-of-the-box.

### 1. Install All Dependencies

```bash
# Install Node.js dependencies (root + server + client)
npm run install:all

# Install Python dependencies (AI engine)
cd ai-engine
pip install -r requirements.txt
cd ..
```

### 2. Set Up the AI Engine (Groq)

DevPilot AI uses Groq to run LLaMA 3 instantly and for free.

1. Go to [Groq Console](https://console.groq.com/keys) and sign in.
2. Create a new API Key.

### 3. Environment Variables

Both `.env` files must be configured:

- `server/.env` — MongoDB URI, JWT Secret, Google OAuth, Email, Backend Port (5000)
- `ai-engine/.env` — Must point to Groq's OpenAI-compatible endpoint:
  ```env
  AI_API_KEY=gsk_your_groq_api_key_here
  AI_MODEL=llama-3.1-8b-instant
  AI_BASE_URL=https://api.groq.com/openai/v1
  ```

### 4. Database Setup

DevPilot AI uses **SQLite** for Authentication & Roles, and **MongoDB** for Projects & AI Data.
The SQLite database automatically creates itself (`devpilot_ai.sqlite`) on server startup.

**To load the initial MongoDB project data:**
```bash
cd server
npm run db:import
```
*(This loads all projects, tasks, and conversations from `mongo_data.json` into your local MongoDB. To save new data before committing to GitHub, run `npm run db:export`)*

### 5. Start Development Servers

**Start all 3 services (recommended):**

```bash
# Terminal 1 - Backend Server (Port 5000)
cd server && npm run dev

# Terminal 2 - AI Engine (Port 8000)
cd ai-engine && python main.py

# Terminal 3 - Frontend (Port 5173)
cd client && npm run dev
```

### URLs

| Service       | URL                              |
| ------------- | -------------------------------- |
| Frontend      | http://localhost:5173            |
| Backend API   | http://localhost:5000/api        |
| AI Engine     | http://localhost:8000            |
| Server Health | http://localhost:5000/api/health |

---

## Architecture

```text
DevpilotAI/
├── client/          # React 19 + Vite 8 + Tailwind CSS 4 frontend
│   ├── src/
│   │   ├── pages/   # Application routes including Project & Team pages
│   │   ├── services/# Axios API instances + Socket.IO real-time clients
│   │   └── store/   # Zustand 5 state management
├── server/          # Node.js + Express 5 backend
│   ├── scripts/     # DB Sync scripts (export-db.js, import-db.js)
│   ├── src/
│   │   ├── config/  # Dual-DB connections (MongoDB Mongoose + SQLite Sequelize)
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/  # Unified Mongoose & Sequelize schemas
│   │   ├── routes/  # Express REST API Routes
│   │   └── sockets/ # Socket.IO namespace & events
│   └── server.js
├── ai-engine/       # Python FastAPI Backend
│   ├── main.py      # LangChain + OpenAI-compatible wrapper endpoints
│   ├── .env         # API config
│   └── requirements.txt
└── database/        # Database bootstrap scripts
```

## Tech Stack

| Layer     | Technologies                                                                               |
| --------- | ------------------------------------------------------------------------------------------ |
| Frontend  | React 19, Vite 8, Tailwind CSS 4, Framer Motion, React Query 5, Zustand 5, DnD Kit, Excalidraw |
| Backend   | Node.js, Express 5, Socket.IO 4, JWT, Passport.js                                          |
| Databases | MongoDB (NoSQL) + SQLite via Sequelize (SQL)                                             |
| AI Engine | Python 3.11, FastAPI, LangChain 0.3, LangChain-OpenAI, Groq (LLaMA 3 8B)                 |

## Features

- ✅ **Authentication:** JWT + Google OAuth + SQLite Users
- ✅ **Database Sync:** Custom `npm run db:export` & `import` for seamless team data sharing via GitHub
- ✅ **GitHub Integration:** Import existing GitHub repositories directly into DevPilot AI as new projects
- ✅ **Kanban Board:** Interactive Drag & Drop via `@dnd-kit` with dynamic resizing
- ✅ **AI Task Breakdown:** Instantly breaks complex tasks into actionable subtasks via AI
- ✅ **Team Collaboration Workspace:** Complete split-pane workspace with integrated real-time Excalidraw whiteboards
- ✅ **Team Access Control:** Send email invitations, requiring members to officially accept/reject via notifications
- ✅ **Role Management:** Owner, Admin, and Member permissions
- ✅ **Real-time Team Chat:** Dedicated Socket.IO-powered chat rooms per team
- ✅ **Global Notification System:** Real-time bell notifications (invites, mentions, chat updates)
- ✅ **AI Chat Assistant:** Lightning-fast LLaMA 3 integration via Groq for coding help and technical guidance
- ✅ **AI Document Generator:** Generates SRS, PRDs, READMEs natively
- ✅ **AI Sprint Planner:** Auto-analyzes backlog into logical phases
- ✅ **Dual Database Architecture:** High-performance MongoDB vs zero-config structured SQLite
- ✅ Responsive AMOLED / Dark mode design
