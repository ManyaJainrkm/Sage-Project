/**
 * Server boundary for Sage's reasoning. These are the ONLY functions the
 * client calls to run analysis. Everything model-facing stays here:
 *   - OPENAI_API_KEY is read server-side and never reaches the browser
 *   - the seeded dataset is filtered server-side; the client sends a role id,
 *     not postings, so the dataset shortlist is never client-trusted
 *   - resumes are processed in-memory per request and never persisted
 *
 * Two entry points map to Sage's two flows:
 *   analyzeRoleReadinessFn  -> pick a role type  -> batched readiness call
 *   analyzeSinglePostingFn  -> paste your own JD  -> single-posting analysis
 */
import { createServerFn } from "@tanstack/react-start";

import type { ParsedResume, ReasoningRun, SageJobPosting } from "~/lib/reasoning-schema";
import { analyzeResumeAgainstPostings } from "~/lib/sage-reasoning";
import { shortlistForRole } from "~/lib/job-retrieval";
import { roleTypeById } from "~/data/role-taxonomy";

interface RoleReadinessInput {
  resume: ParsedResume;
  roleTypeId: string;
}
interface SinglePostingInput {
  resume: ParsedResume;
  jdText: string;
}

function assertResume(resume: unknown): ParsedResume {
  if (
    typeof resume !== "object" ||
    resume === null ||
    typeof (resume as { structured_text?: unknown }).structured_text !== "string" ||
    !(resume as { structured_text: string }).structured_text.trim()
  ) {
    throw new Error("A parsed resume with non-empty text is required.");
  }
  return { structured_text: (resume as { structured_text: string }).structured_text };
}

/** Splits pasted JD text into requirement-line excerpts for the model. */
function jdToPosting(jdText: string): SageJobPosting {
  const excerpts = jdText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return {
    id: "user-jd",
    role_type: "user-provided",
    source_url: "user-provided",
    captured_date: new Date().toISOString().slice(0, 10),
    requirement_excerpts: excerpts.length > 0 ? excerpts : [jdText.trim()],
  };
}

export const analyzeRoleReadinessFn = createServerFn({ method: "POST" })
  .validator((data: RoleReadinessInput) => {
    const resume = assertResume(data?.resume);
    const roleTypeId = String(data?.roleTypeId ?? "");
    if (!roleTypeById(roleTypeId)) throw new Error("Unknown target role type.");
    return { resume, roleTypeId };
  })
  .handler(async ({ data }): Promise<ReasoningRun> => {
    const postings = shortlistForRole(data.roleTypeId);
    if (postings.length === 0) throw new Error("No seeded postings for this role type.");
    return analyzeResumeAgainstPostings({ resume: data.resume, postings });
  });

export const analyzeSinglePostingFn = createServerFn({ method: "POST" })
  .validator((data: SinglePostingInput) => {
    const resume = assertResume(data?.resume);
    const jdText = String(data?.jdText ?? "");
    if (!jdText.trim()) throw new Error("Paste the job description to analyze.");
    return { resume, jdText };
  })
  .handler(async ({ data }): Promise<ReasoningRun> => {
    return analyzeResumeAgainstPostings({
      resume: data.resume,
      postings: [jdToPosting(data.jdText)],
    });
  });
