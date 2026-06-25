from typing import Any, Dict, List, Optional
import requests


DO_API_BASE = "https://api.digitalocean.com/v2"


class DigitalOceanService:
    @staticmethod
    def _headers(token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def validate_token(self, token: str) -> bool:
        response = requests.get(
            f"{DO_API_BASE}/account",
            headers=self._headers(token),
            timeout=15,
        )
        return response.status_code == 200

    def get_account(self, token: str) -> Dict[str, Any]:
        """Get account info including team context."""
        response = requests.get(
            f"{DO_API_BASE}/account",
            headers=self._headers(token),
            timeout=15,
        )
        response.raise_for_status()
        return response.json().get("account", {})

    def list_teams(self, token: str) -> List[Dict[str, Any]]:
        """
        List teams accessible by this token.
        
        Note: DigitalOcean API scopes tokens to a single team context.
        This returns the current team derived from account info as a
        normalized single-team list for consistent UX.
        """
        account = self.get_account(token)
        # DO tokens are scoped to one team context; derive team from account
        team = {
            "id": account.get("team", {}).get("uuid", account.get("uuid", "default")),
            "name": account.get("team", {}).get("name", account.get("email", "My Team")),
            "uuid": account.get("team", {}).get("uuid", account.get("uuid")),
        }
        return [team]

    def list_clusters(
        self, token: str, team_id: Optional[str] = None, sort: bool = True
    ) -> List[Dict[str, Any]]:
        """
        List Kubernetes clusters visible to this token.
        
        Args:
            token: DO API bearer token
            team_id: Optional team filter (for future multi-team support)
            sort: If True, sort clusters alphabetically by name (case-insensitive)
        
        Returns:
            List of cluster dicts, optionally sorted
        """
        response = requests.get(
            f"{DO_API_BASE}/kubernetes/clusters",
            headers=self._headers(token),
            timeout=20,
        )
        response.raise_for_status()
        clusters = response.json().get("kubernetes_clusters", [])
        
        if sort:
            clusters = sorted(clusters, key=lambda c: c.get("name", "").lower())
        
        return clusters

    def fetch_kubeconfig(self, token: str, cluster_id: str) -> str:
        response = requests.get(
            f"{DO_API_BASE}/kubernetes/clusters/{cluster_id}/kubeconfig",
            headers=self._headers(token),
            timeout=20,
        )
        response.raise_for_status()
        return response.text
