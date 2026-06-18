# FloatChat — Frontend

Next.js 15 chat interface for querying ARGO ocean data. Renders AI responses with depth profiles, T-S diagrams, trajectory maps, and raw data tables.

---

## Prerequisites

- Node.js 18+
- Backend running at `http://127.0.0.1:8000` — see [`backend/README.md`](../backend/README.md)

---

## Setup

```bash
cd frontend
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

---

## Features

### Chat

- Natural language queries sent to the FastAPI backend
- Markdown rendering in AI responses (headings, bold, bullet lists)
- Error states: offline card (backend down), error card (query failure), HTTP error card
- Query history — press `↑` / `↓` in the input to navigate previous queries
- Context-aware next query suggestion pill above the input
- Export full conversation as `.txt` via the download button in the header

### Sidebar

- Multiple chats with rename and delete
- **Projects** — group chats into colour-coded folders (blue, green, red, purple, orange)
  - Create, rename, delete projects
  - Move chats between projects
  - Collapse/expand project folders
- Mobile: slides in as a drawer, closes automatically on chat selection

### Visualisations

All charts rendered with **Recharts** (`ScatterChart` + `ResponsiveContainer`):

| Chart | X axis | Y axis | When shown |
|---|---|---|---|
| Temperature Profile | Temperature (°C) | Pressure (dbar, inverted) | data has temperature + pressure |
| Salinity Profile | Salinity (PSU) | Pressure (dbar, inverted) | data has salinity + pressure |
| T-S Diagram | Temperature (°C) | Salinity (PSU) | data has both |
| Float Trajectory | — | — | data has latitude + longitude |

Pressure Y-axis is inverted (0 dbar at top, deep at bottom) following oceanographic convention.

Float trajectory uses **react-leaflet v5** with `isolation: isolate` on the map container to prevent Leaflet's internal z-index from bleeding through modals.

**Stat cards** above charts show Avg Temp, Max Pressure, Avg Salinity when available.

### Data Export

Available inside the Raw Data accordion of any result:

| Format | Description |
|---|---|
| CSV | Comma-separated, browser-side |
| JSON | Pretty-printed, browser-side |
| NetCDF | Via `POST /export/netcdf` — scientific format |
| ASCII | Via `POST /export/ascii` — plain CSV via backend |

Raw data table shows first 50 rows with a note if the full dataset is larger.

### Settings

Opened via the gear icon or `⌘,`:

**Appearance tab**
- Light / Dark / System theme
- Advanced mode toggle — reveals generated SQL in chat when enabled

**API Keys tab**
- OpenAI key (stored in localStorage, never sent to any server other than OpenAI)
- Mistral key (optional — local Ollama doesn't need one)
- Changes buffered until Save is clicked

**Model tab**
- Select default model: Auto, GPT-4o-mini, Mistral, QWEN 2.5 Coder, LLaMA 3.2
- Ollama status section — shows pulled models as chips (pings localhost:11434 on tab open)
- Changes buffered until Save is clicked

### Status Pills (header)

Two labeled status indicators replace the old anonymous dot:

- **API** — checks `http://127.0.0.1:8000/health`, verifies `service === "floatchat"`
- **Ollama** — shown only when a local model is selected, checks `localhost:11434/api/tags`

Both poll every 30 seconds. Hover any pill for the exact terminal command to start the service.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | New chat |
| `⌘,` / `Ctrl+,` | Open settings |
| `↑` / `↓` | Navigate query history (single-line input only) |
| `Enter` | Send message |
| `Shift+Enter` | New line in input |

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx             # Root layout, providers, viewport meta
│   ├── page.tsx               # Renders AppShell
│   └── globals.css
├── components/
│   ├── chat/
│   │   ├── chat-window.tsx    # Main chat UI, header, status pills, keyboard shortcuts
│   │   ├── chat-input.tsx     # Auto-resize textarea, suggestion pill, history nav
│   │   ├── data-visualizer.tsx # Recharts charts + Leaflet map + export buttons
│   │   └── leaflet-map.tsx    # react-leaflet trajectory map
│   ├── layout/
│   │   └── app-shell.tsx      # Sidebar + main split, mobile drawer state
│   ├── sidebar/
│   │   └── chat-sidebar.tsx   # Chats list, projects accordion, rename/delete
│   └── settings/
│       └── settings-modal.tsx # Tabbed settings (appearance, api keys, model)
├── context/
│   ├── chat-context.tsx       # Chats + projects state (localStorage)
│   └── settings-context.tsx   # Theme, model, API keys, advancedMode (localStorage)
└── hooks/
    ├── use-health-check.ts    # Polls API + Ollama every 30s
    ├── use-query-history.ts   # Last 20 queries, ↑↓ navigation
    └── use-next-suggestion.ts # Context-aware next query based on last response
```

---

## Persistence

All state is stored in `localStorage` — no user accounts, no server-side sessions:

| Key | Contents |
|---|---|
| `floatchat_sessions` | All chat messages and metadata |
| `floatchat_projects` | Project definitions (id, name, color) |
| `floatchat_settings` | Theme, model, API keys, advancedMode |
| `floatchat_query_history` | Last 20 unique queries |

---

## Responsive Layout

| Breakpoint | Sidebar behaviour |
|---|---|
| `< lg` (mobile/tablet) | Fixed overlay drawer, opens via hamburger, closes on chat select |
| `lg+` (laptop/desktop) | Static in document flow, always visible |
| `2xl+` (TV/large desktop) | Sidebar widens to 320px, messages area widens to 6xl |

Settings modal is a bottom sheet on mobile, centred dialog on `sm+`.

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| next | 15.x | Framework |
| react | 19.x | UI |
| tailwindcss | 4.x | Styling |
| shadcn/ui | — | Component primitives |
| recharts | 2.x | Charts |
| react-leaflet | 5.x | Maps |
| lucide-react | — | Icons |
