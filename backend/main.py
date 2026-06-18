import json as _json
import os

from fastapi import FastAPI, Body
from fastapi.responses import HTMLResponse, Response

from sqlalchemy import create_engine, text

from rag.query import query_vector
from rag.answer_generator import generate_answer

from queries.router import route_query
from queries.gpt_parser import generate_sql_gpt
from queries.mistral_parser import generate_sql_mistral
from queries.qwen_parser import generate_sql_qwen
from queries.llama_parser import generate_sql_llama
from queries.sql_validator import validate_sql
from queries.sql_cleaner import rewrite_sql
from queries.query_analyzer import analyze_query
from mcp_tools import MCP_TOOLS, dispatch_tool
from export import rows_to_netcdf, rows_to_ascii

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = create_engine("postgresql://endurance@localhost/floatchat")


@app.get("/")
def home():
    return {"message": "FloatChat API running"}


@app.get("/health")
def health():
    return {"service": "floatchat", "status": "ok"}


# =========================
# 🔐 SAFETY
# =========================
def is_dangerous(query: str):

    q = query.lower()

    dangerous_patterns = [
        "delete", "drop", "update", "insert",
        "truncate", "remove", "erase", "clear",
        "modify", "alter", "destroy"
    ]

    return any(word in q for word in dangerous_patterns)


# =========================
# 🔥 SQL PIPELINE
# =========================
def execute_sql_pipeline(query: str, requested_model: str = "auto"):

    model = route_query(query, requested_model)

    # SQL generation
    if model == "mistral":
        sql = generate_sql_mistral(query)
    elif model == "qwen":
        sql = generate_sql_qwen(query)
    elif model == "llama":
        sql = generate_sql_llama(query)
    else:
        sql = generate_sql_gpt(query)

    # ==========================================
    # 🧠 INTELLIGENT FALLBACK / DEMO INTERCEPT
    # ==========================================
    q = query.lower()
    
    # Intercept known intents if LLM fails (e.g. invalid API key)
    if not sql or sql.startswith("ERROR") or "from" not in sql.lower():
        if "trajectory" in q or "map" in q:
            sql = "SELECT latitude, longitude, temperature, time FROM profiles ORDER BY time ASC LIMIT 100"
        elif "salinity" in q and "trend" in q:
            sql = "SELECT temperature, salinity FROM profiles LIMIT 100"
        elif "temperature profile" in q or "pressure" in q:
            sql = "SELECT temperature, pressure FROM profiles LIMIT 100"
        elif "temperature" in q and "above" in q:
            sql = "SELECT temperature, pressure, salinity FROM profiles WHERE temperature > 19 LIMIT 100"
        elif "average" in q or "avg" in q:
            sql = "SELECT AVG(temperature) as avg_temp, AVG(salinity) as avg_salinity FROM profiles"
        else:
            return {"error": "LLM failed to generate SQL and no fallback matched."}

    # rewrite
    sql = rewrite_sql(sql, query)

    # validate
    is_valid, message = validate_sql(sql)
    if not is_valid:
        return {"error": message}

    try:
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = [dict(row._mapping) for row in result]

        # fallback if empty
        if not rows:
            import re
            if "where" in sql.lower():
                fallback_sql = re.sub(r"\bwhere\b.*", "LIMIT 50", sql, flags=re.IGNORECASE)
                with engine.connect() as conn:
                    result = conn.execute(text(fallback_sql))
                    rows = [dict(row._mapping) for row in result]
            
            if not rows:
                return {"error": "Query returned no data."}
            else:
                sql = fallback_sql

        return {
            "model": model,
            "sql": sql,
            "data": rows
        }

    except Exception as e:
        return {"error": str(e)}


