import { Link, createFileRoute } from "@tanstack/react-router";

import { EvidenceNote } from "~/components/evidence-note";
import { GapList } from "~/components/gap-list";
import { ScoreGauge } from "~/components/readiness-gauge";
import { VerificationNote } from "~/components/verification-note";
import { useSageSession } from "~/lib/session-store";

export const Route = createFileRoute("/analysis")({ component: AnalysisView });

function AnalysisView() {
  const { result } = useSageSession();

  if (!result || result.mode !== "single") {
    return <EmptyState />;
  }

  const { analysis } = result.run;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <Link to="/" className="eyebrow hover:text-ink">
          ← New analysis
        </Link>
        <h1 className="text-3xl font-semibold">Fit for a single posting</h1>
        <p className="text-muted">Reasoned against {result.contextLabel}.</p>
      </header>

      <section className="panel grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
        <ScoreGauge score={analysis.fit_score} caption="Fit for this posting" />
        <div className="flex flex-col gap-4">
          <p className="text-ink/90">{analysis.fit_reasoning}</p>
          <VerificationNote run={result.run} />
        </div>
      </section>

      <div className="grid gap-10 md:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Gaps</h2>
          <GapList gaps={analysis.gaps} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Strengths that match</h2>
          {analysis.strengths.length === 0 ? (
            <p className="text-sm text-muted">No resume-verified strengths surfaced.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {analysis.strengths.map((strength, index) => (
                <EvidenceNote
                  key={`${strength.skill}-${index}`}
                  skill={strength.skill}
                  evidence={strength.evidence_from_resume}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {analysis.buried_strengths.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Buried strengths to surface</h2>
            <p className="mt-1 text-sm text-muted">
              Real experience from your resume you can reframe to fit this posting.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.buried_strengths.map((buried, index) => (
              <EvidenceNote
                key={`${buried.skill}-${index}`}
                skill={buried.skill}
                evidence={buried.evidence_from_resume}
              >
                <span className="text-gold">Surface it: </span>
                {buried.how_to_surface_it}
              </EvidenceNote>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="panel flex flex-col items-start gap-3 p-8">
      <h1 className="text-xl font-semibold">Nothing to show yet</h1>
      <p className="text-muted">
        Analysis results live only in this session. Start a new analysis from the home screen.
      </p>
      <Link to="/" className="bg-gold px-4 py-2 text-sm font-medium text-bg hover:bg-gold-muted">
        Go to analysis
      </Link>
    </div>
  );
}
