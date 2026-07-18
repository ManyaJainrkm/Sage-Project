/**
 * Throwaway smoke test for the live reasoning path. Makes ONE real call
 * through analyzeResumeAgainstPostings() against a hardcoded sample resume and
 * a single seeded posting, using OPENAI_API_KEY from the environment.
 *
 * Run:  OPENAI_API_KEY=sk-... npm run smoke:reasoning
 *
 * It confirms, against the live endpoint:
 *   - the model string and request shape are accepted (no API error)
 *   - payload.output_text parses and validates against the strict schema
 *   - evidence verification ran (what passed / what was dropped)
 *   - the raw fit_score the model returned
 * Nothing here is imported by the app; it exists only to de-risk the API.
 */
import { analyzeResumeAgainstPostings } from "../src/lib/sage-reasoning.ts";
import type { ParsedResume, SageJobPosting } from "../src/lib/reasoning-schema.ts";
import { toModelPosting } from "../src/lib/job-retrieval.ts";
import { postingsForRole } from "../src/lib/job-retrieval.ts";

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

function firstAiPosting(): SageJobPosting {
  const stored = postingsForRole("ai-ml-engineer-new-grad")[0];
  if (!stored) throw new Error("Seed dataset missing ai-ml-engineer-new-grad postings.");
  return toModelPosting(stored);
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Export it and re-run.");
    process.exit(1);
  }
  const posting = firstAiPosting();
  console.log(`Calling live model with 1 posting (${posting.id})…\n`);

  const run = await analyzeResumeAgainstPostings({ resume, postings: [posting] });

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
  console.log("\nSmoke test complete.");
}

main().catch((error: unknown) => {
  console.error("Smoke test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
