"use client";

import { useMemo } from "react";
import type { ChatSession } from "@/context/chat-context";

const SUGGESTIONS: Record<string, string[]> = {
  temperature: [
    "How does temperature change with pressure?",
    "Show the salinity profile alongside temperature",
    "Which depth has the highest temperature?",
  ],
  salinity: [
    "Plot the T-S diagram for this data",
    "How does salinity vary with depth?",
    "Find regions with salinity above 36 PSU",
  ],
  trajectory: [
    "Show temperature profile for this float",
    "What was the max depth this float reached?",
    "Show salinity along the trajectory",
  ],
  bgc: [
    "Show dissolved oxygen at different depths",
    "Is there a chlorophyll maximum layer?",
    "How does nitrate change with depth?",
  ],
  pressure: [
    "Show temperature at depths below 500 dbar",
    "What is the average salinity at max depth?",
    "Plot temperature and salinity profiles together",
  ],
  default: [
    "Show me the float trajectory",
    "What is the average temperature in the Arabian Sea?",
    "Show salinity trends over time",
    "Find floats near 20N 65E",
    "Show temperature above 25 degrees",
    "Compare temperature and salinity profiles",
  ],
};

function pick(arr: string[], seed: number): string {
  return arr[seed % arr.length];
}

export function useNextSuggestion(currentChat?: ChatSession): string | null {
  return useMemo(() => {
    const messages = currentChat?.messages ?? [];
    if (messages.length === 0) return null;

    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return null;

    const content = last.content.toLowerCase();
    const data = last.data;
    const seed = messages.length;

    if (data?.length) {
      const cols = Object.keys(data[0]).map((c) => c.toLowerCase());
      if (cols.includes("latitude") && cols.includes("longitude")) {
        return pick(SUGGESTIONS.trajectory, seed);
      }
      const hasBgc = cols.some((c) => ["doxy", "chla", "nitrate"].includes(c));
      if (hasBgc) return pick(SUGGESTIONS.bgc, seed);
    }

    if (content.includes("temperature")) return pick(SUGGESTIONS.temperature, seed);
    if (content.includes("salinity")) return pick(SUGGESTIONS.salinity, seed);
    if (content.includes("pressure")) return pick(SUGGESTIONS.pressure, seed);

    return pick(SUGGESTIONS.default, seed);
  }, [currentChat?.messages?.length]);
}
