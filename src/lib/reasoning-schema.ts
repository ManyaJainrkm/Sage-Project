/** Strict, verified contract for Sage's single reasoning operation. */

/**
 * A recurring gap must be supported by at least this many VERIFIED posting ids
 * (validated against the shortlist in code, never counted by the model).
 */
export const RECURRENCE_THRESHOLD = 4;

export const GAP_SEVERITIES = ["blocking", "significant", "minor"] as const;
export type GapSeverity = (typeof GAP_SEVERITIES)[number];

/** Extracted, sectioned, whitespace-normalized resume text—never rewritten. */
export interface ParsedResume { structured_text: string; }

/** Local-only seed record containing requirement excerpts, never a full posting. */
export interface SageJobPosting {
  id: string;
  role_type: string;
  source_url: string;
  captured_date: string;
  requirement_excerpts: string[];
}

export interface ResumeStrength { skill: string; evidence_from_resume: string; }
export interface RoleGap {
  skill: string;
  why_it_matters_for_this_role: string;
  severity: GapSeverity;
}
export interface BuriedStrength extends ResumeStrength { how_to_surface_it: string; }

/** Model-facing recurrence: the model returns IDs, never a trusted count. */
export interface RecurringGapCandidate {
  skill: string;
  posting_ids: string[];
  suggested_direction: string;
}
/** UI-facing recurrence: counts are derived after ID verification. */
export interface VerifiedRecurringGap extends RecurringGapCandidate {
  postings_mentioning: number;
  postings_total: number;
}

export interface SinglePostingAnalysis {
  fit_score: number;
  fit_reasoning: string;
  strengths: ResumeStrength[];
  gaps: RoleGap[];
  buried_strengths: BuriedStrength[];
}
export interface BatchedPostingAnalysis extends SinglePostingAnalysis {
  recurring_gaps: VerifiedRecurringGap[];
}
export type SageAnalysis = SinglePostingAnalysis | BatchedPostingAnalysis;

export interface EvidenceVerificationLogEntry {
  kind: "strength" | "buried_strength";
  skill: string;
  evidence_from_resume: string;
  normalized_evidence: string;
  reason: "not_found_in_resume";
}
export interface RecurrenceVerificationLogEntry {
  skill: string;
  rejected_posting_ids: string[];
  verified_posting_ids: string[];
  reason: "invalid_posting_ids_removed" | "below_verified_threshold";
}
/**
 * A claim collapsed because it cited evidence already used by another claim.
 * This is a presentation concern, NOT a verification failure: the evidence was
 * genuine and verified. Deliberately kept out of the status calculation so a
 * duplicate never marks a run "degraded".
 */
export interface DuplicateEvidenceLogEntry {
  kind: "strength" | "buried_strength";
  /** The claim that was dropped. */
  skill: string;
  /** The claim that retained this evidence. */
  kept_skill: string;
  evidence_from_resume: string;
}
export interface ReasoningValidation {
  evidence: EvidenceVerificationLogEntry[];
  recurrence: RecurrenceVerificationLogEntry[];
  duplicates: DuplicateEvidenceLogEntry[];
}
export interface ReasoningRun<T extends SageAnalysis = SageAnalysis> {
  analysis: T;
  validation: ReasoningValidation;
  status: "complete" | "degraded";
  warnings: string[];
}
export class ReasoningValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("; "));
    this.name = "ReasoningValidationError";
  }
}

type JsonSchema = Record<string, unknown>;
const text: JsonSchema = { type: "string", minLength: 1 };
const strengthSchema: JsonSchema = {
  type: "object", additionalProperties: false,
  required: ["skill", "evidence_from_resume"],
  properties: { skill: text, evidence_from_resume: text },
};
const gapSchema: JsonSchema = {
  type: "object", additionalProperties: false,
  required: ["skill", "why_it_matters_for_this_role", "severity"],
  properties: {
    skill: text,
    why_it_matters_for_this_role: text,
    severity: { type: "string", enum: GAP_SEVERITIES },
  },
};
const buriedStrengthSchema: JsonSchema = {
  type: "object", additionalProperties: false,
  required: ["skill", "evidence_from_resume", "how_to_surface_it"],
  properties: { skill: text, evidence_from_resume: text, how_to_surface_it: text },
};
const recurringGapSchema: JsonSchema = {
  type: "object", additionalProperties: false,
  required: ["skill", "posting_ids", "suggested_direction"],
  properties: {
    skill: text,
    posting_ids: { type: "array", items: text },
    suggested_direction: text,
  },
};
const commonProperties: Record<string, JsonSchema> = {
  fit_score: { type: "integer", minimum: 0, maximum: 100 },
  fit_reasoning: text,
  strengths: { type: "array", items: strengthSchema },
  gaps: { type: "array", items: gapSchema },
  buried_strengths: { type: "array", items: buriedStrengthSchema },
};

