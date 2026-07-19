"use client";

/** Shared CSS-variable colors for Recharts (matches app theme). */
export const chartColors = {
  primary: "var(--chart-1)",
  up: "var(--chart-up)",
  down: "var(--chart-down)",
  mid: "var(--chart-mid)",
  strong: "var(--chart-strong)",
  weak: "var(--chart-weak)",
  neutral: "var(--chart-neutral)",
  muted: "var(--muted-foreground)",
  grid: "var(--border)",
  tooltipBg: "var(--popover)",
  tooltipBorder: "var(--border)",
  tooltipFg: "var(--popover-foreground)",
};

export const layerPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-5)",
  "#5b8def",
  "#2dd4a8",
  "#c9a227",
];

export function formatCompactNumber(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}
