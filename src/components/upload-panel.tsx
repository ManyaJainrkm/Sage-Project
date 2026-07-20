/**
 * Resume capture: upload a PDF/DOCX/TXT or paste text. Extraction runs in the
 * browser; scanned PDFs and unsupported files fall back to the paste box with
 * a clear message. Wording is preserved verbatim through to the parsed resume.
 */
import { useRef, useState } from "react";

import {
  ScannedResumeError,
  UnsupportedResumeFileError,
  extractResumeFile,
} from "~/lib/resume-extraction";
import { buildParsedResume } from "~/lib/resume-profile";
import { useSageSession } from "~/lib/session-store";

export function UploadPanel() {
  const { resume, resumeMeta, setResume, clearResume } = useSageSession();
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const { raw_text } = await extractResumeFile(file);
      const parsed = buildParsedResume(raw_text);
      if (!parsed.structured_text.trim()) {
        throw new Error("No text could be read from that file.");
      }
      setResume(parsed, { label: file.name });
      setShowPaste(false);
    } catch (err) {
      if (err instanceof ScannedResumeError || err instanceof UnsupportedResumeFileError) {
        setError(err.message);
        setShowPaste(true);
      } else {
        setError(err instanceof Error ? err.message : "Could not read that file.");
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handlePasteSubmit() {
    const parsed = buildParsedResume(paste);
    if (!parsed.structured_text.trim()) {
      setError("Paste your resume text first.");
      return;
    }
    setError(null);
    setResume(parsed, { label: "Pasted resume text" });
  }

  if (resume && resumeMeta) {
    return (
      <div className="panel flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-positive" />
          <span className="text-ink">Resume loaded</span>
          <span className="text-muted">· {resumeMeta.label}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            clearResume();
            setPaste("");
            setShowPaste(false);
          }}
          className="text-[0.72rem] text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Replace
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label
        className={`panel flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed px-6 py-10 text-center transition-colors hover:border-gold-muted ${
          busy ? "opacity-60" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,text/plain,application/pdf"
          className="hidden"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <span className="text-sm text-ink">
          {busy ? "Reading resume…" : "Upload your resume"}
        </span>
        <span className="text-[0.72rem] text-muted">PDF, DOCX, or TXT · read in your browser</span>
      </label>

      <button
        type="button"
        onClick={() => setShowPaste((value) => !value)}
        className="self-start text-[0.72rem] text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        {showPaste ? "Hide paste box" : "…or paste resume text instead"}
      </button>

      {showPaste && (
        <div className="flex flex-col gap-2">
          <textarea
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            rows={8}
            placeholder="Paste your resume text here. Your exact wording is preserved."
            className="panel w-full resize-y bg-bg p-3 text-sm text-ink outline-none placeholder:text-muted focus:border-gold-muted"
          />
          <button
            type="button"
            onClick={handlePasteSubmit}
            className="self-start bg-gold px-4 py-2 text-sm font-medium text-bg hover:bg-gold-muted"
          >
            Use this text
          </button>
        </div>
      )}

      {error && <p className="text-sm text-[var(--color-critical)]">{error}</p>}
    </div>
  );
}
