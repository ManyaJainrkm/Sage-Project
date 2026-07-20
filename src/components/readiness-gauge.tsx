/**
 * The fit/readiness score as an instrument ring. The number is the signature
 * metric, so the arc is rendered in the brand gold. A short calibration label
 * reminds the viewer the score uses the full 0-100 range, not a 60-85 cluster.
 */
interface ScoreGaugeProps {
  score: number;
  /** e.g. "Readiness for this role type" or "Fit for this posting". */
  caption: string;
  size?: number;
}

function band(score: number): string {
  if (score >= 85) return "Strong match";
  if (score >= 65) return "Solid, with real gaps";
  if (score >= 45) return "Right domain, several gaps";
  if (score >= 25) return "Early: major gaps";
  return "Fundamentally different";
}

export function ScoreGauge({ score, caption, size = 176 }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-track)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold tabular-nums text-ink">{clamped}</span>
          <span className="text-xs text-muted">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gold">{band(clamped)}</div>
        <div className="text-[0.72rem] text-muted">{caption}</div>
      </div>
    </div>
  );
}
