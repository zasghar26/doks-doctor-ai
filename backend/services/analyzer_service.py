from typing import Any, Dict, List


class AnalyzerService:
    def analyze_cluster(self, cluster_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        pods = context.get("pods", [])
        services = context.get("services", [])
        endpoints = context.get("endpoints", [])
        nodes = context.get("nodes", [])

        issues: List[Dict[str, Any]] = []

        for pod in pods:
            if pod.get("phase") == "Pending":
                issues.append(
                    {
                        "severity": "warning",
                        "resource": f"pod/{pod.get('name')}",
                        "namespace": pod.get("namespace"),
                        "type": "PendingPod",
                        "evidence": ["Pod phase is Pending"],
                        "suggested_fix": "Check scheduler events and node capacity.",
                    }
                )

            for status in pod.get("container_statuses", []):
                waiting = status.get("waiting")
                if waiting and waiting.get("reason") == "CrashLoopBackOff":
                    issues.append(
                        {
                            "severity": "critical",
                            "resource": f"pod/{pod.get('name')}",
                            "namespace": pod.get("namespace"),
                            "type": "CrashLoopBackOff",
                            "evidence": [
                                f"Container {status.get('name')} is in CrashLoopBackOff",
                                f"Restart count: {status.get('restart_count', 0)}",
                            ],
                            "suggested_fix": "Inspect container logs and deployment env vars.",
                        }
                    )

        endpoint_map = {
            f"{item.get('namespace')}/{item.get('name')}": item.get("address_count", 0)
            for item in endpoints
        }

        for service in services:
            service_key = f"{service.get('namespace')}/{service.get('name')}"
            if service.get("type") == "ExternalName" or not service.get("selector"):
                continue
            if endpoint_map.get(service_key, 0) == 0:
                issues.append(
                    {
                        "severity": "critical",
                        "resource": f"service/{service.get('name')}",
                        "namespace": service.get("namespace"),
                        "type": "NoEndpoints",
                        "evidence": [
                            f"Service selector: {service.get('selector')}",
                            "Service endpoint count is 0",
                        ],
                        "suggested_fix": "Align pod labels and service selector.",
                    }
                )

        not_ready = [node for node in nodes if not node.get("ready")]
        for node in not_ready:
            issues.append(
                {
                    "severity": "critical",
                    "resource": f"node/{node.get('name')}",
                    "namespace": None,
                    "type": "NodeNotReady",
                    "evidence": ["Node Ready condition is False"],
                    "suggested_fix": "Check kubelet and node pressures.",
                }
            )

        return {
            "cluster_name": cluster_name,
            "summary": {
                "pods_total": len(pods),
                "pods_running": len([p for p in pods if p.get("phase") == "Running"]),
                "pods_unhealthy": len([p for p in pods if p.get("phase") != "Running"]),
                "nodes_ready": len([n for n in nodes if n.get("ready")]),
                "nodes_not_ready": len(not_ready),
                "services_total": len(services),
                "issues_total": len(issues),
            },
            "issues": issues,
            "raw_context": context,
        }
