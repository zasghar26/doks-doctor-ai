# DOKS Doctor AI — System Flows (ASCII)

All major workflows are documented here with step-by-step ASCII diagrams.
Each flow maps directly to code modules in the backend and frontend.

---

## 1. User Login Flow (OAuth2 + JWT Cookie)

```
USER BROWSER                  NEXT.JS FRONTEND         FASTAPI BACKEND         DIGITALOCEAN
     │                              │                        │                       │
     │  Opens app                   │                        │                       │
     │─────────────────────────────►│                        │                       │
     │                              │                        │                       │
     │                              │  GET /api/me           │                       │
     │                              │  (credentials:include) │                       │
     │                              │───────────────────────►│                       │
     │                              │                        │  No auth cookie found │
     │                              │  401 Unauthorized      │                       │
     │                              │◄───────────────────────│                       │
     │                              │                        │                       │
     │                              │  Render login screen   │                       │
     │◄─────────────────────────────│                        │                       │
     │                              │                        │                       │
     │  Clicks "Login with DO"      │                        │                       │
     │─────────────────────────────►│                        │                       │
     │                              │  GET /auth/login       │                       │
     │                              │───────────────────────►│                       │
     │                              │                        │  Build OAuth URL      │
     │                              │  302 Redirect to DO    │  client_id + scope    │
     │◄─────────────────────────────┼────────────────────────│                       │
     │                              │                        │                       │
     │  Browser follows redirect    │                        │                       │
     │──────────────────────────────────────────────────────────────────────────────►│
     │                              │                        │                       │
     │  DO shows login + consent    │                        │                       │
     │◄──────────────────────────────────────────────────────────────────────────────│
     │                              │                        │                       │
     │  User enters credentials     │                        │                       │
     │──────────────────────────────────────────────────────────────────────────────►│
     │                              │                        │                       │
     │  DO redirects to callback    │                        │                       │
     │  with ?code=ABC123           │                        │                       │
     │─────────────────────────────►│                        │                       │
     │                              │  GET /auth/callback    │                       │
     │                              │  ?code=ABC123          │                       │
     │                              │───────────────────────►│                       │
     │                              │                        │  Exchange code        │
     │                              │                        │  for DO token         │
     │                              │                        │──────────────────────►│
     │                              │                        │  { access_token }     │
     │                              │                        │◄──────────────────────│
     │                              │                        │                       │
     │                              │                        │  GET /v2/account      │
     │                              │                        │──────────────────────►│
     │                              │                        │  { user_id, email }   │
     │                              │                        │◄──────────────────────│
     │                              │                        │                       │
     │                              │                        │  Create JWT           │
     │                              │                        │  { user_id, email,    │
     │                              │                        │    iat, exp +7 days } │
     │                              │                        │  Sign with JWT_SECRET │
     │                              │                        │                       │
     │                              │  Set-Cookie:           │                       │
     │                              │  auth_token=JWT        │                       │
     │                              │  HttpOnly;Secure;7days │                       │
     │                              │  Set-Cookie:           │                       │
     │                              │  do_token=DO_TOKEN     │                       │
     │                              │  HttpOnly;Secure;1hr   │                       │
     │                              │  302 → /               │                       │
     │◄─────────────────────────────│                        │                       │
     │                              │                        │                       │
     │  Browser stores cookies      │                        │                       │
     │  Loads main app              │                        │                       │
     │─────────────────────────────►│                        │                       │
     │                              │  GET /api/me           │                       │
     │                              │  (cookie sent)         │                       │
     │                              │───────────────────────►│                       │
     │                              │                        │  Verify JWT sig       │
     │                              │                        │  Check exp claim      │
     │                              │  200 { user, email }   │                       │
     │                              │◄───────────────────────│                       │
     │                              │                        │                       │
     │  Render authenticated app    │                        │                       │
     │◄─────────────────────────────│                        │                       │
```

---

## 2. Cluster Discovery and Health Scan Flow

