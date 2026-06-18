# FloatChat — Backend

FastAPI server that handles natural language → SQL conversion, PostgreSQL querying, ChromaDB RAG, and scientific answer generation.

---

## Prerequisites

- Python 3.11+
- PostgreSQL running locally
- [Ollama](https://ollama.ai) (optional — required only for local models)

---

## Setup

### 1. Virtual environment

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment variables

```bash
cp .env.example .env
# Edit .env — set OPENAI_API_KEY
```

### 3. Database

```bash
createdb floatchat
python -m db.insert
```

### 4. Vector embeddings

```bash
python -m rag.embedding
```

### 5. Ollama models (optional)

```bash
ollama pull mistral
ollama pull qwen2.5-coder
ollama pull llama3.2
```

---

## Running

```bash
# from backend/ with venv active
uvicorn main:app --reload
```

Server starts at `http://127.0.0.1:8000`.

---

## API Reference

### `GET /health`

Service identity check. Returns `{"service": "floatchat", "status": "ok"}`.

Used by the frontend status pills to distinguish FloatChat from any other service on port 8000.

---

### `GET /ask`

Main query endpoint.

**Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `query` | string | required | Natural language question |
| `model` | string | `"auto"` | `auto` · `gpt` · `mistral` · `qwen` · `llama` |

**Response:**

```json
{
  "answer": "Scientific prose answer...",
  "data": [ { "temperature": 22.1, "pressure": 10 }, "..." ],
  "sql": "SELECT * FROM profiles WHERE ...",
  "mode": "gpt"
}
```

**Error response:**

```json
{ "error": "Description of what went wrong" }
```

---

### `POST /export/netcdf`

**Body:** JSON array of row objects (same format as `data` from `/ask`)

**Returns:** `application/octet-stream` — `floatchat_export.nc`

---

### `POST /export/ascii`

**Body:** JSON array of row objects

**Returns:** `text/csv` — `floatchat_export.csv`

---

## Model Routing

The `auto` model uses keyword-based routing in `queries/router.py`:

| Trigger keywords | Model selected |
|---|---|
| `delete`, `drop`, `update`, `insert` | GPT (safety guard) |
| `oxygen`, `doxy`, `chlorophyll`, `chla`, `nitrate`, `bgc` | GPT |
| `temperature`, `pressure`, `salinity` | GPT |
| `trend`, `pattern`, `compare` | Mistral |
| Everything else | GPT |

Explicit model selection in the frontend bypasses routing entirely.

---

## Project Structure

```
backend/
├── main.py                  # FastAPI app — all routes
├── mcp_tools.py             # OpenAI function-calling tool definitions
├── export.py                # NetCDF4 and ASCII/CSV export
├── .env.example
├── requirements.txt
├── db/
│   └── insert.py            # Ingest NetCDF files → PostgreSQL
├── processing/
│   └── extract.py           # NetCDF parsing via xarray + BGC extraction
├── queries/
│   ├── router.py            # Model selection logic
│   ├── gpt_parser.py        # GPT-4o-mini text-to-SQL
│   ├── mistral_parser.py    # Mistral via Ollama
│   ├── qwen_parser.py       # QWEN 2.5 Coder via Ollama
│   ├── llama_parser.py      # LLaMA 3.2 via Ollama
│   ├── query_analyzer.py    # LLM-based query intent analysis
│   ├── sql_validator.py     # Block dangerous SQL (DROP, DELETE, etc.)
│   └── sql_cleaner.py       # Post-process and normalise generated SQL
├── rag/
│   ├── embedding.py         # Build ChromaDB vector index
│   ├── query.py             # Semantic search
│   └── answer_generator.py  # Mistral → scientific prose response
├── evaluation/
│   ├── evaluator.py
│   └── metrics.py
└── utils/
    └── logger.py
```

---

## Database Schema

Table: `profiles`

| Column | Type | Description |
|---|---|---|
| `pressure` | float | Depth in dbar |
| `temperature` | float | °C |
| `salinity` | float | PSU |
| `latitude` | float | Decimal degrees |
| `longitude` | float | Decimal degrees |
| `time` | timestamp | Observation time |
| `doxy` | float | Dissolved oxygen µmol/kg (BGC) |
| `chla` | float | Chlorophyll-a mg/m³ (BGC) |
| `nitrate` | float | Nitrate µmol/kg (BGC) |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes (for GPT) | Never commit this |
| `DATABASE_URL` | No | Defaults to `postgresql://localhost/floatchat` |

Variables are loaded from `backend/.env` via `python-dotenv`. The `.env` file is gitignored.

---

## Security

- `sql_validator.py` blocks all mutation queries before execution
- `sql_cleaner.py` strips model hallucinations and normalises names
- `OPENAI_API_KEY` read from environment only — never hardcoded
- Dangerous query keywords route to GPT which has the strictest guardrails

---

## Evaluation

```bash
python -m evaluation.evaluator
```

Reports success rate, average latency, and query handling accuracy.