/** N=1 output has no recurring_gaps field, so a recurrence claim cannot fit. */
export const SINGLE_POSTING_RESPONSE_SCHEMA: JsonSchema = {
  type: "object", additionalProperties: false,
  required: Object.keys(commonProperties), properties: commonProperties,
};
/** N>1 output is the only schema that admits a recurrence claim. */
export const BATCHED_ROLE_RESPONSE_SCHEMA: JsonSchema = {
  type: "object", additionalProperties: false,
  required: [...Object.keys(commonProperties), "recurring_gaps"],
  properties: { ...commonProperties, recurring_gaps: { type: "array", items: recurringGapSchema } },
};
export function responseSchemaFor(postingCount: number): JsonSchema {
  return postingCount === 1 ? SINGLE_POSTING_RESPONSE_SCHEMA : BATCHED_ROLE_RESPONSE_SCHEMA;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
function isStrength(value: unknown): value is ResumeStrength {
  return isRecord(value) && exactKeys(value, ["skill", "evidence_from_resume"]) &&
    isText(value.skill) && isText(value.evidence_from_resume);
}
function isGap(value: unknown): value is RoleGap {
  return isRecord(value) && exactKeys(value, ["skill", "why_it_matters_for_this_role", "severity"]) &&
    isText(value.skill) && isText(value.why_it_matters_for_this_role) &&
    typeof value.severity === "string" && GAP_SEVERITIES.includes(value.severity as GapSeverity);
}
function isBuriedStrength(value: unknown): value is BuriedStrength {
  return isRecord(value) && exactKeys(value, ["skill", "evidence_from_resume", "how_to_surface_it"]) &&
    isText(value.skill) && isText(value.evidence_from_resume) && isText(value.how_to_surface_it);
}
function isRecurringGap(value: unknown): value is RecurringGapCandidate {
  return isRecord(value) && exactKeys(value, ["skill", "posting_ids", "suggested_direction"]) &&
    isText(value.skill) && Array.isArray(value.posting_ids) && value.posting_ids.every(isText) &&
    isText(value.suggested_direction);
}

function modelIssues(raw: unknown, batched: boolean): string[] {
  if (!isRecord(raw)) return ["response must be a JSON object"];
  const expected = batched ? [...Object.keys(commonProperties), "recurring_gaps"] : Object.keys(commonProperties);
  const issues: string[] = [];
  if (!exactKeys(raw, expected)) issues.push("response has an unexpected shape");
  if (!Number.isInteger(raw.fit_score) || (raw.fit_score as number) < 0 || (raw.fit_score as number) > 100)
    issues.push("fit_score must be an integer from 0 to 100");
  if (!isText(raw.fit_reasoning)) issues.push("fit_reasoning must be a non-empty string");
  if (!Array.isArray(raw.strengths) || !raw.strengths.every(isStrength)) issues.push("strengths contains an invalid item");
  if (!Array.isArray(raw.gaps) || !raw.gaps.every(isGap)) issues.push("gaps contains an invalid item");
  if (!Array.isArray(raw.buried_strengths) || !raw.buried_strengths.every(isBuriedStrength)) issues.push("buried_strengths contains an invalid item");
  if (batched && (!Array.isArray(raw.recurring_gaps) || !raw.recurring_gaps.every(isRecurringGap)))
    issues.push("recurring_gaps contains an invalid item");
  return issues;
}

const REPLACEMENTS: Record<string, string> = {
  "\u00a0": " ", "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'",
  "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u201f": '"',
  "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2013": "-", "\u2014": "-", "\u2212": "-",
};
interface NormalizedText { value: string; spans: Array<{ start: number; end: number }>; }

/** Normalizes comparison text and maps each normalized character to its source range. */
function normalizedWithSourceMap(input: string): NormalizedText {
  const output: string[] = [];
  const spans: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < input.length;) {
    const point = input.codePointAt(start);
    if (point === undefined) break;
    const original = String.fromCodePoint(point);
    const end = start + original.length;
    const replacement = REPLACEMENTS[original] ?? original;
    if (/\s/u.test(replacement)) {
      const previous = output.length - 1;
      if (output[previous] === " ") spans[previous] = { start: spans[previous].start, end };
      else { output.push(" "); spans.push({ start, end }); }
    } else {
      for (const character of replacement.normalize("NFKC").toLowerCase()) {
        output.push(character); spans.push({ start, end });
      }
    }
    start = end;
  }
  while (output[0] === " ") { output.shift(); spans.shift(); }
  while (output.at(-1) === " ") { output.pop(); spans.pop(); }
  return { value: output.join(""), spans };
}
export function normalizeForEvidenceMatch(input: string): string {
  return normalizedWithSourceMap(input).value;
}
/** Confirms normalized evidence, then returns the exact original resume substring. */
export function resolveResumeEvidence(resumeText: string, modelEvidence: string): string | null {
  const resume = normalizedWithSourceMap(resumeText);
  const evidence = normalizedWithSourceMap(modelEvidence).value;
  const index = evidence ? resume.value.indexOf(evidence) : -1;
  if (index < 0) return null;
  const start = resume.spans[index]?.start;
  const end = resume.spans[index + evidence.length - 1]?.end;
  return start === undefined || end === undefined ? null : resumeText.slice(start, end);
}