```
FRONTEND                        FASTAPI BACKEND              DIGITALOCEAN API     K8s (DOKS)
   │                                   │                            │                  │
   │  User authenticated,              │                            │                  │
   │  app mounts ClusterSelector       │                            │                  │
   │                                   │                            │                  │
   │  POST /api/clusters               │                            │                  │
   │  (cookie auto-sent)               │                            │                  │
   │──────────────────────────────────►│                            │                  │
   │                                   │  Auth: Validate JWT cookie │                  │
   │                                   │  Extract do_token          │                  │
   │                                   │                            │                  │
   │                                   │  GET /v2/kubernetes/       │                  │
   │                                   │  clusters                  │                  │
   │                                   │───────────────────────────►│                  │
   │                                   │  [ { id, name, region,     │                  │
   │                                   │      version } ]           │                  │
   │                                   │◄───────────────────────────│                  │
   │  200 { clusters: [...] }          │                            │                  │
   │◄──────────────────────────────────│                            │                  │
   │                                   │                            │                  │
   │  Render cluster list              │                            │                  │
   │  User selects "prod-cluster"      │                            │                  │
   │                                   │                            │                  │
   │  POST /api/clusters/{id}/scan     │                            │                  │
   │──────────────────────────────────►│                            │                  │
   │                                   │  Auth: Validate JWT        │                  │
   │                                   │                            │                  │
   │                                   │  GET /v2/kubernetes/       │                  │
   │                                   │  clusters/{id}/kubeconfig  │                  │
   │                                   │───────────────────────────►│                  │
   │                                   │  kubeconfig YAML           │                  │
   │                                   │◄───────────────────────────│                  │
   │                                   │                            │                  │
   │                                   │  Write kubeconfig to       │                  │
   │                                   │  tmp file, chmod 0600      │                  │
   │                                   │                            │                  │
   │                                   │  Load k8s client from tmp  │                  │
   │                                   │  Delete tmp in finally{}   │                  │
   │                                   │                            │                  │
   │                                   │  list_pod_for_all_ns()     │                  │
   │                                   │───────────────────────────────────────────────►
   │                                   │  list_event_for_all_ns()   │                  │
   │                                   │───────────────────────────────────────────────►
   │                                   │  list_service_for_all_ns() │                  │
   │                                   │───────────────────────────────────────────────►
   │                                   │  list_endpoints_for_all_ns │                  │
   │                                   │───────────────────────────────────────────────►
   │                                   │  list_deployment_for_all_ns│                  │
   │                                   │───────────────────────────────────────────────►
   │                                   │  list_node()               │                  │
   │                                   │───────────────────────────────────────────────►
   │                                   │  list_ingress_for_all_ns() │                  │
   │                                   │───────────────────────────────────────────────►
   │                                   │  read_namespaced_pod_log() │                  │
   │                                   │  (last 30 lines per pod)   │                  │
   │                                   │───────────────────────────────────────────────►
   │                                   │                            │  All results      │
   │                                   │◄───────────────────────────────────────────────
   │                                   │                            │                  │
   │                                   │  redactor.redact_object()  │                  │
   │                                   │  Strip: tokens, passwords, │                  │
   │                                   │  private keys, DB URLs     │                  │
   │                                   │                            │                  │
   │                                   │  analyzer_service          │                  │
   │                                   │  .analyze_cluster()        │                  │
   │                                   │  ┌────────────────────┐    │                  │
   │                                   │  │ detect_pod_issues  │    │                  │
   │                                   │  │ CrashLoopBackOff   │    │                  │
   │                                   │  │ ImagePullBackOff   │    │                  │
   │                                   │  │ Pending pods       │    │                  │
   │                                   │  │ High restarts      │    │                  │
   │                                   │  ├────────────────────┤    │                  │
   │                                   │  │ detect_svc_issues  │    │                  │
   │                                   │  │ No endpoints       │    │                  │
   │                                   │  │ Selector mismatch  │    │                  │
   │                                   │  ├────────────────────┤    │                  │
   │                                   │  │ detect_node_issues │    │                  │
   │                                   │  │ NotReady           │    │                  │
   │                                   │  ├────────────────────┤    │                  │
   │                                   │  │ detect_ingress     │    │                  │
   │                                   │  │ Missing backend    │    │                  │
   │                                   │  ├────────────────────┤    │                  │
   │                                   │  │ detect_resource_   │    │                  │
   │                                   │  │ limits_missing     │    │                  │
   │                                   │  └────────────────────┘    │                  │
   │                                   │                            │                  │
   │  200 {                            │                            │                  │
   │    cluster_name,                  │                            │                  │
   │    summary: { pods_total,         │                            │                  │
   │      pods_running,                │                            │                  │
   │      pods_unhealthy,              │                            │                  │
   │      nodes_ready, ... },          │                            │                  │
   │    issues: [ { severity,          │                            │                  │
   │      type, resource,              │                            │                  │
   │      evidence, fix } ],           │                            │                  │
   │    raw_context: {...}             │                            │                  │
   │  }                                │                            │                  │
   │◄──────────────────────────────────│                            │                  │
   │                                   │                            │                  │
   │  Render HealthDashboard           │                            │                  │
   │  ┌──────────────────────────┐     │                            │                  │
   │  │ CRITICAL (2)             │     │                            │                  │
   │  │ • checkout: CrashLoop    │     │                            │                  │
   │  │ • frontend: NoEndpoints  │     │                            │                  │
   │  ├──────────────────────────┤     │                            │                  │
   │  │ WARNINGS (3)             │     │                            │                  │
   │  │ • worker: 9 restarts     │     │                            │                  │
   │  │ • api: no CPU limits     │     │                            │                  │
   │  ├──────────────────────────┤     │                            │                  │
   │  │ HEALTHY                  │     │                            │                  │
   │  │ 14 pods running          │     │                            │                  │
   │  │ 3 services active        │     │                            │                  │
   │  │ 2 nodes ready            │     │                            │                  │
   │  │ Data read: just now ✓    │     │                            │                  │
   │  └──────────────────────────┘     │                            │                  │
   │                                   │                            │                  │
   │  Auto-refresh every 30s ──────────┼───────────────────────────► (repeat scan)    │
```

