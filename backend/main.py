import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse

from auth.jwt_utils import JWTManager
from auth.oauth_service import OAuthService
from config import load_settings
from logging_config import RequestLoggerAdapter, configure_logging
from middleware.error_handler import register_error_handlers
from middleware.request_id import RequestIDMiddleware
from models.schemas import AgentRunCreateRequest, ChatRequest, TeamSelectRequest
from services.ai_service import AIService
from services.analyzer_service import AnalyzerService
from services.digitalocean_service import DigitalOceanService
from services.kubernetes_service import KubernetesService
from utils.redactor import redact_object


settings = load_settings()
configure_logging(settings.log_level)
logger = logging.getLogger("doks_doctor")

jwt_manager = JWTManager(
    secret=settings.jwt_secret_key,
    algorithm=settings.jwt_algorithm,
    expiry_days=settings.jwt_expiry_days,
)
oauth_service = OAuthService(
    client_id=settings.do_oauth_client_id,
    client_secret=settings.do_oauth_client_secret,
    redirect_uri=settings.do_oauth_redirect_uri,
)
do_service = DigitalOceanService()
k8s_service = KubernetesService()
analyzer_service = AnalyzerService()
ai_service = AIService(
    base_url=settings.ai_base_url,
    api_key=settings.model_access_key,
    model=settings.ai_model,
)

app = FastAPI(title="DOKS Doctor AI API", version="0.1.0")
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)

RUNS: Dict[str, Dict[str, Any]] = {}
SNAPSHOT_CACHE: Dict[str, Dict[str, Any]] = {}


def _request_logger(request: Request) -> RequestLoggerAdapter:
    return RequestLoggerAdapter(logger, {"request_id": getattr(request.state, "request_id", "-")})


def _get_auth_payload(request: Request) -> Dict[str, Any]:
    auth_token = request.cookies.get("auth_token")
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = jwt_manager.verify_token(auth_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return payload


def _get_do_token(request: Request) -> str:
    do_token = request.cookies.get("do_token")
    if not do_token:
        raise HTTPException(status_code=401, detail="DigitalOcean token unavailable")
    return do_token


def _get_selected_team_id(request: Request) -> str | None:
    """Get selected team ID from signed cookie. Returns None if not selected."""
    team_cookie = request.cookies.get("selected_team_id")
    return team_cookie


def _require_selected_team(request: Request) -> str:
    """Require team selection. Raises 400 if not selected."""
    team_id = _get_selected_team_id(request)
    if not team_id:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Team selection required",
                "code": "ACTION_REQUIRED_TEAM_SELECTION",
                "message": "Select team first",
            },
        )
    return team_id


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _emit(run_id: str, stage: str, message: str, payload: Dict[str, Any] | None = None) -> None:
    event = {
        "run_id": run_id,
        "stage": stage,
        "message": message,
        "timestamp": _now_iso(),
        "payload": payload or {},
    }
    RUNS[run_id]["events"].append(event)


@app.get("/")
def root() -> Dict[str, str]:
    return {"name": "DOKS Doctor AI API", "status": "running"}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "time": _now_iso()}


@app.get("/auth/login")
def auth_login() -> Response:
    return RedirectResponse(url=oauth_service.get_oauth_url())