function validateInputs(resume: ParsedResume, shortlist: readonly SageJobPosting[]): void {
  if (!resume.structured_text.trim()) throw new Error("Resume text is required.");
  if (!shortlist.length) throw new Error("At least one posting is required.");
  const ids = shortlist.map(({ id }) => id);
  if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length)
    throw new Error("Shortlist postings require unique, non-empty stable ids.");
}
function emptyValidation(): ReasoningValidation { return { evidence: [], recurrence: [], duplicates: [] }; }
function logEvidenceFailure(entry: EvidenceVerificationLogEntry): void {
  // No resume content is written to logs.
  console.warn("[sage:evidence-verification]", entry);
}
/**
 * Collapses claims that resolve to the same resume evidence. The model
 * sometimes emits two differently-labeled strengths quoting one sentence,
 * which reads as padding. Keyed on the NORMALIZED resolved evidence, so
 * citations differing only in whitespace or punctuation collapse together.
 *
 * Exact-match only, deliberately: substring matching would risk discarding a
 * genuinely distinct strength whose quote happens to overlap another.
 * The first claim wins, preserving the model's own ordering.
 */
function claimDeduper(kind: "strength" | "buried_strength", validation: ReasoningValidation) {
  const seen = new Map<string, string>();
  return (skill: string, evidence: string): boolean => {
    const key = normalizeForEvidenceMatch(evidence);
    const keptSkill = seen.get(key);
    if (keptSkill !== undefined) {
      validation.duplicates.push({ kind, skill, kept_skill: keptSkill, evidence_from_resume: evidence });
      return false;
    }
    seen.set(key, skill);
    return true;
  };
}

