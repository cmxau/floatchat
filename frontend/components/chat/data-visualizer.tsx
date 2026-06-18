"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Download, Thermometer, Droplets, BarChart2, MapPin, Table2 } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";

const LeafletMap = dynamic(
  () => import("./leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  }
);

type DataVisualizerProps = {
  data: any[];
};

const CHART_COLORS = {
  temp: "#ef4444",
  salinity: "#3b82f6",
  scatter: "#8b5cf6",
  grid: "hsl(var(--border))",
  text: "hsl(var(--muted-foreground))",
};

export function DataVisualizer({ data }: DataVisualizerProps) {
  const [showRaw, setShowRaw] = useState(false);

  if (!data || data.length === 0) return null;

  const cols = Object.keys(data[0] || {});
  const getCol = (name: string) =>
    cols.find((c) => c.toLowerCase() === name.toLowerCase());

  const tempCol = getCol("temperature");
  const pressureCol = getCol("pressure");
  const salinityCol = getCol("salinity");
  const latCol = getCol("latitude");
  const lonCol = getCol("longitude");
  const timeCol = getCol("time");

  const hasTemp = !!tempCol;
  const hasPressure = !!pressureCol;
  const hasSalinity = !!salinityCol;
  const hasLatLon = !!latCol && !!lonCol;

  let avgTemp = 0,
    maxPressure = 0,
    avgSalinity = 0;
  if (hasTemp && tempCol)
    avgTemp =
      data.reduce((s, d) => s + (Number(d[tempCol]) || 0), 0) / data.length;
  if (hasPressure && pressureCol)
    maxPressure = Math.max(...data.map((d) => Number(d[pressureCol]) || 0));
  if (hasSalinity && salinityCol)
    avgSalinity =
      data.reduce((s, d) => s + (Number(d[salinityCol]) || 0), 0) / data.length;

  // Sort by pressure ascending (surface → deep) for correct profile orientation
  const sortedByPressure = hasPressure
    ? [...data]
        .filter((d) => d[pressureCol!] != null)
        .sort((a, b) => Number(a[pressureCol!]) - Number(b[pressureCol!]))
    : data;

  // Depth profiles: x = variable, y = pressure (inverted on chart)
  const tempProfileData = sortedByPressure.map((d) => ({
    x: Number(d[tempCol!]) || 0,
    y: Number(d[pressureCol!]) || 0,
  }));

  const salinityProfileData = sortedByPressure.map((d) => ({
    x: Number(d[salinityCol!]) || 0,
    y: Number(d[pressureCol!]) || 0,
  }));

  // T-S diagram: x = temperature, y = salinity
  const tsData = data.map((d) => ({
    x: Number(d[tempCol!]) || 0,
    y: Number(d[salinityCol!]) || 0,
  }));

  // --- download helpers ---
  const downloadCsv = () => {
    const header = cols.join(",");
    const rows = data.map((r) => Object.values(r).join(",")).join("\n");
    trigger(`${header}\n${rows}`, "text/csv", "data.csv");
  };

  const downloadJson = () => {
    trigger(JSON.stringify(data, null, 2), "application/json", "data.json");
  };

  const downloadNetCDF = async () => {
    const res = await fetch("http://localhost:8000/export/netcdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    triggerBlob(await res.blob(), "floatchat_export.nc");
  };

  const downloadAscii = async () => {
    const res = await fetch("http://localhost:8000/export/ascii", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    triggerBlob(await res.blob(), "floatchat_export.csv");
  };

  return (
    <div className="mt-4 flex flex-col gap-5 w-full">
      {/* Stat cards */}
      {(hasTemp || hasPressure || hasSalinity) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {hasTemp && <StatCard label="Avg Temp" value={`${avgTemp.toFixed(2)} °C`} accent="text-red-500" />}
          {hasPressure && <StatCard label="Max Pressure" value={`${maxPressure.toFixed(0)} dbar`} accent="text-sky-500" />}
          {hasSalinity && <StatCard label="Avg Salinity" value={`${avgSalinity.toFixed(2)} PSU`} accent="text-blue-500" />}
        </div>
      )}

      {/* Depth profiles — temperature/salinity on X, pressure (inverted) on Y */}
      {hasPressure && (hasTemp || hasSalinity) && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          {hasTemp && (
            <ChartCard title="Temperature Profile" icon={<Thermometer size={14} />}>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="x"
                    name="Temperature"
                    type="number"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  >
                    <Label value="Temperature (°C)" offset={-10} position="insideBottom" style={{ fontSize: 11, fill: CHART_COLORS.text }} />
                  </XAxis>
                  <YAxis
                    dataKey="y"
                    name="Pressure"
                    type="number"
                    reversed
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  >
                    <Label value="Pressure (dbar)" angle={-90} position="insideLeft" style={{ fontSize: 11, fill: CHART_COLORS.text }} />
                  </YAxis>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: string) => [
                      name === "Temperature" ? `${Number(v).toFixed(2)} °C` : `${Number(v).toFixed(0)} dbar`,
                      name,
                    ]}
                  />
                  <Scatter
                    data={tempProfileData}
                    fill={CHART_COLORS.temp}
                    fillOpacity={0.5}
                    line={{ stroke: CHART_COLORS.temp, strokeWidth: 2 }}
                    lineType="joint"
                    shape={() => null as any}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
          {hasSalinity && (
            <ChartCard title="Salinity Profile" icon={<Droplets size={14} />}>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="x"
                    name="Salinity"
                    type="number"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  >
                    <Label value="Salinity (PSU)" offset={-10} position="insideBottom" style={{ fontSize: 11, fill: CHART_COLORS.text }} />
                  </XAxis>
                  <YAxis
                    dataKey="y"
                    name="Pressure"
                    type="number"
                    reversed
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11, fill: CHART_COLORS.text }}
                  >
                    <Label value="Pressure (dbar)" angle={-90} position="insideLeft" style={{ fontSize: 11, fill: CHART_COLORS.text }} />
                  </YAxis>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: string) => [
                      name === "Salinity" ? `${Number(v).toFixed(2)} PSU` : `${Number(v).toFixed(0)} dbar`,
                      name,
                    ]}
                  />
                  <Scatter
                    data={salinityProfileData}
                    fill={CHART_COLORS.salinity}
                    fillOpacity={0.5}
                    line={{ stroke: CHART_COLORS.salinity, strokeWidth: 2 }}
                    lineType="joint"
                    shape={() => null as any}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      {/* T-S Diagram */}
      {hasTemp && hasSalinity && (
        <ChartCard title="T-S Diagram" icon={<BarChart2 size={14} />}>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="x" name="Temperature" type="number" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: CHART_COLORS.text }}>
                <Label value="Temperature (°C)" offset={-8} position="insideBottom" style={{ fontSize: 11, fill: CHART_COLORS.text }} />
              </XAxis>
              <YAxis dataKey="y" name="Salinity" type="number" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: CHART_COLORS.text }}>
                <Label value="Salinity (PSU)" angle={-90} position="insideLeft" style={{ fontSize: 11, fill: CHART_COLORS.text }} />
              </YAxis>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, name: string) => [
                  name === "Temperature" ? `${Number(v).toFixed(2)} °C` : `${Number(v).toFixed(2)} PSU`,
                  name,
                ]}
              />
              <Scatter data={tsData} fill={CHART_COLORS.scatter} fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Leaflet trajectory map */}
      {hasLatLon && (
        <ChartCard title="Float Trajectory" icon={<MapPin size={14} />}>
          <div className="h-96 w-full overflow-hidden rounded-xl">
            <LeafletMap
              points={data.map((d) => ({
                lat: Number(d[latCol!]),
                lon: Number(d[lonCol!]),
                temp: tempCol ? Number(d[tempCol]) : undefined,
                time: timeCol ? String(d[timeCol]) : undefined,
              }))}
            />
          </div>
        </ChartCard>
      )}

      {/* Raw data accordion */}
      <div className="rounded-xl border border-border bg-card">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2"><Table2 size={14} /> Raw Data</span>
          <span className="text-muted-foreground text-xs">{showRaw ? "▼" : "▶"}</span>
        </button>
        {showRaw && (
          <div className="border-t border-border p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { label: "CSV", fn: downloadCsv, cls: "bg-primary text-primary-foreground hover:bg-primary/90" },
                { label: "JSON", fn: downloadJson, cls: "bg-primary text-primary-foreground hover:bg-primary/90" },
                { label: "NetCDF", fn: downloadNetCDF, cls: "bg-emerald-600 text-white hover:bg-emerald-700" },
                { label: "ASCII", fn: downloadAscii, cls: "bg-slate-600 text-white hover:bg-slate-700" },
              ].map(({ label, fn, cls }) => (
                <button key={label} onClick={fn} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs ${cls}`}>
                  <Download className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted">
                  <tr>
                    {cols.map((col) => (
                      <th key={col} className="px-3 py-2 font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-muted/40 transition-colors">
                      {cols.map((col) => (
                        <td key={col} className="px-3 py-2">
                          {typeof row[col] === "number" ? row[col].toFixed(3) : String(row[col] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 50 && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Showing 50 of {data.length} rows — download for full dataset
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}{title}
      </h3>
      {children}
    </div>
  );
}

function trigger(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  triggerBlob(blob, filename);
}

function triggerBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
