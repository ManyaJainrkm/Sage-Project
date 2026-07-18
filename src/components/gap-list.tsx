/**
 * The gaps, sorted most-severe first, each with a severity indicator whose
 * color carries the meaning (critical / warning / info). A gap is a missing or
 * under-demonstrated requirement — never merely an absent keyword.
 */
import type { RoleGap } from "~/types/sage";
import { bySeverity, severityStyle } from "~/lib/severity";

export function GapList({ gaps }: { gaps: RoleGap[] }) {
  if (gaps.length === 0) {
    return <p className="text-sm text-muted">No material gaps surfaced for this role.</p>;
  }
  const sorted = [...gaps].sort(bySeverity);
  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((gap, index) => {
        const style = severityStyle(gap.severity);
        return (
          <li key={`${gap.skill}-${index}`} className="panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: style.color }}
                />
                <span className="font-medium text-ink">{gap.skill}</span>
              </div>
              <span
                className="text-[0.66rem] uppercase tracking-wider"
                style={{ color: style.color }}
              >
                {style.label}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">{gap.why_it_matters_for_this_role}</p>
          </li>
        );
      })}
    </ul>
  );
}
