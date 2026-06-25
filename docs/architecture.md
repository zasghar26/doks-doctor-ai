# DOKS Doctor AI — System Architecture

## Overview

DOKS Doctor AI is a stateless production web application that allows DigitalOcean
users to log in with their existing DO account, select a DOKS Kubernetes cluster,
view a live health dashboard, and interact with an AI agent that reads the cluster
in real time before answering questions.

There is no persistent database. Auth state lives in a signed httpOnly cookie.
Cluster data is read fresh on every agent run. The AI uses the DigitalOcean
Inference Router, which the backend calls with a server-side Model Access Key
that is never exposed to the user.

---

## System Component Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BROWSER (User)                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 14 Frontend                               │   │
│  │                                                                     │   │
│  │  ┌───────────────┐  ┌────────────────┐  ┌──────────────────────┐   │   │
│  │  │ProtectedRoute │  │ ClusterSelector│  │  Health Dashboard    │   │   │
│  │  │               │  │                │  │  (live 30s refresh)  │   │   │
│  │  │ Check JWT     │  │ List clusters  │  │  Critical / Warning  │   │   │
│  │  │ cookie on     │  │ Select one     │  │  Healthy sections    │   │   │
│  │  │ every render  │  │ Trigger scan   │  │  Freshness badges    │   │   │
│  │  └───────────────┘  └────────────────┘  └──────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                   Agent Chat Panel                          │   │   │
│  │  │                                                             │   │   │
│  │  │  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐  │   │   │
│  │  │  │ Run Timeline  │  │ Streaming Answer │  │ Follow-up    │  │   │   │
│  │  │  │ Discover      │  │ Direct answer    │  │ Suggestions  │  │   │   │
│  │  │  │ Gather        │  │ Evidence bullets │  │ (generated)  │  │   │   │
│  │  │  │ Analyze       │  │ Root cause       │  └──────────────┘  │   │   │
│  │  │  │ Answer        │  │ Suggested fix    │                    │   │   │
│  │  │  └──────────────┘  │ Verify cmd       │                    │   │   │
│  │  │                    │ Confidence badge  │                    │   │   │
│  │  │                    └─────────────────┘                     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Storage: ZERO localStorage / sessionStorage. Cookies only (httpOnly).     │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │  HTTPS + Cookie (credentials: include)
                                 │
┌────────────────────────────────▼────────────────────────────────────────────┐
│                       FastAPI Backend (Stateless)                           │
│                        backend/main.py                                      │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                        Middleware Stack                             │    │
│  │  RequestIDMiddleware → RateLimiter → CORSMiddleware → ErrorHandler  │    │
│  │  (backend/middleware/)                                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────────┐     │
│  │   Auth Layer   │  │  Cluster Layer   │  │    Agent Layer         │     │
│  │ backend/auth/  │  │ backend/services/│  │ backend/main.py        │     │
│  │                │  │                  │  │ /api/agent/runs        │     │
│  │ GET /auth/     │  │ POST /api/       │  │ GET  /api/agent/runs/  │     │
│  │     login      │  │     clusters     │  │      {id}/events (SSE) │     │
│  │ GET /auth/     │  │ POST /api/       │  │ POST /api/agent/tools/ │     │
│  │     callback   │  │     clusters/    │  │      get_pods          │     │
│  │ POST /auth/    │  │     {id}/scan    │  │      get_events        │     │
│  │      logout    │  │ POST /api/       │  │      get_services      │     │
│  │ GET /api/me    │  │     clusters/    │  │      get_endpoints     │     │
│  │                │  │     {id}/connect │  │      get_deployments   │     │
│  └────────────────┘  └──────────────────┘  │      get_nodes         │     │
│                                             │      get_ingress       │     │
│                                             │      get_logs          │     │
│                                             └────────────────────────┘     │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                     Service Modules                                 │    │
│  │                                                                     │    │
│  │  ┌───────────────────┐   ┌──────────────────┐   ┌──────────────┐  │    │
│  │  │ digitalocean_     │   │ kubernetes_       │   │ analyzer_    │  │    │
│  │  │ service.py        │   │ service.py        │   │ service.py   │  │    │
│  │  │                   │   │                   │   │              │  │    │
│  │  │ validate_token()  │   │ scan_cluster()    │   │ detect_      │  │    │
│  │  │ list_clusters()   │   │ serialize_pods()  │   │ CrashLoop    │  │    │
│  │  │ fetch_kubeconfig()│   │ serialize_events()│   │ detect_      │  │    │
│  │  │                   │   │ serialize_svc()   │   │ ImagePull    │  │    │
│  │  │ Timeout: 15s      │   │ serialize_ingress │   │ detect_      │  │    │
│  │  │ Auth: DO token    │   │ Timeout: 30s      │   │ NoEndpoints  │  │    │
│  │  │ from cookie       │   │ Writes kubeconfig │   │ detect_      │  │    │
│  │  └───────────────────┘   │ to temp 0600 file │   │ NodeNotReady │  │    │
│  │                          │ Deletes in finally│   │ detect_      │  │    │
│  │  ┌───────────────────┐   │ Never reads       │   │ Missing      │  │    │
│  │  │ ai_service.py     │   │ Secrets           │   │ Resources    │  │    │
│  │  │                   │   └──────────────────┘   └──────────────┘  │    │
│  │  │ ask_ai()          │                                             │    │
│  │  │ Base: inference.  │   ┌──────────────────────────────────────┐  │    │
│  │  │ do-ai.run/v1      │   │ utils/redactor.py                    │  │    │
│  │  │ Model: router:X   │   │ Strips tokens, passwords, env vars,  │  │    │
│  │  │ Key: MODEL_ACCESS │   │ private keys, DB URLs from all data  │  │    │
│  │  │ _KEY (server env) │   │ before any AI or log call            │  │    │
│  │  │ Timeout: 30s      │   └──────────────────────────────────────┘  │    │
│  │  └───────────────────┘                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Config: backend/config.py     Logging: backend/logging_config.py          │
│  Auth:   backend/auth/jwt_utils.py + oauth_service.py                      │
│  Models: backend/models/schemas.py                                          │
└──────┬──────────────────────────────────────────────────────────────────────┘
       │
       ├─────────────────────────────────────────────────────────────────┐
       │                                                                 │
       ▼                                                                 ▼
