# DOKS Doctor AI — Complete Copilot Build Plan

## Project Name

```txt
doks-doctor-ai
```

## App Name

```txt
DOKS Doctor AI
```

## Project Description

Build **DOKS Doctor AI**, an AI-powered Kubernetes troubleshooting assistant for DigitalOcean Kubernetes Service, also known as DOKS.

The app allows a user to enter a DigitalOcean API token, select one of their DOKS clusters, scan that cluster using read-only Kubernetes API calls, view a cluster health summary, and ask an AI chatbot questions about cluster problems.

The chatbot should help answer questions like:

```txt
Why is my pod crashing?
Why is my website not reachable?
What is wrong with my cluster?
Which issue should I fix first?
Why is my deployment stuck?
Give me the kubectl command to verify this.
```

The app should automatically read Kubernetes details from the selected DOKS cluster and explain issues using evidence from pods, events, services, endpoints, ingress, deployments, nodes, and recent pod logs.

---

# 1. Main Goal

Build an AI chatbot that can troubleshoot a DigitalOcean Kubernetes cluster.

The user should be able to:

1. Paste a DigitalOcean API token.
2. View available DOKS clusters.
3. Select a cluster.
4. Let the backend fetch the kubeconfig.
5. Let the backend scan the Kubernetes cluster safely.
6. View a health summary.
7. Ask questions about cluster errors.
8. Receive answers with evidence, likely root cause, suggested fix, and verification command.

---

# 2. MVP Scope

For the first version, build only these features:

## Feature 1: DigitalOcean Token Input

The user pastes their DigitalOcean API token.

Important rules:

```txt
Do not store the token permanently.
Do not store the token in localStorage.
Do not print the token in logs.
Do not send the token to AI.
Use the token only for the current session.
```

---

## Feature 2: List DOKS Clusters

Use the DigitalOcean API to list Kubernetes clusters connected to that token.

Example UI:

```txt
Available clusters:

1. production-cluster
2. staging-cluster
3. dev-cluster
```

The user selects one cluster.

---

## Feature 3: Fetch Kubeconfig

After the user selects a cluster, the backend fetches the kubeconfig for that DOKS cluster.

Then the backend uses the Kubernetes Python client to read cluster resources.

---

## Feature 4: Read-Only Cluster Scan

Collect only safe read-only information:

```txt
Namespaces
Pods
Pod statuses
Restart counts
Kubernetes events
Deployments
ReplicaSets
Services
Endpoints
Ingress
Nodes
Recent pod logs
Resource requests and limits
```

Important:

```txt
Do not read Kubernetes Secrets.
Do not modify Kubernetes resources.
Do not run fix commands automatically.
Only scan and suggest.
```

---

## Feature 5: AI Health Summary

Generate a summary like:

```txt
Cluster Health Summary

Critical:
- checkout-service is in CrashLoopBackOff.
- frontend-service has no endpoints.

Warnings:
- worker pod restarted 9 times in the last hour.
- api-deployment has no CPU or memory limits.

Healthy:
- 14 pods running.
- 3 services active.
- 2 nodes ready.
```

---

## Feature 6: Chatbot

The user can ask questions about the selected cluster.

Example:

```txt
User:
Why is frontend not working?

AI:
The frontend service is not receiving traffic because its Service selector does not match any pod labels.

Evidence:
- Service selector: app=frontend
- Running pod label: app=web
- Service endpoints: 0

Likely root cause:
The Service selector does not match the labels on the running frontend pods.

Suggested fix:
Update the Service selector to app=web or change the pod label to app=frontend.

Verification command:
kubectl get endpoints frontend-service -n default
```

---

# 3. Recommended Tech Stack

Use this stack:

```txt
Frontend:
Next.js
React
TypeScript

Backend:
Python FastAPI

Kubernetes Access:
Python Kubernetes client

DigitalOcean API:
requests

AI:
OpenAI-compatible API
DigitalOcean Gradient AI or another OpenAI-compatible model provider

Database:
None for MVP

Hosting:
DigitalOcean App Platform
```

For the MVP, skip PostgreSQL unless saved history is needed.

---

# 4. App Architecture

```txt
User Browser
    ↓
Next.js Frontend
    ↓
FastAPI Backend
    ↓
DigitalOcean API
    ↓
Fetch DOKS clusters and kubeconfig
    ↓
Kubernetes API Client
    ↓
Read pods, events, services, logs, ingress
    ↓
Cluster Analyzer
    ↓
AI Model
    ↓
Chatbot Response
```

---

# 5. Repository Structure

Create this folder structure:

```txt
doks-doctor-ai/
  frontend/
    app/
      page.tsx
      components/
        TokenForm.tsx
        ClusterSelector.tsx
        HealthDashboard.tsx
        ChatBox.tsx
      lib/
        api.ts
    package.json
    tsconfig.json
    next.config.js
    .env.local.example

  backend/
    main.py
    requirements.txt
    services/
      digitalocean_service.py
      kubernetes_service.py
      analyzer_service.py
      ai_service.py
    models/
      schemas.py
    utils/
      redactor.py
    .env.example

  README.md
```

---

# 6. Backend Modules

Create these backend modules:

```txt
backend/
  main.py
  services/
    digitalocean_service.py
    kubernetes_service.py
    analyzer_service.py
    ai_service.py
  models/
    schemas.py
  utils/
    redactor.py
```

---

## 6.1 digitalocean_service.py

Responsible for:

```txt
Validate DigitalOcean token
List DOKS clusters
Fetch kubeconfig
```

---

## 6.2 kubernetes_service.py

Responsible for:

```txt
Connect to cluster using kubeconfig
List namespaces
List pods
List events
List services
List endpoints
List ingress
List nodes
List deployments
List ReplicaSets
Read recent logs
```

Do not read Kubernetes Secrets.

---

## 6.3 analyzer_service.py

Responsible for rule-based pre-analysis.

Detect:

```txt
CrashLoopBackOff
ImagePullBackOff
Pending pods
Services with no endpoints
Ingress without valid backend service
High restart counts
Nodes not ready
Missing resource limits
```

This is important because AI should not do everything. The app should first extract strong signals, then send summarized evidence to AI.

---

## 6.4 ai_service.py

Responsible for:

```txt
Create strict prompt
Send summarized cluster context to AI model
Return answer with evidence and fix
```

---

## 6.5 redactor.py

Responsible for removing sensitive data:

```txt
Secret values
Tokens
Passwords
Private keys
Authorization headers
Database URLs
API keys
```

---

# 7. Backend API Endpoints

Use FastAPI.

Create these endpoints:

```txt
POST /api/token/validate
POST /api/clusters
POST /api/clusters/{cluster_id}/connect
POST /api/clusters/{cluster_id}/scan
POST /api/chat
```

Use `POST` instead of `GET` for token-based actions because tokens should not be placed in URLs.

---

## 7.1 POST /api/token/validate

Input:

```json
{
  "token": "digitalocean-token"
}
```

Output:

```json
{
  "valid": true
}
```

Purpose:

```txt
Check whether the DigitalOcean token works.
```

---

## 7.2 POST /api/clusters

Input:

```json
{
  "token": "digitalocean-token"
}
```

Output:

```json
{
  "clusters": [
    {
      "id": "cluster-id",
      "name": "production-cluster",
      "region": "nyc1",
      "version": "1.30"
    }
  ]
}
```

Purpose:

```txt
Return the user's DOKS clusters.
```

---

## 7.3 POST /api/clusters/{cluster_id}/connect

Input:

```json
{
  "token": "digitalocean-token"
}
```

Output:

```json
{
  "connected": true
}
```

Purpose:

```txt
Fetch kubeconfig and verify that the backend can connect to the selected cluster.
```

---

## 7.4 POST /api/clusters/{cluster_id}/scan

Input:

```json
{
  "token": "digitalocean-token"
}
```

Flow:

```txt
1. Fetch kubeconfig from DigitalOcean.
2. Connect to Kubernetes cluster.
3. Scan read-only resources.
4. Redact sensitive data.
5. Analyze issues.
6. Return health summary.
```

Output:

```json
{
  "cluster_name": "demo-cluster",
  "summary": {
    "pods_total": 18,
    "pods_running": 15,
    "pods_unhealthy": 3,
    "nodes_ready": 2,
    "nodes_not_ready": 0,
    "services_total": 5,
    "deployments_total": 4
  },
  "issues": [],
  "raw_context": {}
}
```

---

## 7.5 POST /api/chat

Input:

```json
{
  "question": "Why is frontend not reachable?",
  "cluster_context": {}
}
```

Flow:

```txt
1. Redact cluster context.
2. Send question and cluster context to AI.
3. Return AI answer.
```

Output:

```json
{
  "answer": "..."
}
```

---

# 8. Backend Pydantic Models

Create:

```txt
backend/models/schemas.py
```

Add:

```python
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class TokenRequest(BaseModel):
    token: str


class ClusterRequest(BaseModel):
    token: str


class ClusterConnectRequest(BaseModel):
    token: str


class ClusterScanRequest(BaseModel):
    token: str


class ClusterInfo(BaseModel):
    id: str
    name: str
    region: Optional[str] = None
    version: Optional[str] = None


class ChatRequest(BaseModel):
    question: str
    cluster_context: Dict[str, Any]


class Issue(BaseModel):
    severity: str
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
```

---

# 9. DigitalOcean Service

Create:

```txt
backend/services/digitalocean_service.py
```

Implementation:

```python
import requests


DO_API_BASE = "https://api.digitalocean.com/v2"


def get_headers(token: str):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def validate_token(token: str) -> bool:
    response = requests.get(
        f"{DO_API_BASE}/account",
        headers=get_headers(token),
        timeout=15,
    )

    return response.status_code == 200


def list_clusters(token: str):
    response = requests.get(
        f"{DO_API_BASE}/kubernetes/clusters",
        headers=get_headers(token),
        timeout=20,
    )

    response.raise_for_status()
    data = response.json()

    return data.get("kubernetes_clusters", [])


def fetch_kubeconfig(token: str, cluster_id: str) -> str:
    response = requests.get(
        f"{DO_API_BASE}/kubernetes/clusters/{cluster_id}/kubeconfig",
        headers=get_headers(token),
        timeout=20,
    )

    response.raise_for_status()

    return response.text
```

---

# 10. Kubernetes Service

Create:

```txt
backend/services/kubernetes_service.py
```

Responsibilities:

```txt
Connect using kubeconfig
Read namespaces
Read pods
Read pod statuses
Read deployments
Read ReplicaSets
Read services
Read endpoints
Read ingress
Read nodes
Read recent pod logs
Read Kubernetes events
```

Important:

```txt
Do not read Kubernetes Secrets.
Use read-only Kubernetes API calls only.
Return compact JSON, not full Kubernetes objects.
```

Implementation outline:

