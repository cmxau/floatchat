import os
import re
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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


def generate_sql_gpt(query: str) -> str:
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
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )       

        sql = response.choices[0].message.content.strip()

        print("GPT OUTPUT:", sql)  

        return sql

    except Exception as e:
        print("GPT ERROR:", str(e))  
        return f"ERROR: {str(e)}"