┌──────────────────────────┐                              ┌──────────────────────────────┐
│  DigitalOcean API         │                              │  DO Inference Router          │
│  https://api.digital      │                              │  https://inference.do-ai.run  │
│  ocean.com/v2             │                              │  /v1                          │
│                           │                              │                               │
│  Auth: user's DO token    │                              │  Auth: MODEL_ACCESS_KEY       │
│  (from httpOnly cookie)   │                              │  (server-side env var only)   │
│                           │                              │                               │
│  /v2/account              │                              │  POST /v1/chat/completions    │
│  /v2/kubernetes/clusters  │                              │  model: "router:<name>"       │
│  /v2/kubernetes/clusters/ │                              │  Routes to best-fit model     │
│    {id}/kubeconfig        │                              │  based on task/cost/latency   │
│                           │                              │                               │
│  Timeout: 15s             │                              │  Timeout: 30s per run         │
└──────────────────────────┘                              └──────────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Kubernetes API (DOKS)    │
│  Access: kubeconfig       │
│  (fetched per request,    │
│  temp file, 0600 perms,   │
│  deleted in finally)      │
│                           │
│  Read-only resources:     │
│  pods, events, services,  │
│  endpoints, deployments,  │
│  replicasets, nodes,      │
│  ingress, pod logs        │
│                           │
│  NEVER reads: Secrets     │
│  NEVER writes: anything   │
│  Timeout: 30s per scan    │
└──────────────────────────┘
```

---

## File Layout

```
doks-doctor-ai/
│
├── backend/
│   ├── main.py                      # FastAPI app, all routes, agent run loop
│   ├── config.py                    # Load + validate env vars (fail-fast)
│   ├── logging_config.py            # Structured JSON logging, token sanitization
│   ├── requirements.txt             # Pinned Python dependencies
│   ├── .env.example                 # Template for required env vars
│   │
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── jwt_utils.py             # Create/verify JWT tokens (stateless)
│   │   └── oauth_service.py         # DO OAuth2 code exchange + user info
│   │
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── request_id.py            # Add UUID to every request + response
│   │   ├── rate_limit.py            # slowapi rate limiter
│   │   └── error_handler.py         # Safe error envelope, no stack traces
│   │
│   ├── models/
│   │   └── schemas.py               # All Pydantic request/response models
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── digitalocean_service.py  # DO API integration
│   │   ├── kubernetes_service.py    # K8s read-only scan + serializers
│   │   ├── analyzer_service.py      # Rule-based issue detection
│   │   └── ai_service.py            # DO Inference Router client
│   │
│   └── utils/
│       └── redactor.py              # Secret/token redaction before AI + logs
│
├── frontend/
│   └── app/
│       ├── page.tsx                 # Main app page (multi-step flow)
│       ├── layout.tsx               # Root layout with global providers
│       ├── login/page.tsx           # OAuth callback landing page
│       ├── components/
│       │   ├── ProtectedRoute.tsx   # Check auth cookie, redirect if not authed
│       │   ├── ClusterSelector.tsx  # List + select DOKS clusters
│       │   ├── HealthDashboard.tsx  # Live health panels with freshness
│       │   ├── ChatBox.tsx          # Interactive agent chat with timeline
│       │   └── ErrorBoundary.tsx    # Top-level error boundary
│       ├── lib/
│       │   ├── api.ts               # Typed fetch wrappers (credentials: include)
│       │   ├── auth.ts              # checkAuthStatus(), logout()
│       │   └── types.ts             # Shared TypeScript types
│       └── styles/globals.css
│
├── docs/
│   ├── plan.md                      # Original product spec
│   ├── architecture.md              # THIS FILE — system map + component layout
│   ├── flows.md                     # All ASCII workflow diagrams
│   ├── api.md                       # Full API contract reference
│   ├── agent-runtime.md             # Agent planner, tools, evidence model
│   ├── data-model.md                # Payload schemas + streaming events
│   ├── security.md                  # Auth, redaction, trust model
│   ├── operations.md                # Deployment, scaling, monitoring
│   ├── troubleshooting.md           # Common failures + recovery steps
│   └── code-standards.md            # Documentation + code quality rules
│
├── app.yaml                         # DO App Platform deployment spec
└── .gitignore
```

---

## Key Design Principles

1. **Stateless backend** — no database, no session store; JWT is self-contained.
2. **Cookie-only auth** — httpOnly, Secure, SameSite=Lax; zero localStorage.
3. **Read-only cluster access** — no write operations; never reads Secrets.
4. **Redact before AI** — all cluster data is stripped of secrets before any AI call.
5. **Model Access Key is server-only** — never returned to browser in any response.
6. **DO token is session-scoped** — lives in httpOnly cookie; never in JS context.
7. **Evidence-first AI** — agent reads cluster live per run; never answers from stale static context alone.
8. **Fail fast on config** — missing env vars raise at startup, not at first request.
