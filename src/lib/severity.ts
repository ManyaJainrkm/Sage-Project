/**
 * Maps gap severity to the functional data colors. These colors carry meaning
 * only — a severe gap is critical-red because it is critical, never for
 * decoration. Gold stays the brand color and is not used here.
 */
import type { GapSeverity } from "~/types/sage";

export interface SeverityStyle {
  label: string;
  /** CSS color value for the severity dot / bar. */
  color: string;
  /** Sort weight, most severe first. */
  weight: number;
}

const SEVERITY: Record<GapSeverity, SeverityStyle> = {
  blocking: { label: "Blocking", color: "var(--color-critical)", weight: 0 },
  significant: { label: "Significant", color: "var(--color-warn)", weight: 1 },
  minor: { label: "Minor", color: "var(--color-info)", weight: 2 },
};

export function severityStyle(severity: GapSeverity): SeverityStyle {
  return SEVERITY[severity];
}

export function bySeverity<T extends { severity: GapSeverity }>(a: T, b: T): number {
  return SEVERITY[a.severity].weight - SEVERITY[b.severity].weight;
}
