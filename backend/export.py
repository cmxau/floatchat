import io
import tempfile
import os
from typing import List, Dict, Any

import netCDF4 as nc
import numpy as np


def rows_to_netcdf(rows: List[Dict[str, Any]]) -> bytes:
    """Convert query result rows to NetCDF4 bytes."""
    if not rows:
        raise ValueError("No data to export")

    keys = list(rows[0].keys())
    n = len(rows)

    with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        ds = nc.Dataset(tmp_path, "w", format="NETCDF4")
        ds.createDimension("obs", n)
        ds.title = "FloatChat ARGO export"
        ds.source = "ARGO float data via FloatChat"

        for key in keys:
            sample = rows[0][key]
            if isinstance(sample, (int, float)) or sample is None:
                var = ds.createVariable(key, "f4", ("obs",), fill_value=9.96921e+36)
                var[:] = np.array(
                    [float(r[key]) if r[key] is not None else 9.96921e+36 for r in rows],
                    dtype="f4"
                )
            else:
                # Store as string variable
                str_len = max(len(str(r[key])) for r in rows if r[key] is not None) or 1
                var = ds.createVariable(key, "S1", ("obs",))
                values = np.array(
                    [str(r[key]) if r[key] is not None else "" for r in rows],
                    dtype=f"S{str_len}"
                )
                var[:] = values

        ds.close()

        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def rows_to_ascii(rows: List[Dict[str, Any]]) -> str:
    """Convert query result rows to ASCII/CSV text."""
    if not rows:
        return ""

    keys = list(rows[0].keys())
    lines = [",".join(keys)]
    for row in rows:
        line = ",".join(
            "" if row[k] is None else (f"{row[k]:.4f}" if isinstance(row[k], float) else str(row[k]))
            for k in keys
        )
        lines.append(line)
    return "\n".join(lines)
