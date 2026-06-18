"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Point = {
  lat: number;
  lon: number;
  temp?: number;
  time?: string;
};

type LeafletMapProps = {
  points: Point[];
};

function tempToColor(temp: number | undefined): string {
  if (temp === undefined) return "#3b82f6";
  const t = Math.max(0, Math.min(30, temp));
  const r = Math.round((t / 30) * 255);
  const b = Math.round(255 - (t / 30) * 255);
  return `rgb(${r},80,${b})`;
}

export function LeafletMap({ points }: LeafletMapProps) {
  if (!points.length) return null;

  const center: [number, number] = [
    points.reduce((s, p) => s + p.lat, 0) / points.length,
    points.reduce((s, p) => s + p.lon, 0) / points.length,
  ];

  const polyPositions: [number, number][] = points.map((p) => [p.lat, p.lon]);

  return (
    <MapContainer
      center={center}
      zoom={4}
      style={{ height: "100%", width: "100%", borderRadius: "0.75rem", isolation: "isolate" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={polyPositions} color="#6366f1" weight={2} opacity={0.7} />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lon]}
          radius={i === points.length - 1 ? 8 : 5}
          pathOptions={{
            color: i === points.length - 1 ? "#f59e0b" : tempToColor(p.temp),
            fillColor: i === points.length - 1 ? "#f59e0b" : tempToColor(p.temp),
            fillOpacity: 0.85,
          }}
        >
          <Tooltip>
            <div className="text-xs space-y-0.5">
              <p>Lat: {p.lat.toFixed(3)}, Lon: {p.lon.toFixed(3)}</p>
              {p.temp !== undefined && <p>Temp: {p.temp.toFixed(2)}°C</p>}
              {p.time && <p>Time: {new Date(p.time).toLocaleDateString()}</p>}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