---

## 3. Interactive Agent Run Flow (Question → Evidence → Answer)

```
USER                 FRONTEND              FASTAPI BACKEND               DO INFERENCE
  │                      │                       │         K8s API            ROUTER
  │  Types question:     │                       │             │                  │
  │  "Why is frontend    │                       │             │                  │
  │   not reachable?"    │                       │             │                  │
  │─────────────────────►│                       │             │                  │
  │                      │  POST /api/agent/runs │             │                  │
  │                      │  { cluster_id,        │             │                  │
  │                      │    question,          │             │                  │
  │                      │    mode: "standard" } │             │                  │
  │                      │──────────────────────►│             │                  │
  │                      │                       │  Create run_id               │
  │                      │  { run_id: "abc-123" } │             │                  │
  │                      │◄──────────────────────│             │                  │
  │                      │                       │             │                  │
  │                      │  GET /api/agent/runs/ │             │                  │
  │                      │  abc-123/events (SSE) │             │                  │
  │                      │──────────────────────►│             │                  │
  │                      │                       │             │                  │
  │                      │  ════════ SSE STREAM OPEN ════════  │                  │
  │                      │                       │             │                  │
  │                      │  event: status        │             │                  │
  │                      │  data: { stage:       │             │                  │
  │                      │  "discover",          │             │                  │
  │                      │  message: "Classifying│             │                  │
  │                      │  question intent" }   │             │                  │
  │                      │◄──────────────────────│             │                  │
  │                      │                       │             │                  │
  │  Run timeline shows: │                       │             │                  │
  │  ◉ Discover…         │                       │             │                  │
  │                      │                       │  ┌─────────────────────────┐  │
  │                      │                       │  │ PLANNER                 │  │
  │                      │                       │  │ Classify intent:        │  │
  │                      │                       │  │ "networking / service   │  │
  │                      │                       │  │  reachability"          │  │
  │                      │                       │  │                         │  │
  │                      │                       │  │ Select tools:           │  │
  │                      │                       │  │ 1. get_services         │  │
  │                      │                       │  │ 2. get_endpoints        │  │
  │                      │                       │  │ 3. get_pods (filtered)  │  │
  │                      │                       │  │ 4. get_ingress          │  │
  │                      │                       │  │ 5. get_events           │  │
  │                      │                       │  └─────────────────────────┘  │
  │                      │                       │             │                  │
  │                      │  event: status        │             │                  │
  │                      │  data: { stage:       │             │                  │
  │                      │  "gather",            │             │                  │
  │                      │  message: "Reading    │             │                  │
  │                      │  services and         │             │                  │
  │                      │  endpoints" }         │             │                  │
  │                      │◄──────────────────────│             │                  │
  │                      │                       │             │                  │
  │  Run timeline:       │                       │             │                  │
  │  ✓ Discover          │                       │             │                  │
  │  ◉ Gather…           │                       │             │                  │
  │                      │                       │             │                  │
  │                      │                       │  Tool: get_services         │
  │                      │                       │─────────────►                │
  │                      │                       │  services[]  │                │
  │                      │                       │◄─────────────                │
  │                      │                       │             │                  │
  │                      │                       │  Tool: get_endpoints        │
  │                      │                       │─────────────►                │
  │                      │                       │  endpoints[] │                │
  │                      │                       │◄─────────────                │
  │                      │                       │             │                  │
  │                      │                       │  Tool: get_pods             │
  │                      │                       │─────────────►                │
  │                      │                       │  pods[]      │                │
  │                      │                       │◄─────────────                │
  │                      │                       │             │                  │
  │                      │                       │  Tool: get_ingress          │
  │                      │                       │─────────────►                │
  │                      │                       │  ingress[]   │                │
  │                      │                       │◄─────────────                │
  │                      │                       │             │                  │
  │                      │                       │  Tool: get_events           │
  │                      │                       │─────────────►                │
  │                      │                       │  events[]    │                │
  │                      │                       │◄─────────────                │
  │                      │                       │             │                  │
  │                      │                       │  redactor.redact_object()   │
  │                      │                       │  (all tool results)         │
  │                      │                       │             │                  │
  │                      │  event: status        │             │                  │
  │                      │  data: { stage:       │             │                  │
  │                      │  "analyze",           │             │                  │
  │                      │  message: "Building   │             │                  │
  │                      │  evidence from        │             │                  │
  │                      │  5 sources" }         │             │                  │
  │                      │◄──────────────────────│             │                  │
  │                      │                       │             │                  │
  │  Run timeline:       │                       │             │                  │
  │  ✓ Discover          │                       │             │                  │
  │  ✓ Gather            │                       │             │                  │
  │  ◉ Analyze…          │                       │             │                  │
  │                      │                       │             │                  │
  │                      │                       │  ┌─────────────────────────┐  │
  │                      │                       │  │ AGGREGATOR              │  │
  │                      │                       │  │ Build evidence package: │  │
  │                      │                       │  │                         │  │
  │                      │                       │  │ - Service "frontend"    │  │
  │                      │                       │  │   selector: app=frontend│  │
  │                      │                       │  │   endpoints: 0          │  │
  │                      │                       │  │                         │  │
  │                      │                       │  │ - Pods matching         │  │
  │                      │                       │  │   app=frontend: 0 found │  │
  │                      │                       │  │                         │  │
  │                      │                       │  │ - Running pods with     │  │
  │                      │                       │  │   app=web: 2 found      │  │
  │                      │                       │  │                         │  │
  │                      │                       │  │ Confidence: HIGH        │  │
  │                      │                       │  │ Root cause: selector    │  │
  │                      │                       │  │ mismatch                │  │
  │                      │                       │  └─────────────────────────┘  │
  │                      │                       │             │                  │
  │                      │                       │  Build AI prompt:           │  │
  │                      │                       │  system: strict K8s rules   │  │
  │                      │                       │  user question + evidence   │  │
  │                      │                       │                             │  │
  │                      │                       │  POST /v1/chat/completions  │  │
  │                      │                       │  model: "router:my-router"  │  │
  │                      │                       │  Authorization: MODEL_KEY   │  │
  │                      │                       │──────────────────────────────►│
  │                      │                       │             │                  │
  │                      │  event: status        │             │                  │
  │                      │  data: { stage:       │             │                  │
  │                      │  "answer",            │             │                  │
  │                      │  message: "Generating │             │                  │
  │                      │  response" }          │             │                  │
  │                      │◄──────────────────────│             │                  │
  │                      │                       │             │                  │
  │  Run timeline:       │                       │             │                  │
  │  ✓ Discover          │                       │             │                  │
  │  ✓ Gather            │                       │             │                  │
  │  ✓ Analyze           │                       │             │                  │
  │  ◉ Answer…           │                       │             │                  │
  │                      │                       │  AI response (streaming)    │  │
  │                      │                       │◄──────────────────────────────│
  │                      │                       │             │                  │
  │                      │  event: answer        │             │                  │
  │                      │  data: { answer: {    │             │                  │
  │                      │    direct: "frontend  │             │                  │
  │                      │    service has 0      │             │                  │
  │                      │    endpoints because  │             │                  │
  │                      │    selector mismatch",│             │                  │
  │                      │    evidence: [...],   │             │                  │
  │                      │    root_cause: "...", │             │                  │
  │                      │    fix: "...",        │             │                  │
  │                      │    verify_cmd: "...", │             │                  │
  │                      │    confidence: "HIGH",│             │                  │
  │                      │    data_read_at: ts } }│            │                  │
  │                      │◄──────────────────────│             │                  │
  │                      │                       │  SSE stream closed          │
  │                      │                       │             │                  │
  │  Run timeline:       │                       │             │                  │
  │  ✓ Discover          │                       │             │                  │
  │  ✓ Gather            │                       │             │                  │
  │  ✓ Analyze           │                       │             │                  │
  │  ✓ Answer            │                       │             │                  │
  │                      │                       │             │                  │
  │  Chat renders:       │                       │             │                  │
  │  ┌──────────────────────────────────────┐    │             │                  │
  │  │ Direct Answer                        │    │             │                  │
  │  │ The frontend service has 0 endpoints │    │             │                  │
  │  │ because its selector (app=frontend)  │    │             │                  │
  │  │ matches no running pods.             │    │             │                  │
  │  ├──────────────────────────────────────┤    │             │                  │
  │  │ Evidence                [HIGH] ✓     │    │             │                  │
  │  │ • Service selector: app=frontend     │    │             │                  │
  │  │ • Endpoint count: 0                  │    │             │                  │
  │  │ • Pods with app=frontend: 0 found    │    │             │                  │
  │  │ • Pods with app=web: 2 running       │    │             │                  │
  │  │ • Data read: 3s ago                  │    │             │                  │
  │  ├──────────────────────────────────────┤    │             │                  │
  │  │ Root Cause                           │    │             │                  │
  │  │ Label mismatch between Service and   │    │             │                  │
  │  │ running pods.                        │    │             │                  │
  │  ├──────────────────────────────────────┤    │             │                  │
  │  │ Fix                                  │    │             │                  │
  │  │ Update the Service selector to       │    │             │                  │
  │  │ app=web, or relabel the pods.        │    │             │                  │
  │  ├──────────────────────────────────────┤    │             │                  │
  │  │ Verify                               │    │             │                  │
  │  │ kubectl get endpoints frontend -n default │             │                  │
  │  │ kubectl get pods -l app=web -n default │   │             │                  │
  │  ├──────────────────────────────────────┤    │             │                  │
  │  │ Follow-up suggestions:               │    │             │                  │
  │  │ [Show me all services with 0         │    │             │                  │
  │  │  endpoints]                          │    │             │                  │
  │  │ [What else should I fix first?]      │    │             │                  │
  │  └──────────────────────────────────────┘    │             │                  │
```