```python
import os
import tempfile
from kubernetes import client, config


def create_clients_from_kubeconfig(kubeconfig_text: str):
    temp_file_path = None

    try:
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as temp_file:
            temp_file.write(kubeconfig_text)
            temp_file_path = temp_file.name

        config.load_kube_config(config_file=temp_file_path)

        return {
            "core": client.CoreV1Api(),
            "apps": client.AppsV1Api(),
            "networking": client.NetworkingV1Api(),
        }

    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


def scan_cluster(kubeconfig_text: str):
    clients = create_clients_from_kubeconfig(kubeconfig_text)

    core = clients["core"]
    apps = clients["apps"]
    networking = clients["networking"]

    namespaces = core.list_namespace()
    pods = core.list_pod_for_all_namespaces()
    services = core.list_service_for_all_namespaces()
    endpoints = core.list_endpoints_for_all_namespaces()
    events = core.list_event_for_all_namespaces()
    nodes = core.list_node()
    deployments = apps.list_deployment_for_all_namespaces()
    replicasets = apps.list_replica_set_for_all_namespaces()

    try:
        ingresses = networking.list_ingress_for_all_namespaces()
    except Exception:
        ingresses = None

    return {
        "namespaces": serialize_namespaces(namespaces),
        "pods": serialize_pods(core, pods),
        "services": serialize_services(services),
        "endpoints": serialize_endpoints(endpoints),
        "events": serialize_events(events),
        "nodes": serialize_nodes(nodes),
        "deployments": serialize_deployments(deployments),
        "replicasets": serialize_replicasets(replicasets),
        "ingresses": serialize_ingresses(ingresses),
    }


def serialize_namespaces(namespaces):
    return [
        {
            "name": item.metadata.name,
            "status": item.status.phase,
        }
        for item in namespaces.items
    ]


def serialize_pods(core, pods):
    result = []

    for pod in pods.items:
        container_statuses = []

        if pod.status.container_statuses:
            for status in pod.status.container_statuses:
                state = {}

                if status.state.waiting:
                    state["waiting"] = {
                        "reason": status.state.waiting.reason,
                        "message": status.state.waiting.message,
                    }

                if status.state.running:
                    state["running"] = {
                        "started_at": str(status.state.running.started_at),
                    }

                if status.state.terminated:
                    state["terminated"] = {
                        "reason": status.state.terminated.reason,
                        "message": status.state.terminated.message,
                        "exit_code": status.state.terminated.exit_code,
                    }

                last_state = {}

                if status.last_state and status.last_state.terminated:
                    last_state["terminated"] = {
                        "reason": status.last_state.terminated.reason,
                        "message": status.last_state.terminated.message,
                        "exit_code": status.last_state.terminated.exit_code,
                    }

                container_statuses.append(
                    {
                        "name": status.name,
                        "image": status.image,
                        "ready": status.ready,
                        "restart_count": status.restart_count,
                        "state": state,
                        "last_state": last_state,
                    }
                )

        container_resources = []

        if pod.spec.containers:
            for container in pod.spec.containers:
                resources = container.resources

                container_resources.append(
                    {
                        "name": container.name,
                        "image": container.image,
                        "requests": resources.requests if resources and resources.requests else {},
                        "limits": resources.limits if resources and resources.limits else {},
                    }
                )

        recent_logs = ""

        try:
            recent_logs = core.read_namespaced_pod_log(
                name=pod.metadata.name,
                namespace=pod.metadata.namespace,
                tail_lines=30,
                timestamps=True,
            )
        except Exception as exc:
            recent_logs = f"Could not read logs: {str(exc)}"

        result.append(
            {
                "namespace": pod.metadata.namespace,
                "name": pod.metadata.name,
                "phase": pod.status.phase,
                "pod_ip": pod.status.pod_ip,
                "node_name": pod.spec.node_name,
                "labels": pod.metadata.labels or {},
                "container_statuses": container_statuses,
                "container_resources": container_resources,
                "recent_logs": recent_logs,
            }
        )

    return result


def serialize_services(services):
    result = []

    for svc in services.items:
        ports = []

        if svc.spec.ports:
            for port in svc.spec.ports:
                ports.append(
                    {
                        "name": port.name,
                        "port": port.port,
                        "target_port": str(port.target_port),
                        "protocol": port.protocol,
                    }
                )

        result.append(
            {
                "namespace": svc.metadata.namespace,
                "name": svc.metadata.name,
                "type": svc.spec.type,
                "selector": svc.spec.selector or {},
                "cluster_ip": svc.spec.cluster_ip,
                "ports": ports,
            }
        )

    return result


def serialize_endpoints(endpoints):
    result = []

    for ep in endpoints.items:
        addresses = []

        if ep.subsets:
            for subset in ep.subsets:
                if subset.addresses:
                    for address in subset.addresses:
                        addresses.append(
                            {
                                "ip": address.ip,
                                "target_name": address.target_ref.name if address.target_ref else None,
                                "target_kind": address.target_ref.kind if address.target_ref else None,
                            }
                        )

        result.append(
            {
                "namespace": ep.metadata.namespace,
                "name": ep.metadata.name,
                "address_count": len(addresses),
                "addresses": addresses,
            }
        )

    return result


def serialize_events(events):
    return [
        {
            "namespace": item.metadata.namespace,
            "name": item.metadata.name,
            "type": item.type,
            "reason": item.reason,
            "message": item.message,
            "involved_object_kind": item.involved_object.kind if item.involved_object else None,
            "involved_object_name": item.involved_object.name if item.involved_object else None,
            "count": item.count,
            "first_timestamp": str(item.first_timestamp),
            "last_timestamp": str(item.last_timestamp),
        }
        for item in events.items
    ]


def serialize_nodes(nodes):
    result = []

    for node in nodes.items:
        conditions = []

        if node.status.conditions:
            for condition in node.status.conditions:
                conditions.append(
                    {
                        "type": condition.type,
                        "status": condition.status,
                        "reason": condition.reason,
                        "message": condition.message,
                    }
                )

        result.append(
            {
                "name": node.metadata.name,
                "conditions": conditions,
                "capacity": node.status.capacity,
                "allocatable": node.status.allocatable,
            }
        )

    return result


def serialize_deployments(deployments):
    result = []

    for deployment in deployments.items:
        containers = []

        if deployment.spec.template.spec.containers:
            for container in deployment.spec.template.spec.containers:
                containers.append(
                    {
                        "name": container.name,
                        "image": container.image,
                        "requests": container.resources.requests if container.resources and container.resources.requests else {},
                        "limits": container.resources.limits if container.resources and container.resources.limits else {},
                    }
                )

        result.append(
            {
                "namespace": deployment.metadata.namespace,
                "name": deployment.metadata.name,
                "replicas": deployment.spec.replicas,
                "ready_replicas": deployment.status.ready_replicas or 0,
                "available_replicas": deployment.status.available_replicas or 0,
                "labels": deployment.metadata.labels or {},
                "selector": deployment.spec.selector.match_labels if deployment.spec.selector else {},
                "containers": containers,
            }
        )

    return result


def serialize_replicasets(replicasets):
    return [
        {
            "namespace": item.metadata.namespace,
            "name": item.metadata.name,
            "replicas": item.spec.replicas,
            "ready_replicas": item.status.ready_replicas or 0,
            "available_replicas": item.status.available_replicas or 0,
            "labels": item.metadata.labels or {},
        }
        for item in replicasets.items
    ]


def serialize_ingresses(ingresses):
    if not ingresses:
        return []

    result = []

    for ingress in ingresses.items:
        rules = []

        if ingress.spec.rules:
            for rule in ingress.spec.rules:
                paths = []

                if rule.http and rule.http.paths:
                    for path in rule.http.paths:
                        backend_service = None
                        backend_port = None

                        if path.backend and path.backend.service:
                            backend_service = path.backend.service.name

                            if path.backend.service.port:
                                backend_port = path.backend.service.port.number or path.backend.service.port.name

                        paths.append(
                            {
                                "path": path.path,
                                "path_type": path.path_type,
                                "backend_service": backend_service,
                                "backend_port": backend_port,
                            }
                        )

                rules.append(
                    {
                        "host": rule.host,
                        "paths": paths,
                    }
                )

        result.append(
            {
                "namespace": ingress.metadata.namespace,
                "name": ingress.metadata.name,
                "rules": rules,
            }
        )

    return result
```

---

# 11. Analyzer Service

Create:

```txt
backend/services/analyzer_service.py
```

Implementation:

```python
def analyze_cluster(cluster_name: str, context: dict):
    pods = context.get("pods", [])
    services = context.get("services", [])
    endpoints = context.get("endpoints", [])
    nodes = context.get("nodes", [])
    deployments = context.get("deployments", [])
    ingresses = context.get("ingresses", [])

    issues = []

    issues.extend(detect_pod_issues(pods))
    issues.extend(detect_services_without_endpoints(services, endpoints, pods))
    issues.extend(detect_node_issues(nodes))
    issues.extend(detect_missing_resource_limits(deployments))
    issues.extend(detect_ingress_issues(ingresses, services))

    pods_total = len(pods)
    pods_running = len([pod for pod in pods if pod.get("phase") == "Running"])
    pods_unhealthy = pods_total - pods_running

    nodes_ready = 0
    nodes_not_ready = 0

    for node in nodes:
        ready_condition = next(
            (
                condition
                for condition in node.get("conditions", [])
                if condition.get("type") == "Ready"
            ),
            None,
        )

        if ready_condition and ready_condition.get("status") == "True":
            nodes_ready += 1
        else:
            nodes_not_ready += 1

    return {
        "cluster_name": cluster_name,
        "summary": {
            "pods_total": pods_total,
            "pods_running": pods_running,
            "pods_unhealthy": pods_unhealthy,
            "nodes_ready": nodes_ready,
            "nodes_not_ready": nodes_not_ready,
            "services_total": len(services),
            "deployments_total": len(deployments),
            "issues_total": len(issues),
        },
        "issues": issues,
        "raw_context": context,
    }


def detect_pod_issues(pods):
    issues = []

    for pod in pods:
        namespace = pod.get("namespace")
        pod_name = pod.get("name")
        phase = pod.get("phase")
        recent_logs = pod.get("recent_logs", "")

        if phase == "Pending":
            issues.append(
                {
                    "severity": "warning",
                    "resource": f"pod/{pod_name}",
                    "namespace": namespace,
                    "type": "PendingPod",
                    "evidence": [
                        f"Pod phase is Pending.",
                        f"Node name: {pod.get('node_name')}",
                    ],
                    "suggested_fix": "Check scheduling events, CPU and memory availability, node selectors, taints, and tolerations.",
                }
            )

        for status in pod.get("container_statuses", []):
            container_name = status.get("name")
            restart_count = status.get("restart_count", 0)
            state = status.get("state", {})
            waiting = state.get("waiting")

            if waiting:
                reason = waiting.get("reason")

                if reason == "CrashLoopBackOff":
                    issues.append(
                        {
                            "severity": "critical",
                            "resource": f"pod/{pod_name}",
                            "namespace": namespace,
                            "type": "CrashLoopBackOff",
                            "evidence": [
                                f"Container {container_name} is waiting with reason CrashLoopBackOff.",
                                f"Restart count: {restart_count}",
                                f"Recent logs: {recent_logs[:1000]}",
                            ],
                            "suggested_fix": "Check application startup errors, missing environment variables, bad command, or failed dependency connection.",
                        }
                    )

                if reason in ["ImagePullBackOff", "ErrImagePull"]:
                    issues.append(
                        {
                            "severity": "critical",
                            "resource": f"pod/{pod_name}",
                            "namespace": namespace,
                            "type": "ImagePullBackOff",
                            "evidence": [
                                f"Container {container_name} is waiting with reason {reason}.",
                                f"Image: {status.get('image')}",
                                f"Message: {waiting.get('message')}",
                            ],
                            "suggested_fix": "Check image name, image tag, registry credentials, or private registry access.",
                        }
                    )

            if restart_count >= 5:
                issues.append(
                    {
                        "severity": "warning",
                        "resource": f"pod/{pod_name}",
                        "namespace": namespace,
                        "type": "HighRestartCount",
                        "evidence": [
                            f"Container {container_name} has restarted {restart_count} times.",
                        ],
                        "suggested_fix": "Check container logs and describe the pod to identify repeated failures.",
                    }
                )

    return issues


def detect_services_without_endpoints(services, endpoints, pods):
    issues = []

    endpoint_map = {
        f"{endpoint.get('namespace')}/{endpoint.get('name')}": endpoint
        for endpoint in endpoints
    }

    for service in services:
        namespace = service.get("namespace")
        service_name = service.get("name")
        service_type = service.get("type")
        selector = service.get("selector", {})

        if service_type == "ExternalName":
            continue

        if not selector:
            continue

        endpoint = endpoint_map.get(f"{namespace}/{service_name}")
        address_count = endpoint.get("address_count", 0) if endpoint else 0

        if address_count == 0:
            matching_pods = []

            for pod in pods:
                if pod.get("namespace") != namespace:
                    continue

                labels = pod.get("labels", {})

                if all(labels.get(key) == value for key, value in selector.items()):
                    matching_pods.append(pod.get("name"))

            evidence = [
                f"Service selector: {selector}",
                f"Endpoint count: {address_count}",
            ]

            if matching_pods:
                evidence.append(f"Matching pods found: {matching_pods}")
            else:
                evidence.append("No pods match the Service selector.")

            issues.append(
                {
                    "severity": "critical",
                    "resource": f"service/{service_name}",
                    "namespace": namespace,
                    "type": "NoEndpoints",
                    "evidence": evidence,
                    "suggested_fix": "Update the Service selector or pod labels so the Service targets the correct ready pods.",
                }
            )

    return issues


def detect_node_issues(nodes):
    issues = []

    for node in nodes:
        node_name = node.get("name")
        conditions = node.get("conditions", [])

        ready_condition = next(
            (
                condition
                for condition in conditions
                if condition.get("type") == "Ready"
            ),
            None,
        )

        if not ready_condition or ready_condition.get("status") != "True":
            issues.append(
                {
                    "severity": "critical",
                    "resource": f"node/{node_name}",
                    "namespace": None,
                    "type": "NodeNotReady",
                    "evidence": [
                        f"Ready condition: {ready_condition}",
                        f"Node conditions: {conditions}",
                    ],
                    "suggested_fix": "Check kubelet, memory pressure, disk pressure, network issues, and node health.",
                }
            )

    return issues


def detect_missing_resource_limits(deployments):
    issues = []

    for deployment in deployments:
        namespace = deployment.get("namespace")
        deployment_name = deployment.get("name")

        for container in deployment.get("containers", []):
            limits = container.get("limits", {})
            requests = container.get("requests", {})

            missing = []

            if not requests.get("cpu"):
                missing.append("CPU request")

            if not requests.get("memory"):
                missing.append("memory request")

            if not limits.get("cpu"):
                missing.append("CPU limit")

            if not limits.get("memory"):
                missing.append("memory limit")

            if missing:
                issues.append(
                    {
                        "severity": "warning",
                        "resource": f"deployment/{deployment_name}",
                        "namespace": namespace,
                        "type": "MissingResourceLimits",
                        "evidence": [
                            f"Container {container.get('name')} is missing: {', '.join(missing)}"
                        ],
                        "suggested_fix": "Add CPU and memory requests and limits to the workload manifest.",
                    }
                )

    return issues


def detect_ingress_issues(ingresses, services):
    issues = []

    service_keys = {
        f"{service.get('namespace')}/{service.get('name')}"
        for service in services
    }

    for ingress in ingresses:
        namespace = ingress.get("namespace")
        ingress_name = ingress.get("name")

        for rule in ingress.get("rules", []):
            host = rule.get("host")

            for path in rule.get("paths", []):
                backend_service = path.get("backend_service")
                backend_port = path.get("backend_port")

                if not backend_service:
                    continue

                service_key = f"{namespace}/{backend_service}"

                if service_key not in service_keys:
                    issues.append(
                        {
                            "severity": "critical",
                            "resource": f"ingress/{ingress_name}",
                            "namespace": namespace,
                            "type": "IngressMissingBackendService",
                            "evidence": [
                                f"Host: {host}",
                                f"Path: {path.get('path')}",
                                f"Backend service: {backend_service}",
                                f"Backend port: {backend_port}",
                                "Backend service does not exist in the same namespace.",
                            ],
                            "suggested_fix": "Update the ingress backend service name or create the missing service.",
                        }
                    )

    return issues
```

---

# 12. Redactor Utility

Create:

```txt
backend/utils/redactor.py
```

Implementation:

