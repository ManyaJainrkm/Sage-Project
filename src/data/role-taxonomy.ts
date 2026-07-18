/**
 * The fixed, small set of target role types Sage supports.
 *
 * This IS the retrieval namespace: a user picks one of these, and the
 * "retrieval" layer is literally `postings.filter(p => p.role_type === id)`.
 * No embeddings, no search index — the taxonomy is the index.
 *
 * Keep this list short and deep. Each role type must be backed by enough
 * postings (see job-postings.json) that shared requirements genuinely recur,
 * or the readiness screen has nothing to aggregate.
 */

export interface RoleType {
  /** Stable id stored on every posting; never shown raw to the user. */
  id: string;
  /** Display label for the dropdown. */
  label: string;
  /** One line describing the target, shown under the picker. */
  blurb: string;
}

export const ROLE_TYPES: readonly RoleType[] = [
  {
    id: "ai-ml-engineer-new-grad",
    label: "AI/ML Engineer — New Grad",
    blurb: "Entry-level roles building and shipping ML/LLM systems to production.",
  },
  {
    id: "backend-engineer-junior",
    label: "Backend Engineer — Junior",
    blurb: "Junior roles designing APIs and distributed services at scale.",
  },
  {
    id: "data-engineer-junior",
    label: "Data Engineer — Junior",
    blurb: "Junior roles building batch and streaming data pipelines.",
  },
] as const;

export type RoleTypeId = (typeof ROLE_TYPES)[number]["id"];

export function roleTypeById(id: string): RoleType | undefined {
  return ROLE_TYPES.find((role) => role.id === id);
}
