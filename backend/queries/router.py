def route_query(query: str, model: str = "auto") -> str:
    if model and model != "auto":
        return model

    q = query.lower()

    if any(w in q for w in ["delete", "drop", "update", "insert"]):
        return "gpt"

    if any(w in q for w in ["oxygen", "doxy", "chlorophyll", "chla", "nitrate", "bgc"]):
        return "gpt"

    if any(w in q for w in ["temperature", "pressure", "salinity"]):
        return "gpt"

    if any(w in q for w in ["trend", "pattern", "compare"]):
        return "mistral"

    return "gpt"
