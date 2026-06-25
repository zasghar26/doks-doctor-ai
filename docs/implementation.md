# DOKS Doctor AI — Implementation Reference

Low-level technical documentation covering API contracts, data models, agent runtime,
security implementation, operations procedures, troubleshooting, and code standards.

---

## Table of Contents

1. [API Contract](#api-contract)
2. [Data Models](#data-models)
3. [Agent Runtime](#agent-runtime)
4. [Security Implementation](#security-implementation)
5. [Operations](#operations)
6. [Troubleshooting](#troubleshooting)
7. [Code Standards](#code-standards)

---

## API Contract

### Base URL
- Development: `http://localhost:8000`
- Production: `https://api.your-app.com`

### Authentication
All protected requests require cookies (sent automatically with `credentials: "include"`):
- `auth_token` — Signed JWT (7-day expiry)
- `do_token` — DigitalOcean API token (1-hour expiry)
- `selected_team_id` — Currently selected team (7-day expiry)

### Error Envelope
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "request_id": "uuid"
}
```

### Auth Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/auth/login` | GET | No | Redirect to DO OAuth |
| `/auth/callback` | GET | No | OAuth callback, sets cookies |
| `/auth/logout` | POST | No | Clears cookies |
| `/api/me` | GET | Yes | Current user info |

**GET /api/me Response:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "expires": 1751760000,
  "selected_team_id": "team-uuid"
}
```

### Team Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/teams` | GET | Yes | List accessible teams |
| `/api/teams/{id}/select` | POST | Yes | Select team, sets cookie |

**GET /api/teams Response:**
```json
{
  "teams": [
    { "id": "team-uuid", "name": "My Team", "uuid": "team-uuid" }
  ],
  "selected_team_id": "team-uuid"
}
```

**POST /api/teams/{id}/select Response:**
```json
{ "status": "ok", "selected_team_id": "team-uuid" }
```

### Cluster Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/clusters` | POST | Yes | List clusters for selected team |
| `/api/clusters/{id}/scan` | POST | Yes | Full cluster scan |

**POST /api/clusters Response:**
```json
{
  "selected_team_id": "team-uuid",
  "default_selected_cluster_id": "cluster-uuid",
  "clusters": [
    { "id": "cluster-uuid", "name": "prod-cluster", "region": "nyc1", "version": "1.30" }
  ],
  "message": null
}
```

**Important:** Returns 400 if no team selected:
```json
{
  "error": "Team selection required",
  "code": "ACTION_REQUIRED_TEAM_SELECTION",
  "message": "Select team first"
}
```

**POST /api/clusters/{id}/scan Response:**
```json
{
  "cluster_name": "prod-cluster",
  "summary": {
    "pods_total": 42,
    "pods_healthy": 40,
    "pods_unhealthy": 2,
    "nodes_total": 3,
    "nodes_ready": 3,
    "nodes_not_ready": 0,
    "services_total": 12,
    "issues_critical": 1,
    "issues_warning": 2,
    "issues_info": 0,
    "issues_total": 3
  },
  "issues": [...],
  "raw_context": {...},
  "data_freshness_seconds": 0
}
```

### Agent Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/agent/runs` | POST | Yes | Create agent run |
| `/api/agent/runs/{id}` | GET | Yes | Get run status |
| `/api/agent/runs/{id}/events` | GET | Yes | SSE event stream |

**POST /api/agent/runs Request:**
```json
{
  "cluster_id": "cluster-uuid",
  "question": "Why are my pods crashing?",
  "mode": "fast"
}
```

**SSE Events:**
```
event: stage
data: {"run_id":"uuid","stage":"discover","message":"Understanding question","timestamp":"..."}

event: stage
data: {"run_id":"uuid","stage":"gather","message":"Reading cluster resources","timestamp":"..."}

event: stage
data: {"run_id":"uuid","stage":"analyze","message":"Analyzing root causes","timestamp":"..."}

event: result
data: {"answer":"...","evidence":[...],"confidence":"high","verification_commands":[...]}
```

### Agent Tool Endpoints

All tools require auth and use `POST` with `cluster_id` query param.

| Endpoint | Returns |
|----------|---------|
| `/api/agent/tools/get_pods` | Pods list (max 200) |
| `/api/agent/tools/get_events` | Events list (max 200) |
| `/api/agent/tools/get_services` | Services list |
| `/api/agent/tools/get_endpoints` | Endpoints list |
| `/api/agent/tools/get_nodes` | Nodes list |
| `/api/agent/tools/get_deployments` | Deployments list |
| `/api/agent/tools/get_ingress` | Ingress list |
| `/api/agent/tools/get_logs` | Pod logs (max 100 lines) |

---

## Data Models

### Team
```python
class Team(BaseModel):
    id: str
    name: str
    uuid: Optional[str] = None
```

### ClusterInfo
```python
class ClusterInfo(BaseModel):
    id: str
    name: str
    region: Optional[str] = None
    version: Optional[str] = None
```

### Issue
```python
class Issue(BaseModel):
    severity: Literal["critical", "warning", "info"]
    resource: str
    namespace: Optional[str] = None
    type: str
    evidence: List[str]
    suggested_fix: str
```

### Issue Types
| Type | Severity | Detection |
|------|----------|-----------|
| CrashLoopBackOff | critical | Pod waiting reason |
| ImagePullBackOff | critical | Pod waiting reason |
| PendingPod | warning | Pod phase = Pending > 5min |
| HighRestartCount | warning | Restart count > 5 |
| NoEndpoints | warning | Service with 0 endpoints |
| NodeNotReady | critical | Node condition Ready = False |
| MissingResourceLimits | info | Container without limits |
| IngressMissingBackend | warning | Ingress rule with missing service |

### AgentRunEvent
```python
class AgentRunEvent(BaseModel):
    run_id: str
    stage: Literal["discover", "gather", "analyze", "answer", "done", "error"]
    message: str
    timestamp: str
    payload: Optional[Dict[str, Any]] = None
```

### JWT Payload
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "iat": 1751673600,
  "exp": 1752278400
}
```

---

## Agent Runtime

### Stage Sequence
1. **discover** — Parse question, classify intent
2. **gather** — Execute read-only tool calls
3. **analyze** — Build evidence package, score confidence
4. **answer** — Synthesize response via AI
5. **done** — Complete

### Safety Limits
| Limit | Value |
|-------|-------|
| MAX_TOOLS_PER_RUN | 8 |
| PER_TOOL_TIMEOUT | 10 seconds |
| HARD_RUN_TIMEOUT | 25 seconds |
| MAX_LOG_LINES | 100 |
| MAX_PAYLOAD_BYTES | 500KB |

### Confidence Scoring
- **high** — Direct evidence found, issue confirmed
- **medium** — Likely cause, partial evidence
- **low** — Possible cause, needs verification

### AI System Prompt
```
You are a Kubernetes diagnostic assistant analyzing a DigitalOcean DOKS cluster.
Use only the provided cluster context. Do not invent facts.
Respond with: direct answer, evidence bullets, root cause, suggested fix, verification commands.
```

---

## Security Implementation

### Cookie Configuration
| Cookie | Max Age | HttpOnly | Secure | SameSite |
|--------|---------|----------|--------|----------|
| auth_token | 7 days | Yes | Yes (prod) | Lax |
| do_token | 1 hour | Yes | Yes (prod) | Lax |
| selected_team_id | 7 days | Yes | Yes (prod) | Lax |

### Redaction Rules
Sensitive keys stripped before logging or AI context:
- `password`, `secret`, `token`, `key`, `credential`, `auth`
- `bearer`, `api_key`, `apikey`, `private`

Regex patterns:
- `Bearer [A-Za-z0-9._-]+`
- `dop_v1_[a-f0-9]+`
- `-----BEGIN.*PRIVATE KEY-----`

### Read-Only K8s Access
Never call write APIs. Allowed operations:
- `list_*`, `get_*`, `read_namespaced_pod_log`

Never accessed:
- `Secrets` (metadata only if needed)

### Kubeconfig Handling
1. Write to temp file with `chmod 0600`
2. Load via kubernetes client
3. Delete in `finally` block — never leave on disk

---

## Operations

### Environment Variables

**Required:**
```
DO_OAUTH_CLIENT_ID=dop_v1_...
DO_OAUTH_CLIENT_SECRET=...
DO_OAUTH_REDIRECT_URI=https://app.com/auth/callback
JWT_SECRET_KEY=<32+ random chars>
MODEL_ACCESS_KEY=...
AI_BASE_URL=https://inference.do-ai.run/v1
AI_MODEL=router:my-router
CORS_ORIGINS=https://app.com
```

**Optional:**
```
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=7
LOG_LEVEL=INFO
ENVIRONMENT=production
COOKIE_DOMAIN=.app.com
```

### Local Development
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in values
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Deployment (DO App Platform)
1. Create OAuth app in DO Control Panel
2. Create Inference Model Access Key
3. Deploy via `doctl apps create --spec app.yaml`
4. Set secrets in App Platform dashboard

### Rate Limits
- Default: 10 req/sec
- Agent runs: 5/min/user
- Scans: 2/min/user

---

## Troubleshooting

### User Cannot Log In
- Verify OAuth callback URL matches exactly
- Check `DO_OAUTH_CLIENT_ID` and `DO_OAUTH_CLIENT_SECRET`
- Check CORS_ORIGINS includes frontend domain

### DO Token Expired Mid-Session
- `do_token` has 1-hour expiry
- User must re-authenticate via OAuth
- Frontend detects 401 and redirects to login

### Cluster List Empty
- Verify user has DOKS clusters in DO account
- Check team is selected (400 error if missing)

### Cluster Scan Timeout
- Default 30s timeout may be insufficient for large clusters
- Check backend logs for specific phase timeout

### Agent Run Stalls
- Tool calls are sequential — one blocking call stalls all
- Hard timeout returns partial result after 25s
- Check for K8s API slowness

### AI Returns No Answer
- Check `MODEL_ACCESS_KEY` validity
- Check `AI_MODEL` matches router name exactly
- Fallback to rule-based analysis on AI failure

---

## Code Standards

### Module Docstrings
Every Python file must have a top-level docstring:
```python
"""
kubernetes_service.py

Reads Kubernetes resources from a DOKS cluster using a kubeconfig string.
All reads are read-only. Kubernetes Secrets are never accessed.
"""
```

### Function Docstrings
All public functions must document: purpose, args, returns, raises, security notes.

### Endpoint Docstrings
Every FastAPI endpoint must document: auth requirement, flow, returns, side effects, timeouts.

### Inline Comments
Required for:
- Non-obvious safety decisions
- Timeout boundaries
- Security-critical paths
- Workarounds for external API quirks

### Quality Gates
- Lint and type checks pass
- No secrets in code
- All new APIs documented
- Examples match schemas
