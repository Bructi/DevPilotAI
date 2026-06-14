# DevPilot AI 🚀

> **AI-Powered Software Development & Project Management Platform**
> Built with React + Vite, Node.js + Express, MongoDB + MySQL, Python FastAPI + LangChain + Ollama (via Google Colab)

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB (running locally on port 27017)
- XAMPP (for MySQL — start before the server for auth to work)
- Google Colab Account (for offloading the AI Model)
- Ngrok Account (for the AI Tunnel)

### 1. Install All Dependencies

```bash
# Install Node.js dependencies (root + server + client)
npm run install:all

# Install Python dependencies (AI engine)
cd ai-engine
pip install -r requirements.txt
cd ..
```

### 2. Set Up the AI Engine (Google Colab & Ngrok)

Since running Llama 3 locally requires heavy RAM, DevPilot AI offloads the AI inference to Google Colab's free GPUs using an Ngrok tunnel.

1. Go to [Ngrok](https://dashboard.ngrok.com/signup) and get a free Authtoken.
2. Open a new **Google Colab Notebook**.
3. Paste the following script and run it:

```python
import subprocess
import time
import os
import shutil

print("Installing Ollama & pyngrok...")
os.system("wget -q https://ollama.com/install.sh")
os.system("sh install.sh")
time.sleep(2)
os.system("pip install -q pyngrok")

ngrok_token = input("Paste your Ngrok Authtoken here: ")

from pyngrok import ngrok, conf
conf.get_default().auth_token = ngrok_token.strip()

ollama_path = shutil.which("ollama") or "/usr/local/bin/ollama"
if not os.path.exists(ollama_path) and os.path.exists("/usr/bin/ollama"):
    ollama_path = "/usr/bin/ollama"

print(f"\nStarting Ollama server from {ollama_path}...")
global ollama_process
env = os.environ.copy()
env["OLLAMA_ORIGINS"] = "*"
ollama_process = subprocess.Popen([ollama_path, "serve"], env=env)
time.sleep(5)

print("Downloading Llama3:8b model (this takes ~1-2 mins)...")
os.system(f"{ollama_path} pull llama3:8b")

print("Exposing port 11434 via Ngrok...")
options = {"host_header": "localhost", "bind_tls": True}
public_url = ngrok.connect(11434, **options).public_url

print("\n\n✅ SUCCESS! YOUR PUBLIC AI URL IS:\n")
print(f"{public_url}")

try:
    while True:
        time.sleep(3600)
except KeyboardInterrupt:
    ollama_process.kill()
    ngrok.kill()
```

### 3. Environment Variables

Both `.env` files must be configured:

- `server/.env` — MongoDB, MySQL (XAMPP), JWT, Google OAuth, Email, Backend Port (5000)
- `ai-engine/.env` — Must point to your new Ngrok Tunnel URL:
  ```env
  AI_API_KEY=ollama
  AI_MODEL=llama3:8b
  AI_BASE_URL=https://your-url.ngrok-free.app/v1
  ```

### 4. Setup MySQL (XAMPP)

1. Open **XAMPP Control Panel** → Start **Apache** and **MySQL**
2. Go to `http://localhost/phpmyadmin`
3. Create a new database named `devpilot_ai`
4. Tables are auto-created on first server startup

### 5. Start Development Servers

**Start all 3 services (recommended):**

```bash
# Terminal 1 - Backend Server (Port 5000)
cd server && npx nodemon server.js

# Terminal 2 - AI Engine (Port 8000)
cd ai-engine && python main.py

# Terminal 3 - Frontend (Port 5173)
cd client && npm run dev
```

### URLs

| Service       | URL                                 |
| ------------- | ----------------------------------- |
| Frontend      | http://localhost:5173               |
| Backend API   | http://localhost:5000/api           |
| AI Engine     | http://localhost:8000               |
| Server Health | http://localhost:5000/api/health    |

---

## Architecture

```text
DevpilotAI/
├── client/          # React 19 + Vite 8 + Tailwind CSS 4 frontend
│   ├── src/
│   │   ├── pages/   # Application routes including Project Detail pages
│   │   ├── services/# Axios API instances + Socket.IO real-time clients
│   │   └── store/   # Zustand 5 state management
├── server/          # Node.js + Express 5 backend
│   ├── src/
│   │   ├── config/  # Dual-DB connections (MongoDB Mongoose + MySQL Sequelize)
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/  # Unified Mongoose & Sequelize schemas
│   │   ├── routes/  # Express REST API Routes
│   │   └── sockets/ # Socket.IO namespace & events
│   └── server.js
├── ai-engine/       # Python FastAPI Backend
│   ├── main.py      # LangChain + OpenAI-compatible wrapper endpoints
│   ├── .env         # Ngrok Tunnel config
│   └── requirements.txt
└── database/        # MySQL Database bootstrap scripts
```

## Tech Stack

| Layer     | Technologies                                                                               |
| --------- | ------------------------------------------------------------------------------------------ |
| Frontend  | React 19, Vite 8, Tailwind CSS 4, Framer Motion, React Query 5, Zustand 5, DnD Kit         |
| Backend   | Node.js, Express 5, Socket.IO 4, JWT, Passport.js                                          |
| Databases | MongoDB 9 (NoSQL) + MySQL 8 via Sequelize (SQL)                                            |
| AI Engine | Python 3.11, FastAPI, LangChain 0.3, LangChain-OpenAI, Ollama (LLaMA 3:8b), pyngrok Tunnel |

## Features

- ✅ **Authentication:** JWT + Google OAuth + MySQL Users
- ✅ **Project Management:** Full CRUD, dynamic tracking
- ✅ **Kanban Board:** Interactive Drag & Drop via `@dnd-kit`
- ✅ **Real-time Engine:** Socket.IO integrated chat & presence
- ✅ **AI Chat Assistant:** Local LLaMA 3 integration via Google Colab offloading
- ✅ **AI Document Generator:** Generates SRS, PRDs, READMEs natively
- ✅ **AI Sprint Planner:** Auto-analyzes backlog into logical phases
- ✅ **Dual Database Architecture:** High-performance MongoDB vs structured MySQL
- ✅ Responsive AMOLED / Dark mode design
