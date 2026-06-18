def validate_sql(sql: str):

    if not sql:
        return False, "Empty SQL"

    sql = sql.lower()

    if not sql.startswith("select"):
        return False, "Only SELECT allowed"

    if "from" not in sql:
        return False, "Missing FROM clause"

    return True, "Valid"