```python
import re


SENSITIVE_PATTERNS = [
    r"(?i)(authorization:\s*bearer\s+)[A-Za-z0-9._\-]+",
    r"(?i)(api[_-]?key\s*[:=]\s*)[A-Za-z0-9._\-]+",
    r"(?i)(token\s*[:=]\s*)[A-Za-z0-9._\-]+",
    r"(?i)(password\s*[:=]\s*)[^\s]+",
    r"(?i)(DATABASE_URL\s*[:=]\s*)[^\s]+",
    r"-----BEGIN PRIVATE KEY-----.*?-----END PRIVATE KEY-----",
]


SENSITIVE_KEYS = [
    "secret",
    "secrets",
    "token",
    "password",
    "authorization",
    "api_key",
    "apikey",
    "private_key",
    "client_secret",
]


def redact_text(text: str) -> str:
    if not text:
        return text

    redacted = text

    for pattern in SENSITIVE_PATTERNS:
        redacted = re.sub(
            pattern,
            r"\1[REDACTED]",
            redacted,
            flags=re.DOTALL,
        )

    return redacted


def redact_object(obj):
    if isinstance(obj, dict):
        clean = {}

        for key, value in obj.items():
            if key.lower() in SENSITIVE_KEYS:
                clean[key] = "[REDACTED]"
            else:
                clean[key] = redact_object(value)

        return clean

    if isinstance(obj, list):
        return [redact_object(item) for item in obj]

    if isinstance(obj, str):
        return redact_text(obj)

    return obj
```

---

# 13. AI Service

Create:

```txt
backend/services/ai_service.py
```

Environment variables:

```txt
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=gpt-4o-mini
```

Implementation:

```python
import json
import os
from openai import OpenAI
from dotenv import load_dotenv


load_dotenv()


client = OpenAI(
    api_key=os.getenv("AI_API_KEY"),
    base_url=os.getenv("AI_BASE_URL"),
)


def ask_ai(question: str, cluster_context: dict) -> str:
    model = os.getenv("AI_MODEL", "gpt-4o-mini")

    prompt = f"""
You are a Kubernetes troubleshooting assistant for DigitalOcean DOKS.

Use only the provided cluster context.
Do not invent resources.
Do not claim access to data that is not shown.
Never reveal secrets or tokens.
Do not suggest destructive commands.
Only suggest safe read-only verification commands unless the user explicitly asks for a fix command.

Always answer with:

1. Direct answer
2. Evidence
3. Likely root cause
4. Suggested fix
5. Verification command

If the issue is unclear, say what data is missing.

User question:
{question}

Cluster context:
{json.dumps(cluster_context, indent=2)}
"""

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You are a careful Kubernetes troubleshooting assistant.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content
```

---

# 14. Backend Main App

Create:

```txt
backend/main.py
```

Implementation:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import (
    TokenRequest,
    ClusterRequest,
    ClusterConnectRequest,
    ClusterScanRequest,
    ChatRequest,
)

from services.digitalocean_service import (
    validate_token,
    list_clusters,
    fetch_kubeconfig,
)

from services.kubernetes_service import scan_cluster
from services.analyzer_service import analyze_cluster
from services.ai_service import ask_ai
from utils.redactor import redact_object


app = FastAPI(
    title="DOKS Doctor AI API",
    description="AI-powered DigitalOcean Kubernetes troubleshooting assistant",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "DOKS Doctor AI API",
        "status": "running",
    }


@app.post("/api/token/validate")
def api_validate_token(payload: TokenRequest):
    try:
        valid = validate_token(payload.token)

        return {
            "valid": valid,
        }

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to validate token.",
        )


@app.post("/api/clusters")
def api_list_clusters(payload: ClusterRequest):
    try:
        clusters = list_clusters(payload.token)

        simplified_clusters = []

        for cluster in clusters:
            simplified_clusters.append(
                {
                    "id": cluster.get("id"),
                    "name": cluster.get("name"),
                    "region": cluster.get("region"),
                    "version": cluster.get("version"),
                }
            )

        return {
            "clusters": simplified_clusters,
        }

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to load DOKS clusters.",
        )


@app.post("/api/clusters/{cluster_id}/connect")
def api_connect_cluster(cluster_id: str, payload: ClusterConnectRequest):
    try:
        kubeconfig_text = fetch_kubeconfig(payload.token, cluster_id)

        if not kubeconfig_text:
            raise HTTPException(
                status_code=400,
                detail="Could not fetch kubeconfig.",
            )

        return {
            "connected": True,
        }

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to connect to cluster.",
        )


@app.post("/api/clusters/{cluster_id}/scan")
def api_scan_cluster(cluster_id: str, payload: ClusterScanRequest):
    try:
        clusters = list_clusters(payload.token)

        selected_cluster = next(
            (
                cluster
                for cluster in clusters
                if cluster.get("id") == cluster_id
            ),
            None,
        )

        cluster_name = selected_cluster.get("name") if selected_cluster else cluster_id

        kubeconfig_text = fetch_kubeconfig(payload.token, cluster_id)

        raw_context = scan_cluster(kubeconfig_text)

        redacted_context = redact_object(raw_context)

        analysis = analyze_cluster(
            cluster_name=cluster_name,
            context=redacted_context,
        )

        return analysis

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to scan cluster.",
        )


@app.post("/api/chat")
def api_chat(payload: ChatRequest):
    try:
        redacted_context = redact_object(payload.cluster_context)

        answer = ask_ai(
            question=payload.question,
            cluster_context=redacted_context,
        )

        return {
            "answer": answer,
        }

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to get AI answer.",
        )
```

---

# 15. Backend Requirements

Create:

```txt
backend/requirements.txt
```

Add:

```txt
fastapi
uvicorn
requests
kubernetes
openai
python-dotenv
pydantic
```

---

# 16. Backend Environment Example

Create:

```txt
backend/.env.example
```

Add:

```txt
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=gpt-4o-mini
```

---

# 17. Frontend Flow

Build a single-page app.

File:

```txt
frontend/app/page.tsx
```

Flow:

```txt
Step 1: Enter token
Step 2: Validate token
Step 3: Load clusters
Step 4: Select cluster
Step 5: Scan cluster
Step 6: Show health dashboard
Step 7: Ask chatbot questions
```

React state:

```tsx
const [token, setToken] = useState("")
const [clusters, setClusters] = useState([])
const [selectedCluster, setSelectedCluster] = useState(null)
const [scanResult, setScanResult] = useState(null)
const [messages, setMessages] = useState([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState("")
```

Do not store the token in localStorage.

---

# 18. Frontend API Client

Create:

```txt
frontend/app/lib/api.ts
```

Implementation:

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

export async function validateToken(token: string) {
  const res = await fetch(`${API_BASE}/api/token/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  })

  if (!res.ok) {
    throw new Error("Failed to validate token")
  }

  return res.json()
}

export async function getClusters(token: string) {
  const res = await fetch(`${API_BASE}/api/clusters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  })

  if (!res.ok) {
    throw new Error("Failed to load clusters")
  }

  return res.json()
}

export async function connectCluster(token: string, clusterId: string) {
  const res = await fetch(`${API_BASE}/api/clusters/${clusterId}/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  })

  if (!res.ok) {
    throw new Error("Failed to connect to cluster")
  }

  return res.json()
}

