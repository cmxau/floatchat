def log(query, model=None, sql=None, latency=None, error=None):
    print("\n" + "=" * 50)

    print(f"[QUERY]   {query}")

    if model:
        print(f"[MODEL]   {model}")

    if sql:
        print(f"[SQL]     {sql}")

    if latency is not None:
        print(f"[LATENCY] {latency:.4f}s")

    if error:
        print(f"[ERROR]   {error}")

    print("=" * 50)