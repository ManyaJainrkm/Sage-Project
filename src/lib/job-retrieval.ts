/**
 * Sage's "retrieval" layer. Role types are a fixed, small dropdown, so
 * retrieval is literally a filter over the seeded dataset — no embeddings,
 * no search index, no semantic ranking. This narrows the dataset to a
 * shortlist that GPT-5.6 then reasons over; the whole dataset never goes
 * through the model.
 */
import postingsData from "~/data/job-postings.json";
import type { SageJobPosting } from "~/lib/reasoning-schema";
import type { StoredPosting } from "~/types/sage";

const STORED_POSTINGS = (postingsData.postings as StoredPosting[]);

/** Full display records for a role type (includes title/company). */
export function postingsForRole(roleTypeId: string): StoredPosting[] {
  return STORED_POSTINGS.filter((posting) => posting.role_type === roleTypeId);
}

/** Strips display-only fields, leaving exactly what the model should read. */
export function toModelPosting(posting: StoredPosting): SageJobPosting {
  return {
    id: posting.id,
    role_type: posting.role_type,
    source_url: posting.source_url,
    captured_date: posting.captured_date,
    requirement_excerpts: posting.requirement_excerpts,
  };
}

/** The shortlist handed to the batched readiness call for a role type. */
export function shortlistForRole(roleTypeId: string): SageJobPosting[] {
  return postingsForRole(roleTypeId).map(toModelPosting);
}

/** Count of seeded postings backing a role type (used for copy like "of N"). */
export function postingCountForRole(roleTypeId: string): number {
  return postingsForRole(roleTypeId).length;
}

/** Lookup a stored posting by id, for rendering which postings back a gap. */
export function storedPostingById(id: string): StoredPosting | undefined {
  return STORED_POSTINGS.find((posting) => posting.id === id);
}
