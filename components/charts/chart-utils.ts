export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function scoreColor(value: number) {
  if (value >= 75) {
    return "var(--chart-strong)";
  }

  if (value >= 50) {
    return "var(--chart-mid)";
  }

  return "var(--chart-weak)";
}

export function signedColor(value: number) {
  if (value > 0.5) {
    return "var(--chart-up)";
  }

  if (value < -0.5) {
    return "var(--chart-down)";
  }

  return "var(--chart-neutral)";
}

export const donutPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