@app.get("/auth/callback")
def auth_callback(code: str) -> Response:
    tokens = oauth_service.exchange_code_for_token(code)
    account = oauth_service.get_account(tokens["access_token"])

    auth_token = jwt_manager.create_token(
        {
            "user_id": account.get("uuid", "unknown"),
            "email": account.get("email", "unknown"),
        }
    )

    response = RedirectResponse(url="/")
    max_age = settings.jwt_expiry_days * 24 * 60 * 60

    response.set_cookie(
        key="auth_token",
        value=auth_token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key="do_token",
        value=tokens["access_token"],
        max_age=60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return response


@app.post("/auth/logout")
def auth_logout() -> Dict[str, str]:
    response = Response(content=json.dumps({"status": "ok"}), media_type="application/json")
    response.delete_cookie("auth_token", path="/")
    response.delete_cookie("do_token", path="/")
    return response


@app.get("/api/me")
def api_me(request: Request) -> Dict[str, Any]:
    payload = _get_auth_payload(request)
    return {
        "user_id": payload.get("user_id"),
        "email": payload.get("email"),
        "expires": payload.get("exp"),
        "selected_team_id": _get_selected_team_id(request),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Team Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/teams")
def api_teams(request: Request) -> Dict[str, Any]:
    """List teams accessible by the authenticated user."""
    log = _request_logger(request)
    _get_auth_payload(request)
    do_token = _get_do_token(request)

    teams = do_service.list_teams(do_token)
    selected_team_id = _get_selected_team_id(request)

    log.info("Loaded teams", extra={"team_count": len(teams)})
    return {
        "teams": [
            {"id": t.get("id"), "name": t.get("name"), "uuid": t.get("uuid")}
            for t in teams
        ],
        "selected_team_id": selected_team_id,
    }


@app.post("/api/teams/{team_id}/select")
def api_select_team(team_id: str, request: Request) -> Response:
    """Select a team for cluster operations. Stores selection in secure cookie."""
    log = _request_logger(request)
    _get_auth_payload(request)
    do_token = _get_do_token(request)

    # Validate team exists for this user
    teams = do_service.list_teams(do_token)
    team = next((t for t in teams if t.get("id") == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Set selected team in cookie
    response = Response(
        content=json.dumps({"status": "ok", "selected_team_id": team_id}),
        media_type="application/json",
    )
    response.set_cookie(
        key="selected_team_id",
        value=team_id,
        max_age=settings.jwt_expiry_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )

    log.info("Team selected", extra={"team_id": team_id})
    return response


# ─────────────────────────────────────────────────────────────────────────────
# Cluster Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@app.post("/api/clusters")
def api_clusters(request: Request) -> Dict[str, Any]:
    """
    List clusters for the selected team.
    
    Requires team selection. Returns clusters sorted alphabetically by name
    with the first cluster marked as default_selected_cluster_id.
    """
    log = _request_logger(request)
    _get_auth_payload(request)
    do_token = _get_do_token(request)
    selected_team_id = _require_selected_team(request)

    # Fetch clusters sorted alphabetically
    clusters = do_service.list_clusters(do_token, team_id=selected_team_id, sort=True)
    
    # Build response with default selection
    cluster_list = [
        {
            "id": cluster.get("id"),
            "name": cluster.get("name"),
            "region": cluster.get("region"),
            "version": cluster.get("version"),
        }
        for cluster in clusters
    ]
    
    default_selected_cluster_id = cluster_list[0]["id"] if cluster_list else None
    message = None if cluster_list else "No clusters found for selected team"

    log.info("Loaded clusters", extra={
        "team_id": selected_team_id,
        "cluster_count": len(cluster_list),
        "default_cluster_id": default_selected_cluster_id,
    })
    
    return {
        "selected_team_id": selected_team_id,
        "default_selected_cluster_id": default_selected_cluster_id,
        "clusters": cluster_list,
        "message": message,
    }


@app.post("/api/clusters/{cluster_id}/scan")
def api_scan_cluster(cluster_id: str, request: Request) -> Dict[str, Any]:
    """Scan a cluster. Requires team selection and validates cluster belongs to team."""
    log = _request_logger(request)
    payload = _get_auth_payload(request)
    do_token = _get_do_token(request)
    selected_team_id = _require_selected_team(request)

    cache_key = f"{payload.get('user_id')}:{selected_team_id}:{cluster_id}"
    cached = SNAPSHOT_CACHE.get(cache_key)
    if cached and time.time() - cached["created_at"] < 120:
        log.info("Returning cached scan", extra={"cluster_id": cluster_id})
        return cached["data"]

    # Validate cluster belongs to selected team
    clusters = do_service.list_clusters(do_token, team_id=selected_team_id)
    selected = next((c for c in clusters if c.get("id") == cluster_id), None)
    if not selected:
        raise HTTPException(status_code=404, detail="Cluster not found in selected team")

    kubeconfig = do_service.fetch_kubeconfig(do_token, cluster_id)
    raw_context = k8s_service.scan_cluster(kubeconfig)
    redacted = redact_object(raw_context)
    analysis = analyzer_service.analyze_cluster(selected.get("name", cluster_id), redacted)
    analysis["data_freshness_seconds"] = 0
    analysis["selected_team_id"] = selected_team_id

    SNAPSHOT_CACHE[cache_key] = {
        "created_at": time.time(),
        "data": analysis,
    }
    log.info("Scan complete", extra={"cluster_id": cluster_id, "team_id": selected_team_id})
    return analysis


@app.post("/api/chat")
def api_chat(payload: ChatRequest, request: Request) -> Dict[str, Any]:
    _get_auth_payload(request)
    scan_result = api_scan_cluster(payload.cluster_id, request)
    redacted = redact_object(scan_result)

    response = ai_service.ask(payload.question, redacted)
    return {
        "answer": response["answer"],
        "evidence": response.get("evidence", []),
        "confidence": response.get("confidence", "medium"),
        "verification_commands": response.get("verification_commands", []),
        "data_freshness_seconds": int(time.time() - SNAPSHOT_CACHE[f"{_get_auth_payload(request).get('user_id')}:{payload.cluster_id}"]["created_at"]),
    }


@app.post("/api/agent/runs")
def api_create_run(payload: AgentRunCreateRequest, request: Request) -> Dict[str, Any]:
    user = _get_auth_payload(request)
    run_id = str(uuid.uuid4())

    RUNS[run_id] = {
        "run_id": run_id,
        "user_id": user.get("user_id"),
        "status": "running",
        "events": [],
        "result": None,
    }

    _emit(run_id, "discover", "Understanding question intent")
    scan = api_scan_cluster(payload.cluster_id, request)
    _emit(run_id, "gather", "Read live cluster resources", {"resources": ["pods", "services", "events", "nodes"]})

    evidence = [
        f"Pods unhealthy: {scan['summary'].get('pods_unhealthy', 0)}",
        f"Nodes not ready: {scan['summary'].get('nodes_not_ready', 0)}",
        f"Issues detected: {scan['summary'].get('issues_total', 0)}",
    ]
    _emit(run_id, "analyze", "Analyzing likely root causes", {"evidence": evidence})

    answer = ai_service.ask(payload.question, redact_object(scan))
    _emit(run_id, "answer", "Composed answer with evidence")
    _emit(run_id, "done", "Run completed")

    RUNS[run_id]["status"] = "completed"
    RUNS[run_id]["result"] = {
        **answer,
        "evidence": answer.get("evidence") or evidence,
        "data_freshness_seconds": int(time.time() - SNAPSHOT_CACHE[f"{user.get('user_id')}:{payload.cluster_id}"]["created_at"]),
    }

    return {"run_id": run_id, "status": RUNS[run_id]["status"]}


@app.get("/api/agent/runs/{run_id}/events")
def api_stream_run_events(run_id: str, request: Request) -> StreamingResponse:
    user = _get_auth_payload(request)
    run = RUNS.get(run_id)
    if not run or run.get("user_id") != user.get("user_id"):
        raise HTTPException(status_code=404, detail="Run not found")

    def event_stream():
        for event in run["events"]:
            yield f"event: stage\ndata: {json.dumps(event)}\n\n"
        if run.get("result"):
            yield f"event: result\ndata: {json.dumps(run['result'])}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/api/agent/runs/{run_id}")
def api_get_run(run_id: str, request: Request) -> Dict[str, Any]:
    user = _get_auth_payload(request)
    run = RUNS.get(run_id)
    if not run or run.get("user_id") != user.get("user_id"):
        raise HTTPException(status_code=404, detail="Run not found")
    return {"run_id": run_id, "status": run["status"], "result": run.get("result")}


@app.post("/api/agent/tools/get_pods")
def tool_get_pods(cluster_id: str, request: Request) -> Dict[str, Any]:
    scan = api_scan_cluster(cluster_id, request)
    return {"pods": scan.get("raw_context", {}).get("pods", [])[:200]}


@app.post("/api/agent/tools/get_events")
def tool_get_events(cluster_id: str, request: Request) -> Dict[str, Any]:
    scan = api_scan_cluster(cluster_id, request)
    return {"events": scan.get("raw_context", {}).get("events", [])[:200]}


@app.post("/api/agent/tools/get_services")
def tool_get_services(cluster_id: str, request: Request) -> Dict[str, Any]:
    scan = api_scan_cluster(cluster_id, request)
    return {"services": scan.get("raw_context", {}).get("services", [])}


@app.post("/api/agent/tools/get_endpoints")
def tool_get_endpoints(cluster_id: str, request: Request) -> Dict[str, Any]:
    scan = api_scan_cluster(cluster_id, request)
    return {"endpoints": scan.get("raw_context", {}).get("endpoints", [])}


@app.post("/api/agent/tools/get_nodes")
def tool_get_nodes(cluster_id: str, request: Request) -> Dict[str, Any]:
    scan = api_scan_cluster(cluster_id, request)
    return {"nodes": scan.get("raw_context", {}).get("nodes", [])}


@app.post("/api/agent/tools/get_deployments")
def tool_get_deployments(cluster_id: str, request: Request) -> Dict[str, Any]:
    scan = api_scan_cluster(cluster_id, request)
    return {"deployments": scan.get("raw_context", {}).get("deployments", [])}


@app.post("/api/agent/tools/get_ingress")
def tool_get_ingress(cluster_id: str, request: Request) -> Dict[str, Any]:
    scan = api_scan_cluster(cluster_id, request)
    return {"ingresses": scan.get("raw_context", {}).get("ingresses", [])}


@app.post("/api/agent/tools/get_logs")
def tool_get_logs(cluster_id: str, pod_name: str, request: Request) -> Dict[str, Any]:
    scan = api_scan_cluster(cluster_id, request)
    pods = scan.get("raw_context", {}).get("pods", [])
    pod = next((p for p in pods if p.get("name") == pod_name), None)
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    logs = (pod.get("recent_logs") or "").splitlines()[-100:]
    return {"pod": pod_name, "logs": logs}
