/**
 * UI-facing Sage types. The reasoning contract itself lives in
 * ~/lib/reasoning-schema; this module re-exports what the UI needs and adds
 * the display-only shapes (stored postings carry title/company for rendering,
 * which are never sent to the model).
 */

export type {
  ParsedResume,
  SageJobPosting,
  ResumeStrength,
  RoleGap,
  BuriedStrength,
  VerifiedRecurringGap,
  SinglePostingAnalysis,
  BatchedPostingAnalysis,
  SageAnalysis,
  ReasoningRun,
  ReasoningValidation,
  GapSeverity,
} from "~/lib/reasoning-schema";

/**
 * A posting as stored on disk. Extends the model-facing fields with
 * display-only metadata. Only the model-facing subset is sent for reasoning.
 */
export interface StoredPosting {
  id: string;
  role_type: string;
  title: string;
  company_archetype: string;
  source_url: string;
  captured_date: string;
  requirement_excerpts: string[];
}

/** Which of Sage's two entry points produced the current analysis. */
export type AnalysisMode = "single" | "readiness";
