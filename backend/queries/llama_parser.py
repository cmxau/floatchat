import requests
import re

SCHEMA = """
Table: profiles
Columns: latitude (float), longitude (float), time (timestamp),
         temperature (float), salinity (float), pressure (float),
         doxy (float, nullable), chla (float, nullable), nitrate (float, nullable)
"""


def extract_sql(text: str) -> str:
    text = text.replace("```sql", "").replace("```", "").strip()
    m = re.search(r"(select .+?)(?:$|;)", text, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else ""


def generate_sql_llama(query: str) -> str:
    prompt = f"""You are a PostgreSQL expert.
STRICT RULES:
- Use ONLY table: profiles
- Output ONLY the SQL SELECT statement
- No explanation, no markdown, no extra text

Schema:
{SCHEMA}

Query: {query}
SQL:"""

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3.2", "prompt": prompt, "stream": False},
            timeout=60
        )
        if response.status_code != 200:
            return f"ERROR: HTTP {response.status_code}"
        raw = response.json().get("response", "").strip()
        sql = extract_sql(raw)
        return sql if sql else "ERROR: No valid SQL from LLaMA"
    except Exception as e:
        return f"ERROR: {e}"
