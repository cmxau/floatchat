# FloatChat

> AI-powered ocean intelligence assistant for querying and visualising ARGO float data using natural language.

---

## Problem

ARGO float data is scientifically invaluable — thousands of autonomous profiling floats collect temperature, salinity, pressure, and biogeochemical measurements across the global ocean. But the data lives in NetCDF files and PostgreSQL tables that require domain expertise and SQL knowledge to access. Oceanographers and researchers spend significant time writing queries, wrangling data, and building one-off visualisations instead of doing science.

**FloatChat solves this** by letting users ask questions in plain English and get back structured data, charts, and scientific-quality prose answers — no SQL, no code.

---

## What It Does

1. User types a natural language question ("show temperature profile in Arabian Sea above 19°C")
2. Backend routes the query to the appropriate LLM (GPT-4o-mini, Mistral, QWEN, or LLaMA)
3. LLM generates SQL → executed against PostgreSQL ARGO database
4. ChromaDB RAG pipeline adds semantic context from indexed oceanographic documents
5. Answer generator synthesises a scientific prose response
6. Frontend renders the answer with depth profiles, T-S diagrams, trajectory maps, and raw data tables

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                      Browser                        │
│   Next.js 15 · React 19 · Tailwind · shadcn/ui      │
│   Recharts · react-leaflet · localStorage           │
└────────────────────────┬────────────────────────────┘
                         │ HTTP  (port 3000 → 8000)
┌────────────────────────▼────────────────────────────┐
│                   FastAPI Backend                   │
│                                                     │
│   /ask ──► model router ──► LLM parser ──► SQL      │
│        └──► ChromaDB RAG ──► answer generator       │
│                                                     │
│   GET  /health           service identity check     │
│   POST /export/netcdf    download as NetCDF4        │
│   POST /export/ascii     download as CSV            │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
   ┌───────────▼──────────┐  ┌────────▼──────────────┐
   │     PostgreSQL        │  │   Ollama  (local)     │
   │     floatchat DB      │  │   Mistral             │
   │     ARGO profiles     │  │   QWEN 2.5 Coder      │
   │     BGC parameters    │  │   LLaMA 3.2           │
   └──────────────────────┘  └───────────────────────┘
```

---

## Repository Structure

```
floatchat/
├── README.md              ← you are here
├── backend/
│   ├── README.md          ← backend setup, API reference, models
│   └── ...
└── frontend/
    ├── README.md          ← frontend setup, components, features
    └── ...
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| Maps | react-leaflet v5 |
| Backend | FastAPI, Uvicorn |
| Database | PostgreSQL, SQLAlchemy |
| Vector store | ChromaDB |
| LLM (cloud) | OpenAI GPT-4o-mini |
| LLM (local) | Ollama — Mistral, QWEN 2.5 Coder, LLaMA 3.2 |
| Data format | NetCDF4 via xarray |

---

## Quick Start

```bash
git clone https://github.com/cmxau/floatchat.git
cd floatchat
```

- **Backend setup →** [`backend/README.md`](backend/README.md)
- **Frontend setup →** [`frontend/README.md`](frontend/README.md)

---

## Data Source

FloatChat is built on [ARGO](https://argo.ucsd.edu) — a global array of ~4,000 autonomous profiling floats that measure ocean temperature, salinity, and pressure every 10 days from the surface to 2,000 m depth. BGC-Argo floats additionally measure dissolved oxygen, chlorophyll-a, and nitrate.

---

Built by [cmxau](https://github.com/cmxau) · [Report an issue](https://github.com/cmxau/floatchat/issues)
