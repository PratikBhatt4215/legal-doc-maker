// ─────────────────────────────────────────────────────────────
//  uploadedFileStorage.ts — Manages uploaded .docx files in localStorage
// ─────────────────────────────────────────────────────────────

const UPLOADED_FILES_KEY = "legal_uploaded_files_v1";

export interface UploadedFileRecord {
  id: string;
  name: string;
  base64Data: string; // Base64 encoded string of the .docx ArrayBuffer
  uploadedAt: string; // ISO string
}

function loadAll(): UploadedFileRecord[] {
  try {
    const raw = localStorage.getItem(UPLOADED_FILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UploadedFileRecord[];
  } catch {
    return [];
  }
}

function saveAll(files: UploadedFileRecord[]): void {
  localStorage.setItem(UPLOADED_FILES_KEY, JSON.stringify(files));
}

/** Save a new custom uploaded file record */
export function saveUploadedFile(name: string, base64Data: string): UploadedFileRecord {
  const files = loadAll();
  const now = new Date().toISOString();

  const newRecord: UploadedFileRecord = {
    id: `uploaded_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    base64Data,
    uploadedAt: now,
  };

  files.unshift(newRecord); // newest first
  saveAll(files);
  return newRecord;
}

/** Get all uploaded custom files, newest first */
export function getAllUploadedFiles(): UploadedFileRecord[] {
  return loadAll();
}

/** Delete an uploaded file by ID */
export function deleteUploadedFile(id: string): void {
  const files = loadAll().filter(f => f.id !== id);
  saveAll(files);
}