---

## 4. Request Middleware Pipeline Flow

```
INCOMING HTTP REQUEST
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. RequestIDMiddleware                                          │
│     Generate UUID → attach to request.state.request_id          │
│     Add X-Request-ID header to response                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CORSMiddleware                                               │
│     Check Origin against CORS_ORIGINS env var                   │
│     Reject if not in allowed list                               │
│     Add CORS headers to response                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. RateLimiter (slowapi)                                        │
│     Per-IP limit: 10 req/sec default                            │
│     Chat endpoints: stricter per-user budget                    │
│     429 Too Many Requests if exceeded                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Route Handler                                                │
│     JWT validation on every protected route                     │
│     do_token extracted from httpOnly cookie                     │
│     Service logic executed                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. ErrorHandler                                                 │
│     Catch all unhandled exceptions                              │
│     Log full detail server-side with request_id                 │
│     Return safe envelope to client:                             │
│     { "error": "Internal server error",                         │
│       "request_id": "uuid" }                                    │
│     Never expose stack traces or token values                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                  HTTP RESPONSE
         ┌────────────────────────────┐
         │ X-Request-ID: <uuid>       │
         │ Content-Type: application/ │
         │   json                     │
         │ Strict-Transport-Security  │
         │ Content-Security-Policy    │
         └────────────────────────────┘
```

