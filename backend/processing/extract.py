import xarray as xr
import pandas as pd
import numpy as np


def extract_core_data(file_path: str) -> pd.DataFrame:
    try:
        ds = xr.open_dataset(file_path)

        pressure    = ds.get("PRES")
        temperature = ds.get("TEMP")
        salinity    = ds.get("PSAL")

        if pressure is None or temperature is None or salinity is None:
            raise ValueError("Missing required variables in NetCDF")

        pressure    = pressure.values[0]
        temperature = temperature.values[0]
        salinity    = salinity.values[0]

        latitude  = float(ds.get("LATITUDE").values[0])
        longitude = float(ds.get("LONGITUDE").values[0])

        juld = ds.get("JULD").values[0]
        if np.issubdtype(juld.dtype, np.datetime64):
            time = pd.to_datetime(juld)
        else:
            reference = pd.to_datetime("1950-01-01")
            time = reference + pd.to_timedelta(juld, unit="D")

        n = len(pressure)

        def _safe(var_name):
            """Extract BGC variable or return None-filled array if absent."""
            v = ds.get(var_name)
            if v is not None:
                try:
                    arr = v.values[0].astype(float)
                    if len(arr) == n:
                        return arr
                except Exception:
                    pass
            return [None] * n

        df = pd.DataFrame({
            "pressure":    pressure,
            "temperature": temperature,
            "salinity":    salinity,
            "latitude":    latitude,
            "longitude":   longitude,
            "time":        time,
            "doxy":        _safe("DOXY"),     # dissolved oxygen µmol/kg
            "chla":        _safe("CHLA"),     # chlorophyll mg/m³
            "nitrate":     _safe("NITRATE"),  # nitrate µmol/kg
        })

        return df

    except Exception as e:
        print(f"Error extracting data: {str(e)}")
        return pd.DataFrame()


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    fill_vals = [99999, 9999, -999, -9999, 99999.0, 9.96921e+36]
    for col in ["pressure", "temperature", "salinity", "doxy", "chla", "nitrate"]:
        if col in df.columns:
            df[col] = df[col].replace(fill_vals, np.nan)

    # Core columns required; BGC columns may be all-null
    df = df.dropna(subset=["temperature", "salinity", "pressure"])
    df = df[
        (df["temperature"] > -5) & (df["temperature"] < 50) &
        (df["salinity"] > 0)     & (df["salinity"] < 50) &
        (df["pressure"] >= 0)
    ]
    df = df.reset_index(drop=True)
    return df


if __name__ == "__main__":
    df = extract_core_data("../data/argo_sample.nc")
    df = clean_dataframe(df)
    print(df.head())
    print(f"Total rows: {len(df)}")
    print(f"BGC cols present: {[c for c in ['doxy','chla','nitrate'] if df[c].notna().any()]}")