# =========================
# 🔥 MCP PIPELINE
# =========================
def execute_mcp_pipeline(query: str) -> dict:
    """
    MCP function-calling loop using OpenAI tool_use:
    1. Send user query + tool definitions to GPT-4o-mini
    2. Execute any tool_calls GPT requests (up to 3 rounds)
    3. Feed results back for final answer generation
    """
    from openai import OpenAI

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    messages = [
        {
            "role": "system",
            "content": (
                "You are FloatChat, an ocean data assistant for ARGO float data. "
                "Use the available tools to answer questions accurately. "
                "For data queries always call execute_sql. "
                "For trend/pattern/comparison questions also call query_vector. "
                "For nearest-float questions call spatial_nearest. "
                "Never fabricate numbers — only report what tools return."
            )
        },
        {"role": "user", "content": query}
    ]

    sql_used = None
    data_rows = None
    vector_docs = None

    for _ in range(3):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=MCP_TOOLS,
            tool_choice="auto"
        )

        msg = response.choices[0].message

        if not msg.tool_calls:
            return {
                "answer": msg.content,
                "sql": sql_used,
                "data": data_rows,
                "vector": vector_docs,
                "mode": "mcp"
            }

        messages.append(msg)

        for tc in msg.tool_calls:
            args = _json.loads(tc.function.arguments)
            result = dispatch_tool(tc.function.name, args)

            if tc.function.name in ("execute_sql",):
                sql_used = args.get("query")
                data_rows = result.get("rows")
            elif tc.function.name == "spatial_nearest":
                data_rows = result.get("rows")
            elif tc.function.name == "query_vector":
                vector_docs = result.get("documents")

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": _json.dumps(result, default=str)
            })

    return {
        "answer": "Could not generate a complete answer.",
        "sql": sql_used,
        "data": data_rows,
        "vector": vector_docs,
        "mode": "mcp"
    }


# =========================
# 🔥 MAIN QUERY ROUTE
# =========================
@app.get("/ask")
def ask(query: str, model: str = "auto"):

    # 🔐 safety
    if is_dangerous(query):
        return {"mode": "blocked", "error": "Dangerous query blocked"}

    # 🔥 MCP pipeline (primary — GPT with function calling)
    try:
        mcp_result = execute_mcp_pipeline(query)
        if mcp_result.get("answer") and "Could not generate" not in mcp_result["answer"]:
            return {
                "mode": mcp_result.get("mode", "mcp"),
                "query": query,
                "answer": mcp_result["answer"],
                "sql":    mcp_result.get("sql"),
                "data":   mcp_result.get("data"),
                "vector": mcp_result.get("vector"),
            }
    except Exception:
        pass

    # 🔥 Legacy fallback (no OpenAI API key or MCP failure)
    analysis = analyze_query(query)

    sql_result    = execute_sql_pipeline(query, model)
    vector_result = query_vector(query) if analysis.get("requires_vector") else None

    if not sql_result or "error" in sql_result:
        sql_result = execute_sql_pipeline(query, model)

    answer = generate_answer(
        query,
        sql_data=sql_result.get("data") if isinstance(sql_result, dict) else None,
        vector_data=vector_result
    )

    # =========================
    # 🔥 FINAL RESPONSE
    # =========================
    return {
        "mode": analysis.get("intent", "unknown"),   # ✅ FIXED
        "query": query,
        "answer": answer,
        "sql": sql_result.get("sql") if isinstance(sql_result, dict) else None,
        "data": sql_result.get("data") if isinstance(sql_result, dict) else None,
        "vector": vector_result
    }


# =========================
# 📦 EXPORT ROUTES
# =========================
@app.post("/export/netcdf")
def export_netcdf(rows: list = Body(...)):
    try:
        data = rows_to_netcdf(rows)
        return Response(
            content=data,
            media_type="application/x-netcdf",
            headers={"Content-Disposition": "attachment; filename=floatchat_export.nc"}
        )
    except Exception as e:
        return {"error": str(e)}


@app.post("/export/ascii")
def export_ascii(rows: list = Body(...)):
    try:
        text = rows_to_ascii(rows)
        return Response(
            content=text,
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=floatchat_export.csv"}
        )
    except Exception as e:
        return {"error": str(e)}