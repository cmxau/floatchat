import chromadb
import pandas as pd
from sqlalchemy import create_engine

engine = create_engine("postgresql://endurance@localhost/floatchat")

df = pd.read_sql("SELECT * FROM profiles", engine)


def row_to_text(row) -> str:
    parts = [
        f"Temperature {row.temperature:.2f}°C",
        f"Salinity {row.salinity:.2f} PSU",
        f"Pressure {row.pressure:.2f} dbar",
        f"Latitude {row.latitude:.3f}",
        f"Longitude {row.longitude:.3f}",
    ]
    for col, label, unit in [
        ("doxy",    "Dissolved Oxygen", "µmol/kg"),
        ("chla",    "Chlorophyll",      "mg/m³"),
        ("nitrate", "Nitrate",          "µmol/kg"),
    ]:
        if col in row.index and pd.notna(row[col]):
            parts.append(f"{label} {row[col]:.3f} {unit}")
    return ", ".join(parts)


df["text"] = df.apply(row_to_text, axis=1)

client = chromadb.PersistentClient(path="./chroma_db")

try:
    client.delete_collection("profiles")
except Exception:
    pass

collection = client.get_or_create_collection("profiles")

BATCH_SIZE = 100
documents = df["text"].tolist()
ids = [str(i) for i in range(len(df))]

for i in range(0, len(documents), BATCH_SIZE):
    collection.add(
        documents=documents[i:i + BATCH_SIZE],
        ids=ids[i:i + BATCH_SIZE]
    )

print(f"Embeddings stored: {len(documents)} records")
