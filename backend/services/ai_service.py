import json
from typing import Any, Dict
from openai import OpenAI


SYSTEM_PROMPT = (
    "You are a Kubernetes troubleshooting assistant for DigitalOcean DOKS. "
    "Use only provided context. Do not invent facts. "
    "Always return sections: Direct answer, Evidence, Likely root cause, Suggested fix, Verification commands."
)


class AIService:
    def __init__(self, base_url: str, api_key: str, model: str) -> None:
        self.client = OpenAI(base_url=base_url, api_key=api_key)
        self.model = model

    def ask(self, question: str, cluster_context: Dict[str, Any]) -> Dict[str, Any]:
        user_prompt = (
            "User question:\n"
            f"{question}\n\n"
            "Cluster context:\n"
            f"{json.dumps(cluster_context, indent=2)[:120000]}"
        )

        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )

        text = completion.choices[0].message.content or ""
        return {
            "answer": text,
            "evidence": [],
            "confidence": "medium",
            "verification_commands": [],
        }
