import re
from datetime import datetime, timedelta

REGIONS = {
    "arabian sea":    {"lat": (5, 26),    "lon": (50, 78)},
    "bay of bengal":  {"lat": (5, 23),    "lon": (80, 100)},
    "indian ocean":   {"lat": (-60, 30),  "lon": (20, 120)},
    "equatorial":     {"lat": (-5, 5),    "lon": (-180, 180)},
    "south atlantic": {"lat": (-60, 0),   "lon": (-70, 20)},
    "north atlantic": {"lat": (0, 65),    "lon": (-80, 0)},
    "south pacific":  {"lat": (-60, 0),   "lon": (-180, -70)},
    "north pacific":  {"lat": (0, 65),    "lon": (120, 180)},
    "southern ocean": {"lat": (-90, -60), "lon": (-180, 180)},
    "mediterranean":  {"lat": (30, 46),   "lon": (-6, 42)},
    "red sea":        {"lat": (12, 30),   "lon": (32, 44)},
    "persian gulf":   {"lat": (23, 30),   "lon": (48, 57)},
}

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}


# ========================
# 🧹 BASIC CLEANING
# ========================
def clean_sql(sql: str) -> str:
    if not sql:
        return ""

    sql = sql.strip()
    sql = sql.replace("```sql", "").replace("```", "")
    sql = re.sub(r"\s+", " ", sql)
    sql = sql.rstrip(";")
    sql = re.sub(r"\btable\b", "profiles", sql, flags=re.IGNORECASE)

    if "select" not in sql.lower():
        return sql

    if not re.search(r"\blimit\b", sql, flags=re.IGNORECASE):
        sql += " LIMIT 50"

    return sql


# ========================
# 🌍 GEO FILTERS
# ========================
def add_geo_filter(sql: str, query: str) -> str:
    q = query.lower()

    if "equator" in q:
        return inject_condition(sql, "latitude BETWEEN -5 AND 5")

    return sql


def add_region_filter(sql: str, query: str) -> str:
    q = query.lower()

    if "latitude between" in sql.lower():
        return sql

    for region, bounds in REGIONS.items():
        if region in q:
            lat_min, lat_max = bounds["lat"]
            lon_min, lon_max = bounds["lon"]
            condition = (
                f"latitude BETWEEN {lat_min} AND {lat_max} "
                f"AND longitude BETWEEN {lon_min} AND {lon_max}"
            )
            return inject_condition(sql, condition)

    return sql


# ========================
# 🕒 TIME FILTERS
# ========================
def add_time_filter(sql: str, query: str) -> str:
    q = query.lower()
    now = datetime.utcnow()

    # "last N days/weeks/months/years"
    m = re.search(r"last\s+(\d+)\s+(day|week|month|year)s?", q)
    if m:
        n, unit = int(m.group(1)), m.group(2)
        delta = {
            "day":   timedelta(days=n),
            "week":  timedelta(weeks=n),
            "month": timedelta(days=n * 30),
            "year":  timedelta(days=n * 365),
        }[unit]
        cutoff = (now - delta).strftime("%Y-%m-%d")
        return inject_condition(sql, f"time >= '{cutoff}'")

    # "Month YYYY" e.g. "March 2023"
    for month_name, month_num in MONTH_MAP.items():
        m2 = re.search(rf"{month_name}\s+(\d{{4}})", q)
        if m2:
            year = int(m2.group(1))
            end_year = year + 1 if month_num == 12 else year
            end_month = 1 if month_num == 12 else month_num + 1
            start = f"{year}-{month_num:02d}-01"
            end = f"{end_year}-{end_month:02d}-01"
            return inject_condition(sql, f"time >= '{start}' AND time < '{end}'")

    # Bare year "2023"
    m3 = re.search(r"\b(20\d{2})\b", q)
    if m3:
        year = m3.group(1)
        return inject_condition(sql, f"time >= '{year}-01-01' AND time < '{int(year)+1}-01-01'")

    return sql


# ========================
# 📍 NEAREST FLOAT
# ========================
def add_nearest_filter(sql: str, query: str) -> str:
    q = query.lower()
    if not any(w in q for w in ["nearest", "closest", "near me", "nearby"]):
        return sql

    # Extract "20N 65E" or "20.5 65.3" style coordinates
    m = re.search(r"(\d+(?:\.\d+)?)\s*[ns°].*?(\d+(?:\.\d+)?)\s*[ew°]", q)
    if m:
        lat = float(m.group(1))
        lon = float(m.group(2))
        if "s" in q[m.start():m.end()]:
            lat = -lat
        if "w" in q[m.start():m.end()]:
            lon = -lon

        order = (
            f"ORDER BY ((latitude - {lat})*(latitude - {lat}) + "
            f"(longitude - {lon})*(longitude - {lon})) ASC"
        )
        if re.search(r"\blimit\b", sql, re.IGNORECASE):
            return re.sub(r"\bLIMIT\b", f"{order} LIMIT", sql, flags=re.IGNORECASE)
        return sql + f" {order} LIMIT 10"

    return sql


# ========================
# 🧠 CONDITION INJECTOR
# ========================
def inject_condition(sql: str, condition: str) -> str:
    if condition.lower() in sql.lower():
        return sql

    if re.search(r"\bwhere\b", sql, flags=re.IGNORECASE):
        return re.sub(
            r"\bwhere\b",
            f"WHERE {condition} AND",
            sql,
            count=1,
            flags=re.IGNORECASE,
        )
    else:
        return re.sub(
            r"\bfrom\s+profiles\b",
            f"FROM profiles WHERE {condition}",
            sql,
            count=1,
            flags=re.IGNORECASE,
        )


# ========================
# 🔥 MASTER REWRITER
# ========================
def rewrite_sql(sql: str, query: str) -> str:
    sql = clean_sql(sql)
    sql = add_geo_filter(sql, query)
    sql = add_region_filter(sql, query)
    sql = add_time_filter(sql, query)
    sql = add_nearest_filter(sql, query)
    return sql
