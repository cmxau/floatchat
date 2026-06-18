import requests


def format_sql_data(sql_data: list) -> str:
    if not sql_data or not isinstance(sql_data, list):
        return ""

    try:
        first_row = sql_data[0]
        n = len(sql_data)
        lines = []

        # Aggregated result (AVG, MIN, MAX, COUNT columns)
        if any(k.lower().startswith(("avg", "min", "max", "count")) for k in first_row.keys()):
            for k, v in first_row.items():
                if isinstance(v, (int, float)):
                    lines.append(f"{k.replace('_', ' ').title()}: {v:.4f}")
            return "\n".join(lines)

        # Profile / row-based result
        def col_stats(key):
            vals = [float(r[key]) for r in sql_data if r.get(key) is not None]
            if not vals:
                return None
            return {"min": min(vals), "max": max(vals), "mean": sum(vals) / len(vals), "n": len(vals)}

        temp  = col_stats("temperature")
        sal   = col_stats("salinity")
        pres  = col_stats("pressure")
        doxy  = col_stats("doxy")
        chla  = col_stats("chla")
        nitrate = col_stats("nitrate")

        lines.append(f"Observations: {n} data points")

        if temp:
            lines.append(
                f"Temperature: {temp['min']:.2f} – {temp['max']:.2f} °C  "
                f"(mean {temp['mean']:.2f} °C)"
            )
        if sal:
            lines.append(
                f"Salinity: {sal['min']:.2f} – {sal['max']:.2f} PSU  "
                f"(mean {sal['mean']:.2f} PSU)"
            )
        if pres:
            lines.append(
                f"Pressure range: {pres['min']:.0f} – {pres['max']:.0f} dbar"
            )
        if doxy:
            lines.append(
                f"Dissolved oxygen: {doxy['min']:.1f} – {doxy['max']:.1f} µmol/kg  "
                f"(mean {doxy['mean']:.1f} µmol/kg)"
            )
        if chla:
            lines.append(
                f"Chlorophyll-a: {chla['min']:.3f} – {chla['max']:.3f} mg/m³  "
                f"(mean {chla['mean']:.3f} mg/m³)"
            )
        if nitrate:
            lines.append(
                f"Nitrate: {nitrate['min']:.2f} – {nitrate['max']:.2f} µmol/kg  "
                f"(mean {nitrate['mean']:.2f} µmol/kg)"
            )

        return "\n".join(lines)

    except Exception:
        return ""


def format_vector_data(vector_data) -> str:
    if not vector_data:
        return ""
    try:
        flat = []
        if isinstance(vector_data, list):
            for item in vector_data:
                if isinstance(item, list):
                    flat.extend(item)
                elif isinstance(item, str):
                    flat.append(item)
                elif isinstance(item, dict):
                    flat.append(str(item))
        return "\n".join(flat[:5])
    except Exception:
        return ""


SYSTEM_PROMPT = """You are a scientific ocean data analyst specializing in ARGO float data and physical oceanography.

Response guidelines:
- Write in clear, precise scientific prose — no bullet lists unless explicitly listing parameters
- Lead with the most significant finding, then add context
- Report all numeric values with appropriate units (°C, PSU, dbar, µmol/kg, mg/m³)
- Reference depth ranges using pressure in dbar
- When temperature decreases with depth, note the thermocline if present
- When salinity changes with depth, note halocline or mixed-layer depth if evident
- For BGC parameters: interpret doxy saturation levels, chlorophyll maxima depth, nitrate depletion
- Never mention SQL, databases, or internal system details
- Do not hedge excessively — state what the data shows
- Keep the response under 150 words unless the query requires extended analysis"""


def generate_answer(query: str, sql_data=None, vector_data=None) -> str:
    sql_context    = format_sql_data(sql_data)
    vector_context = format_vector_data(vector_data)

    if not sql_context and not vector_context:
        return (
            "Insufficient data is available to answer this query precisely. "
            "As a general note: in the open ocean, temperature typically decreases "
            "from a warm surface mixed layer through the thermocline to cold deep waters, "
            "while salinity varies with evaporation, precipitation, and advection patterns."
        )

    prompt = f"""{SYSTEM_PROMPT}

MEASURED DATA SUMMARY:
{sql_context if sql_context else "Not available"}

SEMANTIC CONTEXT:
{vector_context if vector_context else "Not available"}

User query: {query}

Provide a concise, professional scientific response:"""

    # Primary: Mistral (local, no cost)
    try:
        resp = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "mistral", "prompt": prompt, "stream": False},
            timeout=20,
        )
        if resp.status_code == 200:
            text = resp.json().get("response", "").strip()
            if text:
                return text
    except Exception:
        pass

    # Fallback: structured synthesis without LLM
    parts = []
    if sql_context:
        parts.append(sql_context)
    if vector_context:
        parts.append(vector_context)
    return "\n\n".join(parts) if parts else "Unable to generate a response."
