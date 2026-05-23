/**
 * templateRegistry.ts
 * ─────────────────────────────────────────────────────────────────
 * Auto-discovers ALL .docx template files from the templates folder
 * using Vite's import.meta.glob.
 *
 * HOW TO ADD NEW TEMPLATES:
 *   Just drop a .docx file into the correct subfolder under:
 *   src/app/templates/<Court Folder>/<Category>/
 *   It will automatically appear in the app — NO code changes needed.
 *
 * HOW TO ADD ENGLISH TEMPLATES:
 *   Name the file with ".en.docx" suffix for English.
 *   Hindi files have no suffix (or ".hi.docx").
 *   Example:
 *     bail-application.docx        → Hindi (default)
 *     bail-application.en.docx     → English
 * ─────────────────────────────────────────────────────────────────
 */

// ── Types ──────────────────────────────────────────────────────────
export type Language = 'hi' | 'en';

export interface TemplateFile {
  id: string;           // unique id derived from file path
  name: string;         // human-readable name (from filename)
  description: string;  // category name
  filePath: string;     // raw vite asset url
  language: Language;   // 'hi' or 'en'
  courtId: string;      // e.g. 'district-court'
  category: string;     // e.g. 'CRIMINAL', 'CIVIL'
  subPath: string[];    // nested folders
}

// ── Folder → Court ID Mapping ─────────────────────────────────────
// When a new court folder is added under templates/, just add a line here.
const FOLDER_TO_COURT_ID: Record<string, string> = {
  'District Court': 'district-court',
  'High Court':     'high-court',
  'Family Court':   'family-court',
  'Juvenile Court': 'juvenile-court',
  'Revenue Court':  'revenue-court',
  'Forum Court':    'forum-court',
};

// ── Category folder display names ─────────────────────────────────
// Makes internal folder names prettier for display in the app.
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'CIVIL':                            'Civil Cases',
  'CRIMINAL':                         'Criminal Cases',
  'CLAIM':                            'Claims',
  'FAMILY COURT':                     'Family Court',
  'REVENUE, MPLRC':                   'Revenue / MPLRC',
  'RTI':                              'RTI',
  'Upbhokta Forum':                   'Consumer Forum',
  'COURT FEES AND JURMANA':           'Court Fees & Jurmana',
  'General forms, computer patrak etc': 'General Forms',
  'formate':                          'General Formats',
  'jamanat formates':                 'Bail Formats',
  'marriage':                         'Marriage',
  'jamanat applications':             'Bail Applications',
  'Muslim Law':                       'Muslim Law',
  'NOTICE':                           'Notices',
  '138 NIA':                          'NI Act (138)',
  'for plaintiff':                    'Plaintiff Applications',
  'for Respondent':                   'Respondent Applications',
  'kishor NYAY BOARD JUBENILE JUSTICE Juvenile court': 'Juvenile Justice',
};

// ── Auto-import all .docx files using Vite glob ────────────────────
// This runs at build time — no runtime filesystem access needed.
const allDocxFiles = import.meta.glob<string>(
  '../app/templates/**/*.docx',
  { eager: true, import: 'default', query: '?url' }
);

// ── Utility: Clean up a filename into a display name ──────────────
function fileNameToDisplayName(filename: string): string {
  return filename
    .replace(/\.en\.docx$|\.hi\.docx$|\.docx$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Utility: Detect language from filename ─────────────────────────
function detectLanguage(filename: string): Language {
  if (filename.endsWith('.en.docx')) return 'en';
  return 'hi'; // default is Hindi
}

// ── Utility: Slugify a string for use as an ID ────────────────────
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Build the registry ────────────────────────────────────────────
let _registry: TemplateFile[] | null = null;

function buildRegistry(): TemplateFile[] {
  const templates: TemplateFile[] = [];

  for (const [importPath, fileUrl] of Object.entries(allDocxFiles)) {
    // importPath looks like: ../app/templates/District Court/CRIMINAL/bail.docx
    // Strip the prefix to get: District Court/CRIMINAL/bail.docx
    const relative = importPath.replace(/^.*?templates\//, '');
    const parts = relative.split('/');

    if (parts.length < 2) continue; // skip files directly in templates root

    const courtFolder = parts[0];   // e.g. "District Court"
    const filename = parts[parts.length - 1]; // e.g. "bail.docx"

    // Skip temp files created by Word
    if (filename.startsWith('~$')) continue;
    // Skip the comparative table root file
    if (parts.length === 2 && !filename.endsWith('.docx')) continue;

    const courtId = FOLDER_TO_COURT_ID[courtFolder];
    if (!courtId) continue; // unknown court folder — skip

    // Category is the top-level directory under court folder
    const categoryParts = parts.slice(1, parts.length - 1);
    const category = categoryParts.length > 0
      ? categoryParts[0] // top-level folder
      : 'General';

    const subPath = categoryParts.length > 1
      ? categoryParts.slice(1)
      : [];

    const displayName = fileNameToDisplayName(filename);
    const language = detectLanguage(filename);
    
    // Include subPath in the slug to prevent folder structure conflicts
    const subPathSlug = subPath.length > 0 ? `${subPath.join('-')}-` : '';
    const id = slugify(`${courtId}-${category}-${subPathSlug}${displayName}`);

    templates.push({
      id,
      name: displayName,
      description: CATEGORY_DISPLAY_NAMES[category] || category,
      filePath: fileUrl as unknown as string,
      language,
      courtId,
      category,
      subPath,
    });
  }

  // Sort by category, then by name
  templates.sort((a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );

  return templates;
}

// ── Public API ────────────────────────────────────────────────────

/** Get all templates for a given court, optionally filtered by language. */
export function getTemplatesForCourt(
  courtId: string,
  language?: Language
): TemplateFile[] {
  if (!_registry) _registry = buildRegistry();
  return _registry.filter(
    t => t.courtId === courtId && (!language || t.language === language)
  );
}

/** Get templates grouped by category for a court. */
export function getTemplatesByCategory(
  courtId: string,
  language?: Language
): Record<string, TemplateFile[]> {
  const templates = getTemplatesForCourt(courtId, language);
  const grouped: Record<string, TemplateFile[]> = {};
  for (const t of templates) {
    if (!grouped[t.description]) grouped[t.description] = [];
    grouped[t.description].push(t);
  }
  return grouped;
}

/** Get a single template by its ID. */
export function getTemplateById(id: string): TemplateFile | undefined {
  if (!_registry) _registry = buildRegistry();
  return _registry.find(t => t.id === id);
}

/** Get all available languages for a given court. */
export function getAvailableLanguages(courtId: string): Language[] {
  const templates = getTemplatesForCourt(courtId);
  const langs = new Set(templates.map(t => t.language));
  return Array.from(langs);
}

/** Total number of templates in the registry. */
export function getTotalTemplateCount(): number {
  if (!_registry) _registry = buildRegistry();
  return _registry.length;
}
