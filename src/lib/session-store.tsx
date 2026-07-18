/**
 * In-memory session state for the current visit. Nothing here is persisted:
 * no localStorage, no cookies, no server storage. Resume text and analysis
 * results live only in React state and vanish on refresh — which is exactly
 * the "analyzed in-session, never stored" promise the UI makes.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { AnalysisMode, ParsedResume, ReasoningRun } from "~/types/sage";

export interface ResumeMeta {
  /** Human label for the source, e.g. "alex-chen-resume.pdf" or "Pasted text". */
  label: string;
}

export interface AnalysisResult {
  run: ReasoningRun;
  mode: AnalysisMode;
  /** What was analyzed, e.g. a role-type label or "your pasted job description". */
  contextLabel: string;
}

interface SageSession {
  resume: ParsedResume | null;
  resumeMeta: ResumeMeta | null;
  setResume: (resume: ParsedResume, meta: ResumeMeta) => void;
  clearResume: () => void;

  result: AnalysisResult | null;
  setResult: (result: AnalysisResult) => void;
  clearResult: () => void;
}

const SageSessionContext = createContext<SageSession | null>(null);

export function SageSessionProvider({ children }: { children: ReactNode }) {
  const [resume, setResumeState] = useState<ParsedResume | null>(null);
  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(null);
  const [result, setResultState] = useState<AnalysisResult | null>(null);

  const value = useMemo<SageSession>(
    () => ({
      resume,
      resumeMeta,
      setResume: (nextResume, meta) => {
        setResumeState(nextResume);
        setResumeMeta(meta);
      },
      clearResume: () => {
        setResumeState(null);
        setResumeMeta(null);
        setResultState(null);
      },
      result,
      setResult: setResultState,
      clearResult: () => setResultState(null),
    }),
    [resume, resumeMeta, result],
  );

  return <SageSessionContext.Provider value={value}>{children}</SageSessionContext.Provider>;
}

export function useSageSession(): SageSession {
  const context = useContext(SageSessionContext);
  if (!context) throw new Error("useSageSession must be used within SageSessionProvider.");
  return context;
}
