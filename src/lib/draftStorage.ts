// ─────────────────────────────────────────────────────────────
//  draftStorage.ts — Manages saved drafts in localStorage
// ─────────────────────────────────────────────────────────────

const DRAFTS_KEY = "legal_drafts_v1";

export interface Draft {
  id: string;
  formId: string;
  templateName: string;
  content: string;
  savedAt: string; // ISO string
}

function loadAll(): Draft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Draft[];
  } catch {
    return [];
  }
}

function saveAll(drafts: Draft[]): void {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

/** Save or overwrite a draft. Returns the saved draft (with generated id if new) */
export function saveDraft(
  formId: string,
  templateName: string,
  content: string,
  existingId?: string
): Draft {
  const drafts = loadAll();
  const now = new Date().toISOString();

  if (existingId) {
    // Update existing
    const idx = drafts.findIndex(d => d.id === existingId);
    if (idx !== -1) {
      drafts[idx] = { ...drafts[idx], content, savedAt: now };
      saveAll(drafts);
      return drafts[idx];
    }
  }

  // Create new
  const newDraft: Draft = {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    formId,
    templateName,
    content,
    savedAt: now,
  };
  drafts.unshift(newDraft); // newest first
  saveAll(drafts);
  return newDraft;
}

/** Get all drafts, newest first */
export function getAllDrafts(): Draft[] {
  return loadAll();
}

/** Get a single draft by id */
export function getDraftById(id: string): Draft | null {
  return loadAll().find(d => d.id === id) || null;
}

/** Delete a draft by id */
export function deleteDraft(id: string): void {
  const drafts = loadAll().filter(d => d.id !== id);
  saveAll(drafts);
}
