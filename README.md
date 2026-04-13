# 🏥 HealthSync — Secure Healthcare Data Exchange Platform

HealthSync is a full-stack healthcare interoperability platform that enables **patients**, **providers**, and **administrators** to securely manage, share, and audit medical records — built with privacy-first architecture and granular consent controls.

---

## 🎯 Why HealthSync?

Healthcare data is fragmented — patients can't control who sees their records, and providers lack interoperability tools. HealthSync solves this by putting **consent at the center**: every data access is explicitly authorized, fully audited, and instantly revocable.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), Vanilla CSS, React Router v6 |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL (NeonDB) |
| **Auth** | JWT (dual-token: access + refresh), bcrypt, OTP-based 2FA |
| **File Storage** | Multer (local disk), sharp (image compression) |
| **DevOps** | Docker, Docker Compose, nginx |

---

## ✨ Key Features

### Security & Privacy
- 🔐 **Two-Factor Authentication** — OTP-based 2FA with enable/disable toggle
- 🔑 **Dual-Token System** — 15-min access tokens + 7-day rotating refresh tokens (HttpOnly cookies)
- 🛡️ **Granular Consent Engine** — Patients grant/revoke access per provider, per category, with expiry
- 📋 **Immutable Audit Trail** — Every data access logged with actor, action, IP, and timestamp
- 🚨 **Emergency Override** — Providers can bypass consent in emergencies (flagged and logged)

### Clinical Features
- 📁 **Medical Records** — Upload, preview, archive/restore with category tagging
- 📅 **Appointments** — Schedule, reschedule, cancel with provider-patient linking
- 🩺 **Teleconsultation** — Session management with timed access windows
- 💬 **Collaboration Notes** — Provider-to-provider case discussions
- 📈 **Health Timeline** — Chronological view with filtering and search

### User Experience
- 🔔 **In-App Notifications** — Real-time bell with unread badge + full history page
- 🔍 **Provider Directory** — Patients search and discover providers
- 📥 **Data Export** — GDPR-style JSON download of all patient data
- 💀 **Skeleton Loaders** — Premium loading states matching UI layout
- 🚧 **Error Boundary** — Graceful crash recovery with branded fallback

### Administration
- 🏥 **System Health Dashboard** — Admin metrics, consent velocity, override frequency
- 👥 **User Distribution** — Role-based user counts and activity monitoring
- 🔒 **Rate Limiting** — Configurable limits on auth, OTP, and API endpoints

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or a NeonDB account)
- npm 8+

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/healthsync.git
cd healthsync
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your database URL and JWT secret
npm install
npm run migrate
npm run dev
```

**Required environment variables** (`.env`):
```
DATABASE_URL=postgresql://user:pass@host:5432/healthsync
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
PORT=5000
NODE_ENV=development
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173** (Vite dev server).

### 4. Docker Setup (Alternative)
```bash
docker-compose up --build
```
- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432

---

## 📦 Project Structure

```
HEALTHYSNC/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection
│   │   ├── controllers/     # Route handlers (auth, records, consent, etc.)
│   │   ├── db/              # Migration scripts
│   │   ├── middleware/       # Auth, RBAC, audit, consent, rate limiting, compression
│   │   └── routes/          # Express route definitions
│   ├── uploads/             # Uploaded medical records (local storage)
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instance with interceptors
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Auth & Toast contexts
│   │   ├── layouts/         # Public & Authenticated layouts
│   │   └── pages/           # Page components
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   └── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🔒 Security Architecture

```
                    ┌─────────────────────────────┐
                    │       React Frontend         │
                    │  (Access token in memory)     │
                    └──────────┬──────────────────┘
                               │ HTTPS
                    ┌──────────▼──────────────────┐
                    │       Express Backend        │
                    │                              │
                    │  ┌─────┐ ┌──────┐ ┌──────┐  │
                    │  │Auth │ │RBAC  │ │Audit │  │
                    │  │ MW  │ │ MW   │ │Logger│  │
                    │  └──┬──┘ └──┬───┘ └──┬───┘  │
                    │     │       │        │       │
                    │  ┌──▼───────▼────────▼───┐  │
                    │  │    Consent Engine      │  │
                    │  │  (verify before access)│  │
                    │  └──────────┬─────────────┘  │
                    └─────────────┼────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │     PostgreSQL (NeonDB)       │
                    │  users, records, consents,    │
                    │  audit_logs, notifications,   │
                    │  appointments, profiles       │
                    └──────────────────────────────┘
```

---

## 👥 Roles & Permissions

| Feature | Patient | Provider | Admin |
|---|:---:|:---:|:---:|
| View own records | ✅ | — | — |
| Upload records | ✅ | ✅ | — |
| Grant/revoke consent | ✅ | — | — |
| Access patient records (with consent) | — | ✅ | ✅ |
| Emergency override | — | ✅ | — |
| View audit logs | ✅ | — | — |
| System health dashboard | — | — | ✅ |
| Manage appointments | ✅ | ✅ | ✅ |
| 2FA / Security settings | ✅ | ✅ | ✅ |

---

## 📄 License

This project is built for educational and portfolio purposes.
# HEALTHYSYNC
