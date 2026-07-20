/**
 * Throwaway smoke test for the live reasoning path. Makes ONE real call
 * through analyzeResumeAgainstPostings() using OPENAI_API_KEY.
 *
 *   npm run smoke:reasoning                    # N=1, single seeded posting
 *   npm run smoke:readiness                    # batched, all postings for a role
 *   npm run smoke:readiness -- backend-engineer-junior
 *
 * Confirms against the live endpoint: the model string and request shape are
 * accepted, the response parses and validates against the strict schema,
 * evidence verification ran, and — in batched mode — that recurrence survives
 * code-side verification. Nothing here is imported by the app.
 */
import {
  RECURRENCE_THRESHOLD,
  type ParsedResume,
  type ReasoningRun,
  type SageJobPosting,
} from "../src/lib/reasoning-schema.ts";
import { analyzeResumeAgainstPostings } from "../src/lib/sage-reasoning.ts";
import { postingsForRole, toModelPosting } from "../src/lib/job-retrieval.ts";

const DEFAULT_ROLE = "ai-ml-engineer-new-grad";

const resume: ParsedResume = {
  structured_text: [
    "Alex Chen — B.S. Computer Science, 2026.",
    "Machine Learning Intern, Summer 2025: built a retrieval-augmented question-answering",
    "prototype over internal docs using Python and a small open-source LLM. Wrote a nightly",
    "batch job in Python to clean and load ~2M support tickets into a Postgres database.",
    "Added an offline evaluation script that scored model answers against a labeled set.",
    "Projects: trained a PyTorch model to recommend courses and deployed it behind a Flask API.",
    "Skills: Python, SQL, PyTorch, Node.js, Docker, PostgreSQL.",
  ].join(" "),
};

function shortlist(roleTypeId: string, batched: boolean): SageJobPosting[] {
  const stored = postingsForRole(roleTypeId);
  if (stored.length === 0) throw new Error(`No seeded postings for role type "${roleTypeId}".`);
  const selected = batched ? stored : stored.slice(0, 1);
  return selected.map(toModelPosting);
}

/** Everything the N=1 report prints; shared by both modes. */
function reportCommon(run: ReasoningRun): void {
  console.log("status:            ", run.status);
  console.log("raw fit_score:     ", run.analysis.fit_score);
  console.log("fit_reasoning:     ", run.analysis.fit_reasoning);
  console.log("strengths kept:    ", run.analysis.strengths.length);
  console.log("gaps:              ", run.analysis.gaps.length);
  console.log("buried_strengths:  ", run.analysis.buried_strengths.length);
  console.log("evidence dropped:  ", run.validation.evidence.length);
  console.log("recurrence adjust: ", run.validation.recurrence.length);
  if (run.warnings.length) console.log("warnings:          ", run.warnings);

  console.log("\nStrengths (verified verbatim):");
  for (const strength of run.analysis.strengths) {
    console.log(`  • ${strength.skill}: “${strength.evidence_from_resume}”`);
  }

  if (run.validation.evidence.length > 0) {
    console.log("\nEvidence DROPPED (not found verbatim in resume):");
    for (const entry of run.validation.evidence) {
      console.log(`  ✗ [${entry.kind}] ${entry.skill}`);
      console.log(`      claimed: “${entry.evidence_from_resume}”`);
    }
  }
}

/** Batched-only: verified recurring gaps plus the near-misses that were cut. */
function reportRecurrence(run: ReasoningRun, total: number): void {
  const analysis = run.analysis;
  const recurring = "recurring_gaps" in analysis ? analysis.recurring_gaps : [];

  console.log(`\n=== RECURRING GAPS (threshold: >= ${RECURRENCE_THRESHOLD} verified posting ids) ===`);
  if (recurring.length === 0) {
    console.log("  (none cleared the threshold)");
  }
  for (const gap of recurring) {
    console.log(`\n  ▸ ${gap.skill}`);
    console.log(`      verified in:  ${gap.postings_mentioning} of ${gap.postings_total} postings`);
    console.log(`      posting_ids:  [${gap.posting_ids.join(", ")}]`);
    console.log(`      direction:    ${gap.suggested_direction}`);
  }

  console.log("\n=== RECURRENCE REJECTIONS / ADJUSTMENTS ===");
  if (run.validation.recurrence.length === 0) {
    console.log("  (none — every recurrence claim passed verification untouched)");
  }
  for (const entry of run.validation.recurrence) {
    const why =
      entry.reason === "invalid_posting_ids_removed"
        ? "invalid posting ids removed (model cited ids not in the shortlist)"
        : `below threshold (${entry.verified_posting_ids.length} verified < ${RECURRENCE_THRESHOLD})`;
    console.log(`\n  ✗ ${entry.skill}`);
    console.log(`      reason:    ${why}`);
    console.log(`      verified:  [${entry.verified_posting_ids.join(", ") || "none"}] (${entry.verified_posting_ids.length})`);
    if (entry.rejected_posting_ids.length > 0) {
      console.log(`      rejected:  [${entry.rejected_posting_ids.join(", ")}]`);
    }
  }
  console.log(`\n  shortlist size (postings_total computed in code): ${total}`);
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Export it and re-run.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const batched = args.includes("--batched") || process.env.SMOKE_MODE === "batched";
  const roleTypeId = args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_ROLE;

  const postings = shortlist(roleTypeId, batched);
  console.log(`Mode:      ${batched ? "BATCHED (readiness)" : "SINGLE (N=1)"}`);
  console.log(`Role type: ${roleTypeId}`);
  console.log(`Postings:  ${postings.length} -> [${postings.map((p) => p.id).join(", ")}]`);
  console.log(`Schema:    ${postings.length > 1 ? "batched (recurring_gaps present)" : "single (recurring_gaps omitted)"}`);
  console.log("\nCalling live model…\n");

  const run = await analyzeResumeAgainstPostings({ resume, postings });

  reportCommon(run);
  if (postings.length > 1) reportRecurrence(run, postings.length);

  console.log("\nSmoke test complete.");
}

main().catch((error: unknown) => {
  console.error("Smoke test failed:", error instanceof Error ? error.message : error);
  // Node hides transport failures behind "fetch failed"; print the real cause.
  const cause: unknown = error instanceof Error ? (error as { cause?: unknown }).cause : undefined;
  if (cause) console.error("  underlying cause:", cause);
  process.exit(1);
});
