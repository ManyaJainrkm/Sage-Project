/**
 * Verified recurring gaps rendered as the centerpiece: each is a skill that
 * recurs across the shortlist (with the code-verified count and the specific
 * postings that back it) plus a project DIRECTION to build toward — never a
 * full project spec.
 */
import type { VerifiedRecurringGap } from "~/types/sage";
import { storedPostingById } from "~/lib/job-retrieval";

function PostingChips({ ids }: { ids: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const posting = storedPostingById(id);
        return (
          <span
            key={id}
            className="border border-line px-2 py-0.5 text-[0.66rem] text-muted"
            title={posting?.company_archetype ?? id}
          >
            {posting?.title ?? id}
          </span>
        );
      })}
    </div>
  );
}

export function ProjectDirections({ gaps }: { gaps: VerifiedRecurringGap[] }) {
  if (gaps.length === 0) {
    return (
      <p className="text-sm text-muted">
        No single gap recurred across enough postings to clear the threshold. Nothing here is a
        verified cross-role pattern, so check the per-role gaps above.
      </p>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {gaps.map((gap, index) => (
        <div key={`${gap.skill}-${index}`} className="panel flex flex-col p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold text-ink">{gap.skill}</h3>
            <span className="shrink-0 text-sm font-medium text-gold tabular-nums">
              {gap.postings_mentioning} of {gap.postings_total}
            </span>
          </div>
          <p className="mt-1 text-[0.72rem] text-muted">postings for this role require it</p>

          <div className="mt-4 border-t border-line pt-4">
            <div className="eyebrow mb-1">Direction to build</div>
            <p className="text-sm text-ink/90">{gap.suggested_direction}</p>
          </div>

          <PostingChips ids={gap.posting_ids} />
        </div>
      ))}
    </div>
  );
}