---

## 5. Redaction Pipeline Flow

```
RAW CLUSTER DATA (from K8s API)
         │
         │  Contains: logs, env vars, descriptions, events
         │  May contain: passwords, tokens, private keys, DB URLs
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  redactor.redact_object(obj)                                     │
│                                                                  │
│  Step 1: Walk the object recursively                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  If value is a dict:                                      │   │
│  │    For each key: check against SENSITIVE_KEYS list        │   │
│  │    Keys: secret, token, password, authorization,          │   │
│  │          api_key, private_key, client_secret, DATABASE_URL│   │
│  │    → Replace value with "[REDACTED]"                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 2: Apply regex patterns on all string values               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Patterns:                                                │   │
│  │  • Authorization: Bearer <token>  → Bearer [REDACTED]     │   │
│  │  • api_key = <value>              → api_key=[REDACTED]    │   │
│  │  • password = <value>             → password=[REDACTED]   │   │
│  │  • DATABASE_URL = <value>         → DATABASE_URL=[REDACT] │   │
│  │  • -----BEGIN PRIVATE KEY-----    → [REDACTED]            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Step 3: Return clean copy (original object unchanged)           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
            REDACTED DATA — safe to pass to:
            ┌─────────────────┐
            │ • AI service    │  (as cluster context)
            │ • Log output    │  (structured JSON logs)
            │ • API response  │  (as raw_context field)
            └─────────────────┘
```

---

## 6. Session Persistence Flow (7-Day Cookie)

