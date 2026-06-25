from typing import Any, Dict
import requests


class OAuthService:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    def get_oauth_url(self) -> str:
        return (
            "https://cloud.digitalocean.com/v1/oauth/authorize"
            f"?client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}"
            "&response_type=code"
            "&scope=read"
        )

    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        response = requests.post(
            "https://cloud.digitalocean.com/v1/oauth/token",
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.redirect_uri,
            },
            timeout=15,
        )
        response.raise_for_status()
        return response.json()

    def get_account(self, access_token: str) -> Dict[str, Any]:
        response = requests.get(
            "https://api.digitalocean.com/v2/account",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        response.raise_for_status()
        return response.json().get("account", {})
