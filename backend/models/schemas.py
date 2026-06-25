from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field


# Team models
class Team(BaseModel):
    id: str
    name: str
    uuid: Optional[str] = None


class TeamListResponse(BaseModel):
    teams: List[Team]
    selected_team_id: Optional[str] = None


class TeamSelectRequest(BaseModel):
    team_id: str


# Cluster models
class ClusterInfo(BaseModel):
    id: str
    name: str
    region: Optional[str] = None
    version: Optional[str] = None


class ClustersResponse(BaseModel):
    selected_team_id: str
    default_selected_cluster_id: Optional[str] = None
    clusters: List[ClusterInfo]
    message: Optional[str] = None


class Issue(BaseModel):
    severity: Literal["critical", "warning", "info"]
    resource: str
    namespace: Optional[str] = None
    type: str
    evidence: List[str]
    suggested_fix: str


class ClusterScanResult(BaseModel):
    cluster_name: str
    summary: Dict[str, Any]
    issues: List[Issue]
    raw_context: Dict[str, Any]
    data_freshness_seconds: int = 0


class ChatRequest(BaseModel):
    cluster_id: str
    question: str = Field(min_length=3, max_length=2000)
    mode: Literal["fast", "deep"] = "fast"


class ChatResponse(BaseModel):
    answer: str
    evidence: List[str]
    confidence: Literal["high", "medium", "low"]
    verification_commands: List[str]


class AgentRunCreateRequest(BaseModel):
    cluster_id: str
    question: str = Field(min_length=3, max_length=2000)
    mode: Literal["fast", "deep"] = "fast"


class AgentRunCreated(BaseModel):
    run_id: str
    status: Literal["queued", "running", "completed", "failed"]


class AgentRunEvent(BaseModel):
    run_id: str
    stage: Literal["discover", "gather", "analyze", "answer", "done", "error"]
    message: str
    timestamp: str
    payload: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    error: str
    code: Optional[str] = None
    request_id: Optional[str] = None


class ActionRequiredResponse(BaseModel):
    error: str
    code: Literal["ACTION_REQUIRED_TEAM_SELECTION"]
    message: str
    request_id: Optional[str] = None
