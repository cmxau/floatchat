import json
import requests


def analyze_query(query: str) -> dict:

    prompt = f"""
You are an intelligent query analyzer for an ocean data system.

Return ONLY valid JSON with:
- intent: ["filter", "trend", "comparison", "lookup"]
- entities: list
- geo: region or null
- time: time expression or null
- requires_sql: true/false
- requires_vector: true/false

RULES:
- trend / pattern / analysis → BOTH true
- compare → BOTH true
- filters → SQL true
- default → SQL true

Query:
{query}
"""

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "mistral",
                "prompt": prompt,
                "stream": False
            },
            timeout=15
        )

        data = response.json()

        if "response" not in data:
            raise ValueError()

        output = data["response"].strip()
        output = output.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(output)

        # 🔥 HARD FIX (critical)
        q = query.lower()

        if any(w in q for w in ["trend", "pattern", "analysis"]):
            parsed["requires_sql"] = True
            parsed["requires_vector"] = True

        if "compare" in q:
            parsed["requires_sql"] = True
            parsed["requires_vector"] = True

        if not parsed.get("requires_sql") and not parsed.get("requires_vector"):
            parsed["requires_sql"] = True

        return parsed

    except Exception:
        return fallback_analysis(query)


def fallback_analysis(query: str) -> dict:

    q = query.lower()

    requires_sql = True
    requires_vector = False

    if any(w in q for w in ["trend", "pattern", "analysis"]):
        requires_sql = True
        requires_vector = True

    if "compare" in q:
        requires_sql = True
        requires_vector = True

    return {
        "intent": "unknown",
        "entities": [],
        "geo": None,
        "time": None,
        "requires_sql": requires_sql,
        "requires_vector": requires_vector
    }