/**
 * Sage's one server-only reasoning operation. Import it only from a TanStack
 * Start server function/API route; the browser receives results, never a key.
 */
import {
  type ParsedResume,
  type ReasoningRun,
  ReasoningValidationError,
  responseSchemaFor,
  salvageModelAnalysis,
  type SageJobPosting,
  validateModelAnalysis,
} from "./reasoning-schema";

/**
 * Product behavior lives here, separate from transport/schema mechanics so it
 * can be iterated on directly without altering verification safeguards.
 */
export const SAGE_REASONING_SYSTEM_PROMPT = `You are Sage, a precise career-development reasoning system.

Reason about the DELTA between a candidate's actual resume and one or more target-role postings. Do not score keyword overlap. Judge the real distance in scope, seniority, production exposure, and demonstrated responsibilities. For example, distinguish production-scale ownership from internship-scale work when the resume supports that conclusion.

Ground every claim about the candidate in supplied resume text only. Never infer, embellish, imply, or invent experience. For strengths[].evidence_from_resume and buried_strengths[].evidence_from_resume, copy evidence from the resume verbatim; never paraphrase it. If exact evidence does not support a strength, omit it.

fit_reasoning must be two or three concise sentences citing specific, actual resume items. Use the full fit-score range: about 20 means a fundamentally different domain or nearly every core requirement is missing; about 50 means the right domain but several core requirements or a large seniority gap are missing; about 75 means a solid match with one or two real gaps; about 90 means the candidate meets or exceeds essentially all requirements. Do not default to scores clustered in 60–85.

A gap is a missing or materially under-demonstrated role requirement, not merely an absent keyword. Use only the supplied severity enum. Buried strengths are genuine resume-supported experience that is under-emphasized for the role; explain how to surface it truthfully without rewriting history.

suggested_direction is a DIRECTION that builds the missing capability, never a complete project specification. Good: "Build something that forces you to handle streaming data under backpressure." Bad: "Build a Kafka pipeline with three consumers and a Postgres sink." Do not prescribe a tech stack, named components, architecture, step-by-step build, or a finished app concept.

For one posting, assess only that posting. The schema intentionally does not contain recurring_gaps, so make no recurrence claim.

For multiple postings from one role type: fit_score is overall readiness for that ROLE TYPE synthesized across the supplied shortlist, not an average of per-posting scores. strengths[] and gaps[] are the synthesis of what holds generally across that shortlist. recurring_gaps[] is the subset of gaps recurring across postings. For every recurring gap, return only stable posting_ids from the supplied shortlist that explicitly support it. Never emit recurrence counts. Only include a recurring gap when you can identify at least four supporting posting IDs.`;

export interface SageReasoningInput {
  resume: ParsedResume;
  postings: SageJobPosting[];
}

interface ResponsesPayload {
  output_text?: unknown;
  error?: { message?: unknown };
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5.6";

function getApiKey(): string {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const apiKey = globalWithProcess.process?.env?.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server.");
  return apiKey;
}

function buildModelInput({ resume, postings }: SageReasoningInput): string {
  return JSON.stringify({
    candidate_resume: { structured_text: resume.structured_text },
    target_postings: postings.map(({ id, role_type, requirement_excerpts }) => ({
      id,
      role_type,
      requirement_excerpts,
    })),
  }, null, 2);
}

function parseOutput(outputText: string): unknown {
  try {
    return JSON.parse(outputText) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error";
    throw new ReasoningValidationError([`response was not valid JSON: ${message}`]);
  }
}

async function callModel(input: SageReasoningInput, repairError?: string): Promise<unknown> {
  const isBatched = input.postings.length > 1;
  const modelInput = repairError
    ? `${buildModelInput(input)}\n\nYour prior response failed validation: ${repairError}\nReturn a corrected response matching the schema. Do not discuss the error.`
    : buildModelInput(input);
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: SAGE_REASONING_SYSTEM_PROMPT,
      input: modelInput,
      reasoning: { effort: "medium" },
      text: {
        format: {
          type: "json_schema",
          name: isBatched ? "sage_batched_role_readiness" : "sage_single_posting_analysis",
          strict: true,
          schema: responseSchemaFor(input.postings.length),
        },
      },
    }),
  });
  const payload = await response.json() as ResponsesPayload;
  if (!response.ok) {
    const message = typeof payload.error?.message === "string"
      ? payload.error.message
      : `OpenAI Responses API failed with status ${String(response.status)}.`;
    throw new Error(message);
  }
  if (typeof payload.output_text !== "string")
    throw new ReasoningValidationError(["Responses API returned no output_text"]);
  return parseOutput(payload.output_text);
}

/**
 * Both Sage entry points use this operation:
 * - pasted JD: one posting, structurally unable to claim recurrence;
 * - chosen role type: filter locally, then make one batched readiness call.
 *
 * A malformed/invalid model result gets one repair request that includes its
 * parse/validation error. A second failure returns only verified valid fields.
 */
export async function analyzeResumeAgainstPostings(input: SageReasoningInput): Promise<ReasoningRun> {
  let firstRaw: unknown = {};
  let firstIssue: ReasoningValidationError;
  try {
    firstRaw = await callModel(input);
    return validateModelAnalysis(firstRaw, input.resume, input.postings);
  } catch (error) {
    if (!(error instanceof ReasoningValidationError)) throw error;
    firstIssue = error;
  }
  try {
    const repairedRaw = await callModel(input, firstIssue.message);
    return validateModelAnalysis(repairedRaw, input.resume, input.postings);
  } catch (error) {
    return salvageModelAnalysis(firstRaw, input.resume, input.postings, "degraded", [
      "Sage could not fully validate the model response after one repair attempt.",
      error instanceof Error ? error.message : "Unknown repair failure",
    ]);
  }
}
