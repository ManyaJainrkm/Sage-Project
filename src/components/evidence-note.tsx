/**
 * Renders a resume-grounded claim: a skill plus the VERBATIM resume text that
 * proves it. Every string shown here already passed evidence verification
 * (it is a real substring of the resume), so the quote is trustworthy.
 */
import type { ReactNode } from "react";

interface EvidenceNoteProps {
  skill: string;
  evidence: string;
  /** Optional trailing content, e.g. "how to surface it" guidance. */
  children?: ReactNode;
}

export function EvidenceNote({ skill, evidence, children }: EvidenceNoteProps) {
  return (
    <div className="panel p-4">
      <div className="flex items-start gap-2">
        <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-positive" />
        <div className="min-w-0">
          <div className="font-medium text-ink">{skill}</div>
          <blockquote className="mt-1 border-l-2 border-line pl-3 text-sm text-muted italic">
            “{evidence}”
          </blockquote>
          {children ? <div className="mt-2 text-sm text-ink/90">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
