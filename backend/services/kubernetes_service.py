import os
import tempfile
from typing import Any, Dict, List
from kubernetes import client, config


class KubernetesService:
    def _create_clients_from_kubeconfig(self, kubeconfig_text: str) -> Dict[str, Any]:
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

    def scan_cluster(self, kubeconfig_text: str) -> Dict[str, Any]:
        clients = self._create_clients_from_kubeconfig(kubeconfig_text)
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

        try:
            ingresses = networking.list_ingress_for_all_namespaces()
            ingress_items = ingresses.items
        except Exception:
            ingress_items = []

        return {
            "namespaces": [{"name": n.metadata.name} for n in namespaces.items],
            "pods": self._serialize_pods(core, pods.items),
            "services": [
                {
                    "namespace": s.metadata.namespace,
                    "name": s.metadata.name,
                    "selector": s.spec.selector or {},
                    "type": s.spec.type,
                }
                for s in services.items
            ],
            "endpoints": [
                {
                    "namespace": e.metadata.namespace,
                    "name": e.metadata.name,
                    "address_count": self._count_endpoint_addresses(e),
                }
                for e in endpoints.items
            ],
            "events": [
                {
                    "namespace": e.metadata.namespace,
                    "reason": e.reason,
                    "message": e.message,
                    "type": e.type,
                }
                for e in events.items[:200]
            ],
            "nodes": [
                {
                    "name": n.metadata.name,
                    "ready": self._is_node_ready(n),
                }
                for n in nodes.items
            ],
            "deployments": [
                {
                    "namespace": d.metadata.namespace,
                    "name": d.metadata.name,
                    "replicas": d.spec.replicas,
                    "ready_replicas": d.status.ready_replicas or 0,
                }
                for d in deployments.items
            ],
            "ingresses": [
                {
                    "namespace": i.metadata.namespace,
                    "name": i.metadata.name,
                }
                for i in ingress_items
            ],
        }

    def _serialize_pods(self, core: client.CoreV1Api, pods: List[Any]) -> List[Dict[str, Any]]:
        result: List[Dict[str, Any]] = []
        for pod in pods:
            logs = ""
            try:
                logs = core.read_namespaced_pod_log(
                    name=pod.metadata.name,
                    namespace=pod.metadata.namespace,
                    tail_lines=50,
                    timestamps=True,
                )
            except Exception:
                logs = ""

            statuses = []
            for status in pod.status.container_statuses or []:
                waiting = None
                if status.state and status.state.waiting:
                    waiting = {
                        "reason": status.state.waiting.reason,
                        "message": status.state.waiting.message,
                    }
                statuses.append(
                    {
                        "name": status.name,
                        "image": status.image,
                        "restart_count": status.restart_count,
                        "waiting": waiting,
                    }
                )

            result.append(
                {
                    "namespace": pod.metadata.namespace,
                    "name": pod.metadata.name,
                    "phase": pod.status.phase,
                    "labels": pod.metadata.labels or {},
                    "container_statuses": statuses,
                    "recent_logs": logs,
                }
            )
        return result

    @staticmethod
    def _count_endpoint_addresses(endpoint: Any) -> int:
        count = 0
        for subset in endpoint.subsets or []:
            count += len(subset.addresses or [])
        return count

    @staticmethod
    def _is_node_ready(node: Any) -> bool:
        for condition in node.status.conditions or []:
            if condition.type == "Ready":
                return condition.status == "True"
        return False
