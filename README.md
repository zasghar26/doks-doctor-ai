# DOKS Doctor AI

AI-powered Kubernetes troubleshooting assistant for DigitalOcean Kubernetes Service (DOKS).

Login with your DigitalOcean account, select a cluster, view live health status, and ask an AI agent to diagnose issues in real time.

---

## Features

- **OAuth-only authentication** — No manual token pasting; login securely with DigitalOcean
- **Team-scoped access** — Select your team, then view only clusters for that team
- **Live health dashboard** — Auto-refreshing cluster health with issue detection
- **AI investigation agent** — Ask questions and watch the agent read your cluster in real time
- **Read-only access** — Never writes to your cluster; only reads for diagnostics
- **Stateless architecture** — No database required; auth via secure cookies

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 14    │────▶│   FastAPI       │────▶│  DigitalOcean   │
│   Frontend      │     │   Backend       │     │  API + K8s      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  DO Inference   │
                        │  Router (AI)    │
                        └─────────────────┘
```

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Python FastAPI, stateless, JWT auth via cookies
- **AI**: DigitalOcean Inference Router (OpenAI-compatible)

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- DigitalOcean account with:
  - At least one DOKS cluster
  - OAuth application credentials
  - Inference Model Access Key

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/doks-doctor-ai.git
cd doks-doctor-ai
```

### 2. Create DigitalOcean OAuth App

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com) → API → Applications
2. Create new application:
   - Name: `DOKS Doctor AI`
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:8000/auth/callback`
3. Copy the **Client ID** and **Client Secret**

### 3. Create Inference Model Access Key

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com) → Inference → Manage Model Access Keys
2. Create a new key
3. Copy the key (shown only once)

### 4. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
DO_OAUTH_CLIENT_ID=your_client_id
DO_OAUTH_CLIENT_SECRET=your_client_secret
DO_OAUTH_REDIRECT_URI=http://localhost:8000/auth/callback
JWT_SECRET_KEY=your_random_32_char_secret
MODEL_ACCESS_KEY=your_inference_key
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
cp .env.local.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

### 6. Access the App

Open http://localhost:3000 and click **Login with DigitalOcean**.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DO_OAUTH_CLIENT_ID` | Yes | DigitalOcean OAuth client ID |
| `DO_OAUTH_CLIENT_SECRET` | Yes | DigitalOcean OAuth client secret |
| `DO_OAUTH_REDIRECT_URI` | Yes | OAuth callback URL |
| `JWT_SECRET_KEY` | Yes | Secret for signing JWTs (32+ chars) |
| `MODEL_ACCESS_KEY` | Yes | DigitalOcean Inference API key |
| `CORS_ORIGINS` | Yes | Allowed frontend origins (comma-separated) |
| `FRONTEND_URL` | Yes | Frontend URL for redirects |
| `AI_BASE_URL` | No | Inference API base (default: `https://inference.do-ai.run/v1`) |
| `AI_MODEL` | No | Model name (default: `router:my-router`) |
| `JWT_EXPIRY_DAYS` | No | JWT expiry in days (default: 7) |
| `LOG_LEVEL` | No | Logging level (default: INFO) |
| `ENVIRONMENT` | No | `development` or `production` |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE` | Yes | Backend API URL |

---

## Usage

1. **Login** — Click "Login with DigitalOcean" to authenticate
2. **Select Team** — Choose your team (auto-selected if only one)
3. **Select Cluster** — Pick a cluster (first is auto-selected alphabetically)
4. **View Health** — Dashboard shows pods, nodes, services, and detected issues
5. **Ask AI** — Type a question like "Why are my pods crashing?" and watch the investigation

### Example Questions

- "Why are my pods crashing?"
- "What issues need immediate attention?"
- "Are there any network connectivity problems?"
- "Why is my deployment not scaling?"
- "Check if any services have no endpoints"

---

## Project Structure

```
doks-doctor-ai/
├── backend/
│   ├── auth/              # OAuth and JWT utilities
│   ├── middleware/        # Request ID, rate limiting, error handling
│   ├── models/            # Pydantic schemas
│   ├── services/          # DO API, K8s, AI, analyzer
│   ├── utils/             # Redaction utilities
│   ├── main.py            # FastAPI app and routes
│   ├── config.py          # Environment configuration
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── components/    # React components
│   │   ├── lib/           # API client, types
│   │   ├── login/         # Login page
│   │   └── page.tsx       # Main dashboard
│   ├── package.json
│   └── tailwind.config.js
└── docs/
    ├── architecture.md    # System design
    ├── flows.md           # Workflow diagrams
    └── implementation.md  # Technical reference
```

---

## Documentation

- [Architecture Overview](docs/architecture.md) — System components and design
- [Flow Diagrams](docs/flows.md) — OAuth, scan, agent run workflows
- [Implementation Reference](docs/implementation.md) — API contracts, data models, operations

---

## Security

- **Read-only cluster access** — Never writes to your Kubernetes cluster
- **Secure cookies** — httpOnly, Secure (in production), SameSite=Lax
- **Token redaction** — Sensitive data stripped before logging or AI context
- **Short-lived DO token** — 1-hour expiry, re-auth required after expiry
- **No secrets stored** — Kubeconfig written to temp file, deleted immediately

---

## License

MIT
