# Sage

**Bridge the gap between your skills and the role you want.**

Sage is not a tool to apply to jobs faster. It's a career-development tool. You
upload your resume and pick a target role type; Sage uses **GPT-5.6** to reason
about the real distance between your experience and that role, aggregates the
skill gaps that recur across many postings, and points you toward a *direction*
to build — never a copy-paste project spec.

> Instead of matching keywords like every other job tool, Sage reasons about the
> real distance between your experience and a target role, then shows the skills
> that keep coming up across dozens of postings that you're missing.

---

## Why GPT-5.6

The crowded approach to job tools is **similarity matching** — embeddings that
retrieve and rank postings numerically close to a resume. That cannot reason
about *distance*: that the role wants production-scale ownership while the
candidate has internship-scale work. Sage replaces similarity matching with
**reasoning-based gap analysis**, which is precisely what embeddings can't do
and what makes this a GPT-5.6 product rather than a search index.

**Architecture principle:** a cheap retrieval/filter layer narrows a seeded
dataset to a role-type shortlist; GPT-5.6 reasons over that shortlist. The whole
dataset never goes through the model.

**Core insight:** gap analysis, fit scoring, cross-posting readiness, and
project-direction suggestions are all the *same operation* — read a candidate
profile plus one or more postings and reason about the delta. Sage is **one
well-designed reasoning call** whose structured JSON output is rendered several
ways, not five separate engines.

## Two flows, one engine

- **Readiness (the centerpiece)** — pick a role type → filter the seeded dataset
  → one *batched* call across the shortlist → a readiness score plus the gaps
  that recur across postings, each with a direction to build.
- **Single posting** — paste any job description → one *single-posting* call →
  fit score, gaps, strengths, and buried strengths.

The two use **structurally different schemas**: the single-posting schema omits
`recurring_gaps` entirely, so an N=1 analysis is physically incapable of making
a recurrence claim.

## Verification, not trust

The model's output is never taken on faith:

- **Evidence is verified verbatim.** Every strength and buried strength must cite
  a substring that actually appears in the resume. Matching normalizes whitespace,
  smart quotes/dashes, and case first (PDF extraction mangles all of these), then
  confirms the citation and returns the *original* resume text. Unverifiable
  citations are dropped and logged — so hallucination is distinguishable from an
  extraction artifact.
- **Recurrence is counted in code, not by the model.** For each recurring gap the
  model returns the `posting_ids` that support it. Sage validates every id against
  the shortlist, drops invalid ones, and derives the count. The ≥4 threshold is
  applied to that verified count.
- When either safeguard fires, the run is marked `degraded` and the UI says so —
  the results shown are the survivors.

## Honesty constraints

- Sage only references experience present in the resume; it never invents,
  embellishes, or implies experience the candidate doesn't have.
- Project suggestions are **directions** ("build something that forces you to
  handle streaming data under backpressure"), never full specs.
- Resumes are analyzed **in-session only** — read in the browser, held in memory,
  never persisted. Every model call is server-side; the API key never reaches the
  client.

## Running it

```bash
npm install
OPENAI_API_KEY=sk-... npm run dev      # http://localhost:3000
```

The model call runs in a TanStack Start server function, so `OPENAI_API_KEY`
must be set in the **server** environment (a shell env var or `.env`). Without it
the UI loads and analysis returns a clear "not configured" error.

### De-risking the live API

```bash
OPENAI_API_KEY=sk-... npm run smoke:reasoning
```

Makes exactly one real call through `analyzeResumeAgainstPostings()` and reports
the raw `fit_score`, whether the JSON validated, and what evidence verification
kept or dropped. Confirms the model string, request shape
(`text.format.json_schema` with `strict`, plus `reasoning.effort`), and that
`output_text` is where the content lands.

### Other scripts

```bash
npm run typecheck   # strict tsc, no emit
npm run build       # client + SSR build
```

## Layout

```
src/
  routes/          __root, index (upload + pick), readiness, analysis
  components/       app-shell, upload-panel, readiness-gauge, gap-list,
                    project-directions, evidence-note, verification-note
  lib/              resume-extraction, resume-profile, job-retrieval,
                    sage-reasoning (the one call), reasoning-schema (contract +
                    verification), severity, session-store
  server/           reasoning (server functions; key + dataset stay here)
  data/             job-postings.json (seeded), role-taxonomy
  types/            sage, mammoth-browser
scripts/            smoke-reasoning (throwaway live-API check)
```

## Dataset

`src/data/job-postings.json` is a **curated, representative sample** of postings
(3 role types × 6) compiled for the demo — not scraped live, no job-board APIs.
Within each role type the core requirements deliberately recur so the readiness
aggregation has real signal. Each record stores a stable id, role type,
placeholder source URL, capture date, and trimmed requirement excerpts only.

## Built with Codex

Sage was built inside Codex/Claude Code sessions. The layered structure — a
strict, self-verifying reasoning contract separated from transport, a
server-only model boundary, and a UI that renders one JSON shape several ways —
was developed iteratively there: the assistant accelerated scaffolding, schema
and verification code, dataset construction, and UI, while the product decisions
(directions-not-specs, verify-don't-trust, the ≥4 recurrence threshold, the
two-schema split) were specified and reviewed by the author.
