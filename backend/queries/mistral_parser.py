import requests
import re

SCHEMA = """
Table: profiles
Columns:
- latitude    (float)
- longitude   (float)
- time        (timestamp)
- temperature (float)
- salinity    (float)
- pressure    (float)
- doxy        (float, nullable) -- dissolved oxygen µmol/kg
- chla        (float, nullable) -- chlorophyll mg/m³
- nitrate     (float, nullable) -- nitrate µmol/kg
"""


def extract_sql(text: str) -> str:
    """
    Extract first SQL SELECT statement from model output.
    """
    match = re.search(r"(select .*?)(?:$|;)", text, re.IGNORECASE)
    return match.group(1) if match else ""


def generate_sql_mistral(query: str) -> str:
    prompt = f"""
You are a PostgreSQL expert.

STRICT RULES:
- Use ONLY table: profiles
- Output ONLY SQL
- No explanation
- No markdown
- No extra text

Schema:
{SCHEMA}

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
            timeout=60
        )


        if response.status_code != 200:
            return f"ERROR: HTTP {response.status_code}"

        data = response.json()


        if "response" not in data:
            return "ERROR: Invalid response from Mistral"

        raw_output = data["response"].strip()


        raw_output = raw_output.replace("```sql", "").replace("```", "").strip()


        sql = extract_sql(raw_output)

        if not sql:
            return "ERROR: No valid SQL generated"

        return sql.strip()

    except requests.exceptions.RequestException as e:
        return f"ERROR: Request failed - {str(e)}"

    except Exception as e:
        return f"ERROR: {str(e)}"