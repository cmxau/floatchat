import chromadb

client = chromadb.PersistentClient(path="./chroma_db")

try:
    collection = client.get_collection("profiles")
except Exception:
    collection = None


def query_vector(query: str):
    if not collection:
        return []

    try:
        results = collection.query(
            query_texts=[query],
            n_results=5
        )

        documents = results.get("documents", [])

        if not documents:
            return []

        return documents

    except Exception:
        return []