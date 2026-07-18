import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { UploadPanel } from "~/components/upload-panel";
import { ROLE_TYPES, roleTypeById } from "~/data/role-taxonomy";
import { postingCountForRole } from "~/lib/job-retrieval";
import { useSageSession } from "~/lib/session-store";
import { analyzeRoleReadinessFn, analyzeSinglePostingFn } from "~/server/reasoning";

export const Route = createFileRoute("/")({ component: SageHome });

function SageHome() {
  const navigate = useNavigate();
  const { resume, setResult } = useSageSession();
  const [roleTypeId, setRoleTypeId] = useState<string>(ROLE_TYPES[0].id);
  const [jdText, setJdText] = useState("");
  const [pending, setPending] = useState<null | "readiness" | "single">(null);
  const [error, setError] = useState<string | null>(null);

  const busy = pending !== null;

  async function runReadiness() {
    if (!resume) return;
    setPending("readiness");
    setError(null);
    try {
      const run = await analyzeRoleReadinessFn({ data: { resume, roleTypeId } });
      const role = roleTypeById(roleTypeId);
      setResult({ run, mode: "readiness", contextLabel: role?.label ?? roleTypeId });
      void navigate({ to: "/readiness" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Try again.");
      setPending(null);
    }
  }

  async function runSingle() {
    if (!resume || !jdText.trim()) return;
    setPending("single");
    setError(null);
    try {
      const run = await analyzeSinglePostingFn({ data: { resume, jdText } });
      setResult({ run, mode: "single", contextLabel: "your pasted job description" });
      void navigate({ to: "/analysis" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Try again.");
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="max-w-2xl">
        <p className="eyebrow">Career-readiness, reasoned</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">
          Bridge the gap between your skills and the role you want.
        </h1>
        <p className="mt-4 text-muted">
          Sage doesn&apos;t match keywords. It reasons about the real distance between your
          experience and a target role, aggregates the skills that recur across many postings, and
          points you toward what to build to close them.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">1 · Your resume</h2>
          <span className="text-[0.72rem] text-muted">Read in-browser · never stored</span>
        </div>
        <UploadPanel />
      </section>

      <section
        className={`grid gap-6 md:grid-cols-2 ${resume ? "" : "pointer-events-none opacity-45"}`}
      >
        {/* Flow B: readiness across a role type — the centerpiece */}
        <div className="panel flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">2 · Target a role type</h2>
            <p className="mt-1 text-sm text-muted">
              Sage reasons across a shortlist of postings and surfaces the gaps that recur.
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Role type</span>
            <select
              value={roleTypeId}
              onChange={(event) => setRoleTypeId(event.target.value)}
              className="panel bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-gold-muted"
            >
              {ROLE_TYPES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[0.72rem] text-muted">
            {roleTypeById(roleTypeId)?.blurb} · {postingCountForRole(roleTypeId)} seeded postings
          </p>
          <button
            type="button"
            disabled={!resume || busy}
            onClick={() => void runReadiness()}
            className="mt-auto bg-gold px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "readiness" ? "Reasoning across postings…" : "Show my readiness"}
          </button>
        </div>

        {/* Flow A: single pasted JD */}
        <div className="panel flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">Or · Paste one job description</h2>
            <p className="mt-1 text-sm text-muted">
              Analyze fit and gaps against a single posting you paste in.
            </p>
          </div>
          <textarea
            value={jdText}
            onChange={(event) => setJdText(event.target.value)}
            rows={5}
            placeholder="Paste a job description…"
            className="panel w-full resize-y bg-bg p-3 text-sm text-ink outline-none placeholder:text-muted focus:border-gold-muted"
          />
          <button
            type="button"
            disabled={!resume || busy || !jdText.trim()}
            onClick={() => void runSingle()}
            className="mt-auto border border-gold px-4 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "single" ? "Reasoning…" : "Analyze this posting"}
          </button>
        </div>
      </section>

      {!resume && (
        <p className="-mt-6 text-sm text-muted">Add your resume above to unlock analysis.</p>
      )}
      {error && <p className="text-sm text-[var(--color-critical)]">{error}</p>}
    </div>
  );
}