```
DAY 0 — User logs in
  ┌─────────────────────────────────────────────────────────────────┐
  │  Backend creates:                                                │
  │  auth_token cookie  (JWT, httpOnly, Secure, 7 days)             │
  │  do_token   cookie  (DO access token, httpOnly, Secure, 1 hour) │
  └─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
DAY 0 → HOUR 0          Browser stores both cookies
                         ▼
HOUR 1 — do_token expires
  ┌─────────────────────────────────────────────────────────────────┐
  │  Protected API call receives 401 (DO token expired in cookie)   │
  │  Frontend detects → redirects to /auth/login                    │
  │  User re-authenticates with DO OAuth                            │
  │  Backend issues fresh do_token cookie (1 hour)                  │
  │  auth_token cookie still valid (reuses existing 7-day JWT)      │
  └─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
DAY 2 — User closes browser
  ┌─────────────────────────────────────────────────────────────────┐
  │  Cookies persist in browser storage (not session cookies)       │
  │  No server state to maintain                                    │
  └─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
DAY 2 — User reopens browser
  ┌─────────────────────────────────────────────────────────────────┐
  │  ProtectedRoute calls GET /api/me (cookie auto-sent)            │
  │  Backend verifies JWT: valid, not expired                       │
  │  User is authenticated → app loads directly                     │
  └─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
DAY 7 — auth_token expires
  ┌─────────────────────────────────────────────────────────────────┐
  │  GET /api/me → JWT verify fails → 401                           │
  │  Frontend → redirect to /auth/login                             │
  │  Full DO OAuth re-authentication required                       │
  └─────────────────────────────────────────────────────────────────┘

LOGOUT at any time
  ┌─────────────────────────────────────────────────────────────────┐
  │  POST /auth/logout                                              │
  │  Backend: response.delete_cookie("auth_token")                  │
  │           response.delete_cookie("do_token")                    │
  │  Browser: both cookies cleared immediately                      │
  │  Next request: 401 → login screen                               │
  └─────────────────────────────────────────────────────────────────┘
```

---

## 7. Agent Tool Execution Flow (Safety Model)

```
Agent Run Started
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Planner classifies intent                                       │
│  Returns ordered tool list, max 8 tools per run                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                 ┌───────▼────────┐
                 │ Tool Queue     │
                 │ [get_services, │
                 │  get_endpoints,│
                 │  get_pods,     │
                 │  get_events]   │
                 └───────┬────────┘
                         │
         ┌───────────────▼──────────────────────────────────────┐
         │  For each tool:                                       │
         │                                                       │
         │  1. Start per-tool timer (10s max)                   │
         │     │                                                  │
         │     ▼                                                  │
         │  2. Fetch kubeconfig from cookie token                │
         │     Write tmp file (0600), load client                │
         │     │                                                  │
         │     ▼                                                  │
         │  3. Call read-only K8s API endpoint                   │
         │     │                                                  │
         │     ├── Success ──► Serialize result                  │
         │     │               Delete tmp file                   │
         │     │               Add to evidence package           │
         │     │               Emit "tool_complete" SSE event    │
         │     │                                                  │
         │     └── Timeout/Error ──► Log failure with request_id │
         │                           Mark evidence gap           │
         │                           Continue to next tool       │
         │                           (no hard stop)              │
         │                                                       │
         │  4. Apply redactor to all collected results           │
         │     │                                                  │
         │     ▼                                                  │
         │  5. Check overall run timeout: 25s hard limit         │
         │     If exceeded → emit partial answer with disclosure │
         └──────────────────────────────────────────────────────┘
                         │
                         ▼
                  Evidence Package
         ┌─────────────────────────────┐
         │ {                            │
         │   tools_executed: ["svc",    │
         │     "ep", "pods", "events"], │
         │   tools_failed: [],          │
         │   evidence: { ... },         │
         │   data_read_at: timestamp,   │
         │   run_duration_ms: 4200      │
         │ }                            │
         └─────────────────────────────┘
                         │
                         ▼
            Passed to AI synthesizer
            with system prompt + user question
```

---

## 8. Error Recovery Flow

