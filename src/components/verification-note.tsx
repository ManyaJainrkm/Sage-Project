/**
 * Surfaces Sage's verification outcome. This is a feature, not an error box:
 * it shows that evidence and recurrence claims were checked in code, and that
 * anything unverifiable was dropped rather than shown. A "degraded" run means
 * the safeguards fired — the results are the survivors.
 */
import type { ReasoningRun } from "~/types/sage";

export function VerificationNote({ run }: { run: ReasoningRun }) {
  const droppedEvidence = run.validation.evidence.length;
  const adjustedRecurrence = run.validation.recurrence.length;
  const clean = run.status === "complete" && run.warnings.length === 0;

  const accent = clean ? "var(--color-positive)" : "var(--color-warn)";

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
        <span className="text-sm font-medium text-ink">
          {clean ? "Every claim verified against your resume" : "Verification adjusted this result"}
        </span>
      </div>
      <p className="mt-2 text-[0.78rem] text-muted">
        {clean
          ? "Each strength quotes text found verbatim in your resume; recurring gaps were counted from posting IDs confirmed in code."
          : "Sage only shows claims it can prove. Unverifiable evidence and recurrence claims were removed before display."}
      </p>
      {(droppedEvidence > 0 || adjustedRecurrence > 0) && (
        <div className="mt-3 flex flex-wrap gap-4 text-[0.72rem] text-muted">
          {droppedEvidence > 0 && (
            <span>
              <span className="tabular-nums text-ink">{droppedEvidence}</span> evidence claim
              {droppedEvidence === 1 ? "" : "s"} dropped (not found verbatim)
            </span>
          )}
          {adjustedRecurrence > 0 && (
            <span>
              <span className="tabular-nums text-ink">{adjustedRecurrence}</span> recurrence claim
              {adjustedRecurrence === 1 ? "" : "s"} adjusted
            </span>
          )}
        </div>
      )}
    </div>
  );
}