export async function scanCluster(token: string, clusterId: string) {
  const res = await fetch(`${API_BASE}/api/clusters/${clusterId}/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  })

  if (!res.ok) {
    throw new Error("Failed to scan cluster")
  }

  return res.json()
}

export async function askChat(question: string, clusterContext: any) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      cluster_context: clusterContext,
    }),
  })

  if (!res.ok) {
    throw new Error("Failed to ask chatbot")
  }

  return res.json()
}
```

---

# 19. Frontend Components

Create these components:

```txt
frontend/app/components/TokenForm.tsx
frontend/app/components/ClusterSelector.tsx
frontend/app/components/HealthDashboard.tsx
frontend/app/components/ChatBox.tsx
```

---

## 19.1 TokenForm.tsx

Responsibilities:

```txt
Show token input field
Validate token
Trigger cluster loading
Show security message
```

Security message:

```txt
Your token is used only for this session and is not stored permanently.
```

---

## 19.2 ClusterSelector.tsx

Responsibilities:

```txt
Display available DOKS clusters
Allow user to select a cluster
Trigger cluster scan
```

---

## 19.3 HealthDashboard.tsx

Responsibilities:

```txt
Show cluster health summary
Show critical issues
Show warnings
Show healthy stats
Show evidence for each issue
```

Display sections:

```txt
Critical
Warnings
Healthy
```

---

## 19.4 ChatBox.tsx

Responsibilities:

```txt
Show chat messages
Allow user to ask a question
Send question and scan result to backend
Display AI response
```

Suggested placeholder:

```txt
Ask about your cluster, for example: Why is frontend not reachable?
```

---

# 20. Frontend page.tsx

Create:

```txt
frontend/app/page.tsx
```

Implementation outline:

```tsx
"use client"

import { useState } from "react"
import {
  validateToken,
  getClusters,
  scanCluster,
  askChat,
} from "./lib/api"

export default function HomePage() {
  const [token, setToken] = useState("")
  const [clusters, setClusters] = useState<any[]>([])
  const [selectedCluster, setSelectedCluster] = useState<any>(null)
  const [scanResult, setScanResult] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleValidateAndLoadClusters() {
    setLoading(true)
    setError("")

    try {
      const validation = await validateToken(token)

      if (!validation.valid) {
        setError("Invalid DigitalOcean token.")
        return
      }

      const clusterResponse = await getClusters(token)
      setClusters(clusterResponse.clusters || [])
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  async function handleScanCluster(cluster: any) {
    setLoading(true)
    setError("")
    setSelectedCluster(cluster)

    try {
      const result = await scanCluster(token, cluster.id)
      setScanResult(result)
    } catch (err: any) {
      setError(err.message || "Failed to scan cluster.")
    } finally {
      setLoading(false)
    }
  }

  async function handleAskQuestion() {
    if (!question.trim() || !scanResult) {
      return
    }

    const userMessage = {
      role: "user",
      content: question,
    }

    setMessages((prev) => [...prev, userMessage])
    setQuestion("")
    setLoading(true)

    try {
      const response = await askChat(question, scanResult)

      const assistantMessage = {
        role: "assistant",
        content: response.answer,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      setError(err.message || "Failed to ask chatbot.")
    } finally {
      setLoading(false)
    }
  }

  function clearSession() {
    setToken("")
    setClusters([])
    setSelectedCluster(null)
    setScanResult(null)
    setMessages([])
    setQuestion("")
    setError("")
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>DOKS Doctor AI</h1>

      <p>
        AI-powered troubleshooting assistant for DigitalOcean Kubernetes.
      </p>

      <p>
        Your token is used only for this session and is not stored permanently.
      </p>

      <p>
        This tool gives troubleshooting suggestions. Review commands before
        running them.
      </p>

      <button onClick={clearSession}>
        Clear session
      </button>

      <hr />

      <section>
        <h2>Step 1: Enter DigitalOcean Token</h2>

        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste your DigitalOcean API token"
          style={{ width: "100%", padding: 8 }}
        />

        <button
          onClick={handleValidateAndLoadClusters}
          disabled={!token || loading}
        >
          Validate token and load clusters
        </button>
      </section>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {loading && (
        <p>
          Loading...
        </p>
      )}

      {clusters.length > 0 && (
        <section>
          <h2>Step 2: Select Cluster</h2>

          {clusters.map((cluster) => (
            <div
              key={cluster.id}
              style={{
                border: "1px solid #ddd",
                padding: 12,
                marginBottom: 8,
              }}
            >
              <strong>{cluster.name}</strong>
              <p>Region: {cluster.region}</p>
              <p>Version: {cluster.version}</p>

              <button onClick={() => handleScanCluster(cluster)}>
                Scan this cluster
              </button>
            </div>
          ))}
        </section>
      )}

      {selectedCluster && (
        <section>
          <h2>Selected Cluster</h2>
          <p>{selectedCluster.name}</p>
        </section>
      )}

      {scanResult && (
        <section>
          <h2>Step 3: Cluster Health Summary</h2>

          <h3>Summary</h3>

          <pre>
            {JSON.stringify(scanResult.summary, null, 2)}
          </pre>

          <h3>Issues</h3>

          {scanResult.issues?.length === 0 && (
            <p>No major issues detected.</p>
          )}

          {scanResult.issues?.map((issue: any, index: number) => (
            <div
              key={index}
              style={{
                border: "1px solid #ddd",
                padding: 12,
                marginBottom: 8,
              }}
            >
              <h4>
                {issue.severity.toUpperCase()}: {issue.type}
              </h4>

              <p>
                Resource: {issue.resource}
              </p>

              <p>
                Namespace: {issue.namespace || "N/A"}
              </p>

              <h5>Evidence</h5>

              <ul>
                {issue.evidence?.map((item: string, evidenceIndex: number) => (
                  <li key={evidenceIndex}>{item}</li>
                ))}
              </ul>

              <h5>Suggested Fix</h5>

              <p>{issue.suggested_fix}</p>
            </div>
          ))}
        </section>
      )}

      {scanResult && (
        <section>
          <h2>Step 4: Ask Chatbot</h2>

          <div
            style={{
              border: "1px solid #ddd",
              padding: 12,
              marginBottom: 12,
              minHeight: 200,
            }}
          >
            {messages.map((message, index) => (
              <div key={index}>
                <strong>
                  {message.role === "user" ? "You" : "DOKS Doctor AI"}:
                </strong>

                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {message.content}
                </pre>
              </div>
            ))}
          </div>

          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about your cluster, for example: Why is frontend not reachable?"
            style={{ width: "100%", minHeight: 80, padding: 8 }}
          />

          <button
            onClick={handleAskQuestion}
            disabled={!question.trim() || loading}
          >
            Ask
          </button>
        </section>
      )}
    </main>
  )
}
```

---

# 21. Frontend Environment Example

Create:

```txt
frontend/.env.local.example
```

Add:

```txt
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

# 22. Analyzer Rules

The first version should detect these common Kubernetes issues.

---

## 22.1 CrashLoopBackOff

Detect when a container state is waiting with reason:

```txt
CrashLoopBackOff
```

Evidence should include:

```txt
Pod name
Namespace
Container name
Restart count
Waiting reason
Recent logs
```

Suggested fix:

```txt
Check application startup errors, missing environment variables, bad command, or failed dependency connection.
```

Verification commands:

```bash
kubectl describe pod POD_NAME -n NAMESPACE
kubectl logs POD_NAME -n NAMESPACE --tail=50
```

---

## 22.2 ImagePullBackOff

Detect when a container state is waiting with reason:

```txt
ImagePullBackOff
ErrImagePull
```

Evidence should include:

```txt
Pod name
Namespace
Image name
Waiting reason
Related events
```

Suggested fix:

```txt
Check image name, image tag, registry credentials, or private registry access.
```

Verification command:

```bash
kubectl describe pod POD_NAME -n NAMESPACE
```

---

## 22.3 Pending Pods

Detect pods with phase:

```txt
Pending
```

Evidence should include:

```txt
Pod name
Namespace
Pod phase
Related scheduling events
Node selector
Resource requests
```

Suggested fix:

```txt
Check CPU and memory availability, node selectors, taints, tolerations, and scheduling events.
```

Verification commands:

```bash
kubectl describe pod POD_NAME -n NAMESPACE
kubectl get nodes
```

---

## 22.4 Service Has No Endpoints

Detect services where endpoint subsets are empty.

Evidence should include:

```txt
Service name
Namespace
Service selector
Endpoint count
Matching pod labels if available
```

Suggested fix:

```txt
Update the Service selector or pod labels so the Service targets the correct pods.
```

Verification commands:

```bash
kubectl get endpoints SERVICE_NAME -n NAMESPACE
kubectl describe service SERVICE_NAME -n NAMESPACE
```

---

## 22.5 Ingress Misconfiguration

Detect ingress backend services that do not exist.

Evidence should include:

```txt
Ingress name
Namespace
Host
Path
Backend service
Backend service port
Whether backend service exists
```

Suggested fix:

```txt
Check that the ingress backend service exists and the service port matches.
```

Verification commands:

```bash
kubectl describe ingress INGRESS_NAME -n NAMESPACE
kubectl get svc -n NAMESPACE
```

---

## 22.6 Node Not Ready

Detect nodes where Ready condition is not True.

Evidence should include:

```txt
Node name
Ready status
Node conditions
Pressure conditions
```

Suggested fix:

```txt
Check kubelet, memory pressure, disk pressure, network issues, or node health.
```

Verification commands:

```bash
kubectl describe node NODE_NAME
kubectl get nodes
```

---

## 22.7 Missing Resource Limits

Detect containers without CPU or memory requests and limits.

Evidence should include:

```txt
Deployment name
Namespace
Container name
Missing CPU request
Missing memory request
Missing CPU limit
Missing memory limit
```

Suggested fix:

```txt
Add CPU and memory requests and limits to the workload manifest.
```

Verification command:

```bash
kubectl describe deployment DEPLOYMENT_NAME -n NAMESPACE
```

---

# 23. AI Prompt Structure

The chatbot must use a strict prompt.

Prompt:

```txt
You are a Kubernetes troubleshooting assistant for DigitalOcean DOKS.

Use only the provided cluster context.
Do not invent resources.
Do not claim access to data that is not shown.
Never reveal secrets or tokens.
Do not suggest destructive commands.
Only suggest safe read-only verification commands unless the user explicitly asks for a fix command.

Always answer with:

1. Direct answer
2. Evidence
3. Likely root cause
4. Suggested fix
5. Verification command

If the issue is unclear, say what data is missing.
```

When sending a chat request, pass:

```txt
User question:
Why is checkout-service crashing?

Cluster context:
{cluster_scan_json}
```

---

# 24. Expected AI Answer Format

Every chatbot answer should follow this format:

```txt
1. Direct answer

...

2. Evidence

- ...
- ...

3. Likely root cause

...

4. Suggested fix

...

5. Verification command

kubectl ...
```

---

# 25. Cluster Scan JSON Example

The scanner should collect data and produce a compact JSON summary.

Example:

```json
{
  "cluster_name": "demo-cluster",
  "summary": {
    "pods_total": 18,
    "pods_running": 15,
    "pods_unhealthy": 3,
    "nodes_ready": 2,
    "nodes_not_ready": 0
  },
  "issues": [
    {
      "severity": "critical",
      "resource": "pod/checkout-api",
      "namespace": "default",
      "type": "CrashLoopBackOff",
      "evidence": [
        "Restart count: 12",
        "Last state: terminated",
        "Recent log: DATABASE_URL is not defined"
      ],
      "suggested_fix": "Check missing environment variables or application startup failure."
    },
    {
      "severity": "critical",
      "resource": "service/frontend",
      "namespace": "default",
      "type": "NoEndpoints",
      "evidence": [
        "Service selector: app=frontend",
        "No matching pod labels found"
      ],
      "suggested_fix": "Update service selector or pod labels."
    }
  ]
}
```

This JSON becomes the context for the chatbot.

---

# 26. Security Rules

These rules are required:

```txt
Never store DigitalOcean token permanently.
Never store DigitalOcean token in localStorage.
Never print token in logs.
Never send token to AI.
Never send Kubernetes Secret values to AI.
Never read Kubernetes Secrets.
Use read-only Kubernetes API calls.
Show exactly what data is being analyzed.
Let user disconnect and clear session.
Only suggest commands. Do not run fixes automatically.
Redact sensitive data from logs before analysis.
```

Add this warning in the frontend:

```txt
This tool gives troubleshooting suggestions. Review commands before running them.
```

---

# 27. Clear Session Feature

Add a button:

```txt
Clear session
```

When clicked, it should clear:

```txt
token
clusters
selectedCluster
scanResult
chat messages
error state
question input
```

The token must not remain anywhere in browser storage.

---

# 28. Demo Plan

Create a demo DOKS cluster with 3 broken apps.

---

## Broken App 1: CrashLoopBackOff

Problem:

```txt
Deployment missing environment variable:
DATABASE_URL
```

Demo question:

```txt
Why is checkout-api crashing?
```

Expected answer:

```txt
checkout-api is crashing because DATABASE_URL is missing.
```

---

## Broken App 2: Service Has No Endpoints

Problem:

```txt
Service selector:
app=frontend

Pod label:
app=web
```

Demo question:

```txt
Why is frontend not reachable?
```

Expected answer:

```txt
The frontend service has no endpoints because its selector does not match pod labels.
```

---

## Broken App 3: ImagePullBackOff

Problem:

```txt
Deployment image:
private-registry/demo-api:wrong-tag
```

Demo question:

```txt
Why is api deployment stuck?
```

Expected answer:

```txt
The image cannot be pulled because the tag does not exist or registry authentication failed.
```

---

# 29. Development Timeline

## Day 1: Basic Backend

Build:

```txt
FastAPI project
DigitalOcean token validation
List DOKS clusters
Fetch kubeconfig
```

---

## Day 2: Kubernetes Reader

Build:

```txt
Connect to selected cluster
Read pods
Read events
Read services
Read endpoints
Read deployments
Read nodes
Read ingress
Read logs
```

---

## Day 3: Analyzer

Build detection for:

```txt
CrashLoopBackOff
ImagePullBackOff
Pending pods
Services with no endpoints
High restarts
Node not ready
Missing resource limits
```

---

## Day 4: AI Chatbot

Build:

```txt
Prompt template
AI API integration
Chat endpoint
Evidence-based answers
```

---

## Day 5: Frontend

Build:

```txt
Token screen
Cluster list
Health dashboard
Chat UI
Clear session button
```

---

## Day 6: Security Cleanup

Add:

```txt
Token not stored
Secret redaction
Log redaction
Read-only mode
Request limits
Error handling
```

---

## Day 7: Demo Polish

Prepare:

```txt
Demo cluster
Broken workloads
README
Architecture diagram
Short video or GIF
Slides if needed
```

---

# 30. README Content

Create:

```txt
README.md
```

Add:

```markdown
# DOKS Doctor AI

DOKS Doctor AI is an AI-powered Kubernetes troubleshooting assistant for DigitalOcean Kubernetes.

Users connect their DigitalOcean token, select a DOKS cluster, and the app automatically scans pods, events, services, ingress, nodes, deployments, and logs. The chatbot explains likely root causes, provides evidence, and suggests safe kubectl commands to verify issues.

## Features

- DigitalOcean token validation
- DOKS cluster listing
- Kubeconfig fetching
- Read-only Kubernetes scan
- Health summary
- Kubernetes issue detection
- AI chatbot
- Secret and token redaction
- Clear session button

## Security

- Tokens are not stored permanently.
- Tokens are not stored in localStorage.
- Tokens are not logged.
- Tokens are not sent to AI.
- Kubernetes Secrets are not read.
- The app uses read-only Kubernetes API calls.
- The app only suggests commands and does not run fixes automatically.

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

## Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Environment Variables

Backend:

```txt
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=gpt-4o-mini
```

Frontend:

```txt
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## MVP Description

DOKS Doctor AI is an AI-powered Kubernetes troubleshooting assistant for DigitalOcean Kubernetes. Users connect their DigitalOcean token, select a DOKS cluster, and the app automatically scans pods, events, services, ingress, nodes, deployments, and logs. The chatbot explains root causes, provides evidence, and suggests safe kubectl commands to verify and fix issues.
```

---

# 31. Copilot Prompt 1: Create Project

Paste this into Copilot:

```txt
Create a full-stack project named doks-doctor-ai.

Build an MVP for an AI-powered DigitalOcean Kubernetes troubleshooting assistant.

Use:
- Frontend: Next.js + React + TypeScript
- Backend: Python FastAPI
- Kubernetes: Python kubernetes client
- DigitalOcean API: requests
- AI: OpenAI-compatible API

The app flow:
1. User enters a DigitalOcean API token.
2. Backend validates the token.
3. Backend lists available DigitalOcean Kubernetes clusters.
4. User selects a cluster.
5. Backend fetches kubeconfig for that cluster.
6. Backend scans the cluster using read-only Kubernetes API calls.
7. Backend analyzes common issues like CrashLoopBackOff, ImagePullBackOff, Pending pods, services with no endpoints, ingress misconfiguration, high restart counts, node not ready, and missing resource limits.
8. Frontend shows a health dashboard.
9. User asks chatbot questions about the cluster.
10. AI answers using only the provided cluster context with direct answer, evidence, root cause, suggested fix, and verification command.

Security rules:
- Never permanently store the DigitalOcean token.
- Never store token in localStorage.
- Never log the token.
- Never send token to AI.
- Never read Kubernetes Secrets.
- Never send Secret values to AI.
- Use read-only Kubernetes API calls only.
- Redact sensitive values from logs and context.
- Do not run fix commands automatically.

Create the project folder structure, backend files, frontend files, and README.
Start with a working minimal version.
```

---

# 32. Copilot Prompt 2: Backend

Use this after the initial structure is created:

```txt
Now implement the backend services.

Create:
- backend/services/digitalocean_service.py
- backend/services/kubernetes_service.py
- backend/services/analyzer_service.py
- backend/services/ai_service.py
- backend/utils/redactor.py
- backend/models/schemas.py
- backend/main.py

Implement all API endpoints:
POST /api/token/validate
POST /api/clusters
POST /api/clusters/{cluster_id}/connect
POST /api/clusters/{cluster_id}/scan
POST /api/chat

Make sure:
- Tokens are only accepted in request body.
- Tokens are never logged.
- Kubernetes Secrets are never read.
- Cluster scan returns compact JSON.
- Analyzer returns summary and issues.
- AI only receives redacted cluster context.
- The app only suggests commands and does not run fixes automatically.
```

---

# 33. Copilot Prompt 3: Frontend

Use this for the frontend:

```txt
Now implement the frontend in Next.js.

Create a single-page UI with:
1. Token input form
2. Cluster selector
3. Health dashboard
4. Chatbot

Use these components:
- TokenForm.tsx
- ClusterSelector.tsx
- HealthDashboard.tsx
- ChatBox.tsx

Use frontend/app/lib/api.ts for API calls.

Do not store the token in localStorage.
Keep the token only in React state.
Add a clear session button that removes token, selected cluster, scan result, and chat messages.
Add a warning that this tool only gives troubleshooting suggestions and users should review commands before running them.
```

---

# 34. Copilot Prompt 4: Improve Analyzer

Use this after the basic app works:

```txt
Improve the analyzer_service.py file.

Add detailed issue detection for:
1. CrashLoopBackOff
2. ImagePullBackOff
3. ErrImagePull
4. Pending pods
5. Services with no endpoints
6. Ingress backend service missing
7. Node not ready
8. High restart count
9. Missing CPU or memory requests
10. Missing CPU or memory limits

Each issue should include:
- severity
- resource
- namespace
- type
- evidence
- suggested_fix

Make sure the analyzer returns a compact JSON object that can be safely passed to the AI chatbot.
```

---

# 35. Copilot Prompt 5: Security Review

Use this near the end:

```txt
Review the entire project for security.

Make sure:
- DigitalOcean tokens are not stored permanently.
- Tokens are not stored in localStorage.
- Tokens are not logged.
- Tokens are not sent to AI.
- Kubernetes Secrets are never read.
- Kubernetes Secret values are never sent to AI.
- Logs are redacted before being sent to AI.
- Database URLs, passwords, private keys, API keys, and Authorization headers are redacted.
- Only read-only Kubernetes API calls are used.
- The app does not run fix commands automatically.
- The frontend has a clear session button.
```

---

# 36. Final MVP Statement

```txt
DOKS Doctor AI is an AI-powered Kubernetes troubleshooting assistant for DigitalOcean Kubernetes. Users connect their DigitalOcean token, select a DOKS cluster, and the app automatically scans pods, events, services, ingress, nodes, deployments, and logs. The chatbot explains root causes, provides evidence, and suggests safe kubectl commands to verify and fix issues.
```
