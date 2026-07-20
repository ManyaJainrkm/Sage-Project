/**
 * Client-side resume extraction: file bytes -> raw text. Runs entirely in the
 * browser; the resume never touches disk on a server and is never persisted.
 *
 * CRITICAL: extraction preserves the resume's original wording. It only pulls
 * text out of the container format. Section reorganization and whitespace
 * normalization happen in resume-profile.ts, and even there the words are
 * never rewritten — verbatim evidence matching depends on the resume text
 * surviving unchanged.
 *
 * Scanned/image-only PDFs are detected (no extractable text layer) and
 * rejected with a clear message so the caller can offer a paste-as-text
 * fallback. No OCR.
 */
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { extractRawText } from "mammoth/mammoth.browser.js";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** Thrown when a file type we cannot read is supplied. */
export class UnsupportedResumeFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedResumeFileError";
  }
}

/** Thrown for image-only PDFs that carry no extractable text layer. */
export class ScannedResumeError extends Error {
  constructor() {
    super(
      "This PDF looks scanned or image-only, so Sage can't read text from it. " +
        "Paste your resume text instead.",
    );
    this.name = "ScannedResumeError";
  }
}

export type ResumeSourceKind = "pdf" | "docx" | "txt";

export interface ExtractedResume {
  /** Raw extracted text, wording untouched. */
  raw_text: string;
  kind: ResumeSourceKind;
}

const PDF_EXT = /\.pdf$/i;
const DOCX_EXT = /\.docx$/i;
const TXT_EXT = /\.(txt|md|text)$/i;

// Below this ratio of characters-to-pages a PDF almost certainly has no real
// text layer (i.e. it is a scan). Kept conservative to avoid false rejects.
const MIN_CHARS_PER_PAGE = 24;
const MIN_TOTAL_CHARS = 40;

async function extractPdf(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(pageText);
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  const text = pages.join("\n\n");
  const stripped = text.replace(/\s+/g, "");
  if (
    stripped.length < MIN_TOTAL_CHARS ||
    stripped.length < doc.numPages * MIN_CHARS_PER_PAGE
  ) {
    throw new ScannedResumeError();
  }
  return text;
}

async function extractDocx(file: File): Promise<string> {
  const { value } = await extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

function classify(file: File): ResumeSourceKind {
  if (PDF_EXT.test(file.name) || file.type === "application/pdf") return "pdf";
  if (
    DOCX_EXT.test(file.name) ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (TXT_EXT.test(file.name) || file.type.startsWith("text/")) return "txt";
  throw new UnsupportedResumeFileError(
    "Unsupported file. Upload a PDF, DOCX, or TXT, or paste your resume text.",
  );
}

export async function extractResumeFile(file: File): Promise<ExtractedResume> {
  const kind = classify(file);
  if (kind === "pdf") return { raw_text: await extractPdf(file), kind };
  if (kind === "docx") return { raw_text: await extractDocx(file), kind };
  return { raw_text: await file.text(), kind };
}