```
SCENARIO A: Tool call times out
  ┌──────────────────────────────────────────────────────────────┐
  │  Tool timeout (>10s) caught                                  │
  │  Log: { tool: "get_logs", error: "timeout", run_id: "..." } │
  │  Mark tool as failed in evidence                             │
  │  Continue run with remaining tools                           │
  │  AI prompt includes: "Logs unavailable due to timeout"       │
  │  Answer discloses gap in evidence                            │
  └──────────────────────────────────────────────────────────────┘

SCENARIO B: Full run exceeds 25s hard limit
  ┌──────────────────────────────────────────────────────────────┐
  │  Run timer fires                                             │
  │  Emit SSE event: { type: "timeout",                          │
  │    message: "Analysis timed out. Partial results shown." }   │
  │  Return best available evidence                              │
  │  AI call skipped, rule-based summary returned                │
  │  Frontend shows partial answer with timeout badge            │
  └──────────────────────────────────────────────────────────────┘

SCENARIO C: Authentication cookie expired during run
  ┌──────────────────────────────────────────────────────────────┐
  │  Backend detects expired JWT on SSE connection               │
  │  Emit SSE event: { type: "auth_expired",                     │
  │    message: "Session expired. Please log in again." }        │
  │  Close SSE stream                                            │
  │  Frontend redirects to /auth/login                           │
  └──────────────────────────────────────────────────────────────┘

SCENARIO D: DO Inference Router unavailable
  ┌──────────────────────────────────────────────────────────────┐
  │  AI call fails (timeout or 5xx)                              │
  │  Backend uses rule-based analyzer output as fallback         │
  │  Return: { answer: rule_based_summary,                       │
  │    confidence: "RULE_BASED",                                 │
  │    ai_unavailable: true }                                    │
  │  Frontend shows "AI unavailable, showing diagnostic rules"   │
  └──────────────────────────────────────────────────────────────┘

SCENARIO E: Rate limit exceeded
  ┌──────────────────────────────────────────────────────────────┐
  │  slowapi fires 429                                           │
  │  Response: { "error": "Rate limit exceeded",                 │
  │    "retry_after": 1,                                         │
  │    "request_id": "uuid" }                                    │
  │  Frontend shows: "Too many requests. Retry in 1s."           │
  └──────────────────────────────────────────────────────────────┘
```

---

## 9. Deployment Flow (DO App Platform)

```
DEVELOPER MACHINE              GITHUB               DO APP PLATFORM
      │                           │                       │
      │  git push origin main     │                       │
      │──────────────────────────►│                       │
      │                           │  Webhook trigger      │
      │                           │──────────────────────►│
      │                           │                       │
      │                           │       ┌───────────────────────────────┐
      │                           │       │  Build: api service            │
      │                           │       │  cd backend &&                 │
      │                           │       │  pip install -r requirements.txt│
      │                           │       └───────────────────────────────┘
      │                           │                       │
      │                           │       ┌───────────────────────────────┐
      │                           │       │  Build: web service            │
      │                           │       │  cd frontend &&                │
      │                           │       │  npm install && npm run build  │
      │                           │       └───────────────────────────────┘
      │                           │                       │
      │                           │       ┌───────────────────────────────┐
      │                           │       │  Inject env vars (from        │
      │                           │       │  App Platform secrets):       │
      │                           │       │  DO_OAUTH_CLIENT_ID           │
      │                           │       │  DO_OAUTH_CLIENT_SECRET       │
      │                           │       │  JWT_SECRET_KEY               │
      │                           │       │  MODEL_ACCESS_KEY             │
      │                           │       └───────────────────────────────┘
      │                           │                       │
      │                           │       ┌───────────────────────────────┐
      │                           │       │  Start api:                   │
      │                           │       │  uvicorn main:app             │
      │                           │       │  --host 0.0.0.0 --port 8080   │
      │                           │       │                               │
      │                           │       │  Health check: GET /health    │
      │                           │       │  Must return 200 in 30s       │
      │                           │       │  or rollback                  │
      │                           │       └───────────────────────────────┘
      │                           │                       │
      │                           │       ┌───────────────────────────────┐
      │                           │       │  Start web:                   │
      │                           │       │  npm start                    │
      │                           │       │  (Next.js on port 3000)       │
      │                           │       └───────────────────────────────┘
      │                           │                       │
      │                           │       ┌───────────────────────────────┐
      │                           │       │  Traffic routing:             │
      │                           │       │  your-app.com → web service   │
      │                           │       │  api.your-app.com → api svc   │
      │                           │       │  HTTPS auto via Let's Encrypt │
      │                           │       └───────────────────────────────┘
      │                           │                       │
      │       Deploy complete notification                 │
      │◄──────────────────────────────────────────────────│
```

---

## 10. Data Freshness and Cache Flow

