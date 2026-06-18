from sqlalchemy import create_engine, text
import pandas as pd

from processing.extract import extract_core_data, clean_dataframe


def ensure_bgc_columns(engine):
    """Add BGC columns to profiles table if they don't exist (idempotent)."""
    with engine.connect() as conn:
        for col, dtype in [("doxy", "FLOAT"), ("chla", "FLOAT"), ("nitrate", "FLOAT")]:
            try:
                conn.execute(text(
                    f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} {dtype}"
                ))
                conn.commit()
            except Exception:
                conn.rollback()


def insert_data(file_path: str):
    engine = create_engine("postgresql://endurance@localhost/floatchat")

    try:
        df = extract_core_data(file_path)
        df = clean_dataframe(df)

        if df.empty:
            print("No data to insert")
            return

        df["time"] = pd.to_datetime(df["time"], errors="coerce")
        df = df.dropna(subset=["temperature", "salinity", "pressure"])
        df = df.drop_duplicates()

        # Ensure BGC columns exist before inserting
        ensure_bgc_columns(engine)

        BATCH_SIZE = 500
        for i in range(0, len(df), BATCH_SIZE):
            batch = df.iloc[i:i + BATCH_SIZE]
            batch.to_sql("profiles", engine, if_exists="append", index=False)

        print(f"Inserted {len(df)} rows successfully")
        bgc = [c for c in ["doxy", "chla", "nitrate"] if df[c].notna().any()]
        if bgc:
            print(f"BGC parameters included: {bgc}")

    except Exception as e:
        print(f"Error inserting data: {str(e)}")


if __name__ == "__main__":
    insert_data("data/argo_sample.nc")
