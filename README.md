# 🙏 SevaSetu — Smart Disaster Response Platform

> A real-time volunteer coordination system for NGOs and disaster relief.  
> Built with **React**, **FastAPI**, **SQLite**, and **Leaflet Maps**.

---

## 📸 Architecture

```
promptwars/
├── .env                    ← Single config file (all secrets here)
├── .env.example            ← Template (safe to share)
├── backend/                ← Python FastAPI REST API
│   ├── app/
│   │   ├── main.py         ← FastAPI app entry point
│   │   ├── config.py       ← Pydantic settings (reads ../.env)
│   │   ├── models.py       ← SQLAlchemy models
│   │   ├── schemas.py      ← Pydantic request/response schemas
│   │   ├── routes/         ← API endpoints (auth, needs, volunteers, etc.)
│   │   ├── middleware/      ← JWT auth, role-based access
│   │   └── services/       ← Matching engine, OCR, geocoding
│   ├── seed_data.py        ← Populate DB with demo data
│   └── requirements.txt
├── admin-dashboard/        ← React admin panel (Vite)
│   └── src/
│       ├── pages/          ← Dashboard, Map, Needs, Volunteers, etc.
│       ├── components/     ← Layout, DisasterAlertSystem
│       └── services/       ← API service layer
└── volunteer-app/          ← React mobile-first volunteer app (Vite)
    └── src/
        ├── pages/          ← Home, Tasks, Map, Report, Profile, Login
        └── services/       ← API service layer
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** (with pip)
- **Node.js 18+** (with npm)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/yuvrajgitacc/another_best_project.git
cd another_best_project

# Copy environment template and fill in your keys
cp .env.example .env
```

Edit `.env` and add your API keys:
- `GOOGLE_CLIENT_ID` — from [Google Cloud Console](https://console.cloud.google.com)
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/app/apikey)
- `OWM_API_KEY` — from [OpenWeatherMap](https://openweathermap.org/api)

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Seed the database with demo data
python seed_data.py

# Start the backend server
python -m uvicorn app.main:app --reload --port 8000
```

The API will be live at: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs**

### 3. Admin Dashboard

```bash
# Open a new terminal
cd admin-dashboard

npm install
npm run dev
```

Admin Dashboard: **http://localhost:5173**  
> No login required — opens directly to the dashboard.

### 4. Volunteer App

```bash
# Open a new terminal
cd volunteer-app

npm install
npm run dev
```

Volunteer App: **http://localhost:5174**  
> Requires signup/login (Email + Password or Google Sign-In).

---

## 🔐 Authentication

| Method | Volunteer App | Admin Dashboard |
|--------|:---:|:---:|
| **Email/Password** (signup + login) | ✅ | ❌ (auto-login) |
| **Google OAuth** (one-click) | ✅ | ❌ (auto-login) |
| **Dev Token** (for testing) | ✅ | ✅ |

- Passwords are hashed with **bcrypt**
- Sessions use **JWT tokens** (24h expiry)
- All API routes are protected with Bearer token auth

---

## 🌟 Features

### Admin Dashboard
- 📊 **Impact Dashboard** — Real-time stats, charts, PDF report export
- 📋 **Need Tracker** — CRUD for community needs with urgency levels
- 🗺️ **Live Map** — Leaflet map with need markers + volunteer positions
- 👥 **Volunteer Management** — View, filter, and manage volunteer profiles
- 🧠 **Smart Matching** — AI-powered need-to-volunteer matching algorithm
- 📷 **OCR Scanner** — Upload images → Gemini AI extracts need data
- 📡 **Broadcast** — Send announcements to all volunteers
- ⚠️ **Weather Alerts** — Real-time disaster detection via OpenWeatherMap
- 🌗 **Dark/Light Mode** — Theme toggle

### Volunteer App (Mobile-First)
- 🏠 **Home** — Stats, active tasks, quick actions
- 📋 **Tasks** — View and manage assigned tasks
- 🗺️ **Map** — See all nearby needs with markers
- 📝 **Report** — Submit new community needs
- 👤 **Profile** — Manage skills, availability, location
- 🔐 **Auth** — Email/Password signup + Google Sign-In

---

## ⚙️ Environment Variables

All configuration is in a single `.env` file at the project root.

| Variable | Required | Description |
|----------|:---:|-------------|
| `SECRET_KEY` | ✅ | JWT signing key |
| `GOOGLE_CLIENT_ID` | For OAuth | Google OAuth Client ID |
| `GEMINI_API_KEY` | For OCR | Google Gemini API key |
| `OWM_API_KEY` | For weather | OpenWeatherMap API key |
| `DATABASE_URL` | ✅ | SQLite path (default: `sqlite:///./smartalloc.db`) |
| `VITE_GOOGLE_CLIENT_ID` | For OAuth | Same as GOOGLE_CLIENT_ID (for frontend) |
| `VITE_OWM_API_KEY` | For weather | Same as OWM_API_KEY (for frontend) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | SQLite |
| Frontend | React 18, Vite, React Router |
| Maps | Leaflet.js |
| Auth | Google OAuth 2.0, JWT, bcrypt |
| AI/OCR | Google Gemini 2.5 Flash |
| Weather | OpenWeatherMap API |
| Styling | Vanilla CSS (glassmorphic design) |

---

## 📝 License

Built for **Smart India Hackathon** — SevaSetu Team