```
FIRST CLUSTER SCAN (user selects cluster)
         │
         ▼
  Backend reads K8s fresh ──► Stores in memory cache
  ┌─────────────────────────────────────────────────────────────┐
  │  cache[user_id + cluster_id] = {                            │
  │    data: redacted_scan_result,                              │
  │    fetched_at: now(),                                       │
  │    ttl: 120s                                                │
  │  }                                                          │
  └─────────────────────────────────────────────────────────────┘
         │
         ▼  Response includes:
         ┌──────────────────────────────────┐
         │  data_read_at: "2026-06-24T..."  │
         │  cache_age_seconds: 0            │
         └──────────────────────────────────┘

DASHBOARD AUTO-REFRESH (every 30s)
         │
         ▼
  Frontend fires POST /api/clusters/{id}/scan
  Backend checks cache age:
  ┌────────────────────────────────────────────────────┐
  │  cache_age < 120s?  ──► Return cached data         │
  │  cache_age >= 120s? ──► Re-scan K8s, update cache  │
  └────────────────────────────────────────────────────┘

AGENT RUN (user asks question)
         │
         ▼
  Planner decides which resources to read
  Agent tools ALWAYS do fresh K8s reads
  (cache is only for dashboard, not agent runs)
  ┌────────────────────────────────────────────────────┐
  │  get_services()   → fresh K8s call                 │
  │  get_endpoints()  → fresh K8s call                 │
  │  get_pods()       → fresh K8s call                 │
  │  etc.                                              │
  └────────────────────────────────────────────────────┘
         │
         ▼
  Evidence metadata includes:
  ┌────────────────────────────────────────────────────┐
  │  data_read_at: timestamp per tool                  │
  │  staleness_warning: true if any tool > 30s old     │
  └────────────────────────────────────────────────────┘
```

---

## 11. Team Selection Flow

```
USER BROWSER                  FRONTEND                    FASTAPI BACKEND         DIGITALOCEAN
     │                              │                            │                       │
     │  After OAuth login,          │                            │                       │
     │  app loads dashboard         │                            │                       │
     │                              │                            │                       │
     │                              │  GET /api/teams            │                       │
     │                              │  (cookie auto-sent)        │                       │
     │                              │───────────────────────────►│                       │
     │                              │                            │  GET /v2/account      │
     │                              │                            │───────────────────────►
     │                              │                            │  { account: { team } }│
     │                              │                            │◄───────────────────────
     │                              │  200 { teams: [...],       │                       │
     │                              │    selected_team_id }      │                       │
     │                              │◄───────────────────────────│                       │
     │                              │                            │                       │
     │  If no team selected:        │                            │                       │
     │  Auto-select first team      │                            │                       │
     │                              │                            │                       │
     │                              │  POST /api/teams/{id}/     │                       │
     │                              │  select                    │                       │
     │                              │───────────────────────────►│                       │
     │                              │                            │  Validate team exists │
     │                              │                            │  Set selected_team_id │
     │                              │                            │  cookie (7 days)      │
     │                              │  Set-Cookie:               │                       │
     │                              │  selected_team_id=<uuid>   │                       │
     │                              │  200 { status: "ok" }      │                       │
     │                              │◄───────────────────────────│                       │
     │                              │                            │                       │
     │  Team selected,              │                            │                       │
     │  now load clusters           │                            │                       │
     │                              │                            │                       │
     │                              │  POST /api/clusters        │                       │
     │                              │  (team cookie sent)        │                       │
     │                              │───────────────────────────►│                       │
     │                              │                            │  Check selected_team  │
     │                              │                            │  cookie present       │
     │                              │                            │                       │
     │                              │                            │  GET /v2/kubernetes/  │
     │                              │                            │  clusters             │
     │                              │                            │───────────────────────►
     │                              │                            │  Sort alphabetically  │
     │                              │                            │  Set first as default │
     │                              │                            │                       │
     │                              │  200 {                     │                       │
     │                              │    selected_team_id,       │                       │
     │                              │    default_selected_       │                       │
     │                              │    cluster_id,             │                       │
     │                              │    clusters: [sorted]      │                       │
     │                              │  }                         │                       │
     │                              │◄───────────────────────────│                       │
     │                              │                            │                       │
     │  Auto-select default         │                            │                       │
     │  cluster, trigger scan       │                            │                       │
     │                              │                            │                       │
     │  Dashboard loads with        │                            │                       │
     │  health data                 │                            │                       │
     │◄─────────────────────────────│                            │                       │
```

### Team Required Error Flow

```
FRONTEND                           FASTAPI BACKEND
   │                                      │
   │  POST /api/clusters                  │
   │  (NO selected_team_id cookie)        │
   │─────────────────────────────────────►│
   │                                      │  Check: team context?
   │                                      │  Missing!
   │                                      │
   │  400 {                               │
   │    "error": "Team selection required"│
   │    "code": "ACTION_REQUIRED_TEAM_    │
   │            SELECTION"                │
   │    "message": "Select team first"    │
   │  }                                   │
   │◄─────────────────────────────────────│
   │                                      │
   │  Frontend detects code               │
   │  Shows team selection prompt         │
   │  User must select team before        │
   │  cluster list loads                  │
```
