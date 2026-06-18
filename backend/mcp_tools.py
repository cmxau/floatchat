"""
MCP-compatible tool definitions for FloatChat.
Uses OpenAI function-calling format (JSON Schema).
"""
import json
from sqlalchemy import create_engine, text
from rag.query import query_vector as _query_vector

_engine = create_engine("postgresql://endurance@localhost/floatchat")

SCHEMA_HINT = """
Table: profiles
Columns:
- latitude  (float)
- longitude (float)
- time      (timestamp)
- temperature (float)
- salinity    (float)
- pressure    (float)
- doxy        (float, nullable) -- dissolved oxygen µmol/kg
- chla        (float, nullable) -- chlorophyll mg/m³
- nitrate     (float, nullable) -- nitrate µmol/kg
"""

MCP_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "execute_sql",
            "description": (
                "Run a SELECT query against the ARGO profiles table. "
                "Use this for all data retrieval — filtering by temperature, salinity, "
                "pressure, region, time, or BGC parameters."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A valid PostgreSQL SELECT statement against the profiles table."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_vector",
            "description": (
                "Semantic search over ARGO profile summaries stored in ChromaDB. "
                "Use for trend, pattern, comparison, and explanatory questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Natural language query for semantic retrieval."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_schema",
            "description": "Returns the database schema for the profiles table including column names and types.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "spatial_nearest",
            "description": (
                "Find the N nearest ARGO float profiles to a given lat/lon coordinate "
                "using Euclidean distance approximation."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude":  {"type": "number", "description": "Target latitude in decimal degrees."},
                    "longitude": {"type": "number", "description": "Target longitude in decimal degrees."},
                    "n":         {"type": "integer", "description": "Number of results to return.", "default": 10}
                },
                "required": ["latitude", "longitude"]
            }
        }
    }
]


def dispatch_tool(name: str, args: dict) -> dict:
    """Execute an MCP tool call and return a result dict."""

    if name == "get_schema":
        return {"schema": SCHEMA_HINT}

    if name == "execute_sql":
        sql = args.get("query", "").strip()
        if not sql.lower().startswith("select"):
            return {"error": "Only SELECT statements allowed"}
        try:
            with _engine.connect() as conn:
                rows = [dict(r._mapping) for r in conn.execute(text(sql))]
            return {"rows": rows, "count": len(rows)}
        except Exception as e:
            return {"error": str(e)}

    if name == "query_vector":
        results = _query_vector(args.get("query", ""))
        return {"documents": results}

    if name == "spatial_nearest":
        lat = args["latitude"]
        lon = args["longitude"]
        n   = int(args.get("n", 10))
        sql = (
            f"SELECT *, "
            f"SQRT(POWER(latitude - {lat}, 2) + POWER(longitude - {lon}, 2)) AS dist "
            f"FROM profiles ORDER BY dist ASC LIMIT {n}"
        )
        try:
            with _engine.connect() as conn:
                rows = [dict(r._mapping) for r in conn.execute(text(sql))]
            return {"rows": rows}
        except Exception as e:
            return {"error": str(e)}

    return {"error": f"Unknown tool: {name}"}
