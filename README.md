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

# =================================================================
# 1. MOUNT GOOGLE DRIVE TO SAVE THE MODEL PERMANENTLY
# =================================================================
try:
    from google.colab import drive
    print("Mounting Google Drive to persist the model...")
    drive.mount('/content/drive')
    
    # Create a folder in your Drive to store the model
    models_dir = '/content/drive/MyDrive/ollama_models'
    os.makedirs(models_dir, exist_ok=True)
    
    # Tell Ollama to save and load models from Google Drive!
    os.environ["OLLAMA_MODELS"] = models_dir
    print(f"Ollama models will be saved to/loaded from: {models_dir}")
except ImportError:
    print("Not running in Google Colab. Skipping Drive mount.")

print("\nInstalling Ollama & pyngrok...")

# Install zstd, a dependency for Ollama installation
subprocess.run(["sudo", "apt-get", "install", "-y", "zstd"], capture_output=True, text=True)

# Install Ollama
install_command = "curl -fsSL https://ollama.com/install.sh | sh"
install_result = subprocess.run(install_command, shell=True, capture_output=True, text=True)
if install_result.returncode != 0:
    raise RuntimeError("Ollama installation failed.")

time.sleep(2)

# Install pyngrok
os.system("pip install -q pyngrok")

print("\n\n========================================================")
print("🚨 NGROK REQUIRES A FREE AUTHTOKEN")
print("1. Go to https://dashboard.ngrok.com/tunnels/authtokens")
print("2. Copy the token and paste it in the box below!")
print("========================================================\n")

ngrok_token = input("Paste your Ngrok Authtoken here: ")

from pyngrok import ngrok, conf
conf.get_default().auth_token = ngrok_token.strip()

ollama_path = shutil.which("ollama") or "/usr/local/bin/ollama"

print(f"\nStarting Ollama server...")
global ollama_process
env = os.environ.copy()
env["OLLAMA_ORIGINS"] = "*"

try:
    # Start the background process
    ollama_process = subprocess.Popen([ollama_path, "serve"], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(5)
    if ollama_process.poll() is not None:
        raise RuntimeError("Ollama server failed to start.")
    print("Ollama server started successfully.")
except Exception as e:
    raise

# =================================================================
# 2. PULL MODEL (WILL BE INSTANT IF ALREADY IN GOOGLE DRIVE)
# =================================================================
print("Checking for Llama3:8b model (Will download ONLY if it's not in your Google Drive)...")
pull_command = f"{ollama_path} pull llama3:8b"
pull_result = subprocess.run(pull_command, shell=True, capture_output=True, text=True)
if pull_result.returncode != 0:
    raise RuntimeError(f"Llama3:8b model pull failed: {pull_result.stderr}")
else:
    print("Llama3:8b model is ready!")

print("Exposing port 11434 via Ngrok...")
options = {"host_header": "localhost", "bind_tls": True}

max_retries = 5
for i in range(max_retries):
    try:
        public_url = ngrok.connect(11434, **options).public_url
        print("Ngrok tunnel established.")
        break
    except Exception as e:
        print(f"Attempt {i+1}/{max_retries}: Ngrok connection failed: {e}")
        time.sleep(5)

print("\n\n========================================================")
print("✅ SUCCESS! YOUR PUBLIC AI URL IS:\n")
print(f"{public_url}")
print("\nCopy the URL above and paste it into your .env file!")
print("========================================================\n")

try:
    while True:
        time.sleep(3600)
except KeyboardInterrupt:
    print("Stopping server...")
    if 'ollama_process' in globals() and ollama_process.poll() is None:
        ollama_process.kill()
    if 'ngrok' in globals() and ngrok.get_tunnels():
        ngrok.kill()
    print("Server stopped.")
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