function verifyStrengths(values: unknown, resume: string, validation: ReasoningValidation): ResumeStrength[] {
  if (!Array.isArray(values)) return [];
  const output: ResumeStrength[] = [];
  const isFirstUse = claimDeduper("strength", validation);
  for (const item of values) {
    if (!isStrength(item)) continue;
    const evidence = resolveResumeEvidence(resume, item.evidence_from_resume);
    if (evidence) {
      if (isFirstUse(item.skill, evidence)) {
        output.push({ skill: item.skill, evidence_from_resume: evidence });
      }
    } else {
      const entry: EvidenceVerificationLogEntry = {
        kind: "strength", skill: item.skill, evidence_from_resume: item.evidence_from_resume,
        normalized_evidence: normalizeForEvidenceMatch(item.evidence_from_resume), reason: "not_found_in_resume",
      };
      validation.evidence.push(entry); logEvidenceFailure(entry);
    }
  }
  return output;
}
function verifyBuriedStrengths(values: unknown, resume: string, validation: ReasoningValidation): BuriedStrength[] {
  if (!Array.isArray(values)) return [];
  const output: BuriedStrength[] = [];
  const isFirstUse = claimDeduper("buried_strength", validation);
  for (const item of values) {
    if (!isBuriedStrength(item)) continue;
    const evidence = resolveResumeEvidence(resume, item.evidence_from_resume);
    if (evidence) {
      if (isFirstUse(item.skill, evidence)) {
        output.push({ skill: item.skill, evidence_from_resume: evidence, how_to_surface_it: item.how_to_surface_it });
      }
    } else {
      const entry: EvidenceVerificationLogEntry = {
        kind: "buried_strength", skill: item.skill, evidence_from_resume: item.evidence_from_resume,
        normalized_evidence: normalizeForEvidenceMatch(item.evidence_from_resume), reason: "not_found_in_resume",
      };
      validation.evidence.push(entry); logEvidenceFailure(entry);
    }
  }
  return output;
}
function verifyRecurringGaps(values: unknown, shortlist: readonly SageJobPosting[], validation: ReasoningValidation): VerifiedRecurringGap[] {
  if (!Array.isArray(values)) return [];
  const validIds = new Set(shortlist.map(({ id }) => id));
  const output: VerifiedRecurringGap[] = [];
  for (const item of values) {
    if (!isRecurringGap(item)) continue;
    const posting_ids = [...new Set(item.posting_ids.filter((id) => validIds.has(id)))];
    const rejected_posting_ids = item.posting_ids.filter((id) => !validIds.has(id));
    if (rejected_posting_ids.length) validation.recurrence.push({ skill: item.skill, rejected_posting_ids, verified_posting_ids: posting_ids, reason: "invalid_posting_ids_removed" });
    // The product threshold is evaluated only after code verifies stable IDs.
    if (posting_ids.length < RECURRENCE_THRESHOLD) {
      validation.recurrence.push({ skill: item.skill, rejected_posting_ids, verified_posting_ids: posting_ids, reason: "below_verified_threshold" });
      continue;
    }
    output.push({ ...item, posting_ids, postings_mentioning: posting_ids.length, postings_total: shortlist.length });
  }
  return output;
}

/** Use this for the first model response; a failure triggers exactly one repair call. */
export function validateModelAnalysis(raw: unknown, resume: ParsedResume, shortlist: readonly SageJobPosting[]): ReasoningRun {
  validateInputs(resume, shortlist);
  const issues = modelIssues(raw, shortlist.length > 1);
  if (issues.length) throw new ReasoningValidationError(issues);
  return salvageModelAnalysis(raw, resume, shortlist, "complete");
}
/** Graceful fallback after the repair call: retain only independently valid data. */
export function salvageModelAnalysis(
  raw: unknown, resume: ParsedResume, shortlist: readonly SageJobPosting[],
  status: "complete" | "degraded" = "degraded", warnings: string[] = [],
): ReasoningRun {
  validateInputs(resume, shortlist);
  const value = isRecord(raw) ? raw : {};
  const validation = emptyValidation();
  const common: SinglePostingAnalysis = {
    fit_score: Number.isInteger(value.fit_score) && (value.fit_score as number) >= 0 && (value.fit_score as number) <= 100 ? value.fit_score as number : 0,
    fit_reasoning: typeof value.fit_reasoning === "string" ? value.fit_reasoning : "",
    strengths: verifyStrengths(value.strengths, resume.structured_text, validation),
    gaps: Array.isArray(value.gaps) ? value.gaps.filter(isGap) : [],
    buried_strengths: verifyBuriedStrengths(value.buried_strengths, resume.structured_text, validation),
  };
  const analysis: SageAnalysis = shortlist.length === 1 ? common : {
    ...common, recurring_gaps: verifyRecurringGaps(value.recurring_gaps, shortlist, validation),
  };
  const surfacedWarnings = [...warnings];
  if (validation.evidence.length > 0)
    surfacedWarnings.push(`${String(validation.evidence.length)} resume evidence claim(s) failed verification and were removed.`);
  if (validation.recurrence.length > 0)
    surfacedWarnings.push(`${String(validation.recurrence.length)} recurrence claim(s) required verification adjustments.`);
  const surfacedStatus = status === "complete" && (validation.evidence.length > 0 || validation.recurrence.length > 0)
    ? "degraded"
    : status;
  return { analysis, validation, status: surfacedStatus, warnings: surfacedWarnings };
}
