/**
 * Turns raw extracted resume text into the ParsedResume the reasoning call
 * consumes. "Structuring" here means ONLY whitespace normalization and light
 * clean-up of extraction artifacts. It never rephrases, summarizes, reorders,
 * or rewords anything.
 *
 * Why so conservative: strengths and buried_strengths are verified by matching
 * the model's evidence_from_resume as a substring of this text. If structuring
 * altered the wording, every citation would false-negative and the entire
 * verification system would break at step one. The safest structured_text is
 * the one whose words are identical to the resume.
 */
import type { ParsedResume } from "~/lib/reasoning-schema";

/**
 * Normalizes whitespace while preserving every non-whitespace character:
 * - collapses runs of spaces/tabs within a line to a single space
 * - trims each line
 * - collapses 3+ consecutive blank lines to a single blank line
 * - trims leading/trailing blank lines
 *
 * Line breaks between bullets are preserved where the extractor kept them;
 * no words are added, removed, or changed.
 */
export function normalizeResumeWhitespace(rawText: string): string {
  const lines = rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim());

  const collapsed: string[] = [];
  let blankRun = 0;
  for (const line of lines) {
    if (line === "") {
      blankRun += 1;
      if (blankRun <= 1) collapsed.push("");
    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }

  return collapsed.join("\n").trim();
}

export function buildParsedResume(rawText: string): ParsedResume {
  return { structured_text: normalizeResumeWhitespace(rawText) };
}
