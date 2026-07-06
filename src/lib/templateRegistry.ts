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
  originalFilename: string; // for sorting
}

// ── Folder → Court ID Mapping ─────────────────────────────────────
// When a new court folder is added under templates/, just add a line here.
const FOLDER_TO_COURT_ID: Record<string, string> = {
  'DISTRICT COURT': 'district-court',
  'HIGH COURT':     'high-court',
  'FAMILY COURT':   'family-court',
  'JUVENILE COURT': 'juvenile-court',
  'REVENUE':        'revenue-court',
  'REVENUE COURT':  'revenue-court',
  'FORUM':          'forum-court',
  'FORUM COURT':    'forum-court',
  'REGISTRAR':      'registrar',
  'FILE':           'file',
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

export const CATEGORY_DISPLAY_NAMES_HI: Record<string, string> = {
  'CIVIL':                            'दीवानी मामले',
  'CRIMINAL':                         'आपराधिक मामले',
  'CLAIM':                            'दावे',
  'FAMILY COURT':                     'पारिवारिक न्यायालय',
  'REVENUE, MPLRC':                   'राजस्व / MPLRC',
  'RTI':                              'आरटीआई',
  'Upbhokta Forum':                   'उपभोक्ता फोरम',
  'COURT FEES AND JURMANA':           'कोर्ट फीस और जुर्माना',
  'General forms, computer patrak etc': 'सामान्य प्रारूप',
  'formate':                          'सामान्य प्रारूप',
  'jamanat formates':                 'जमानत प्रारूप',
  'marriage':                         'विवाह',
  'jamanat applications':             'जमानत आवेदन',
  'Muslim Law':                       'मुस्लिम कानून',
  'NOTICE':                           'नोटिस',
  '138 NIA':                          'एनआई एक्ट (138)',
  'for plaintiff':                    'वादी आवेदन',
  'for Respondent':                   'प्रतिवादी आवेदन',
  'kishor NYAY BOARD JUBENILE JUSTICE Juvenile court': 'किशोर न्याय',
  'General':                          'सामान्य फ़ाइलें',
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
    .replace(/^\d+\.\s*/, '') // Strip leading numbers like "1. "
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Utility: Detect language from folder and filename ───────────────
function detectLanguage(langFolder: string, filename: string): Language {
  // If the folder is 'en', assume English
  if (langFolder === 'en') return 'en';
  // Fallback to filename detection just in case
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
    // importPath looks like: ../app/templates/hi/District Court/CRIMINAL/bail.docx
    // Strip the prefix to get: hi/District Court/CRIMINAL/bail.docx
    const relative = importPath.replace(/^.*?templates\//, '');
    const parts = relative.split('/');

    if (parts.length < 3) continue; // skip files directly in templates or templates/lang root

    const langFolder = parts[0];    // e.g. "hi" or "en"
    const courtFolder = parts[1];   // e.g. "District Court"
    const filename = parts[parts.length - 1]; // e.g. "bail.docx"

    // Skip temp files created by Word
    if (filename.startsWith('~$')) continue;
    // Skip the comparative table root file
    if (parts.length === 3 && !filename.endsWith('.docx')) continue;

    let courtId = FOLDER_TO_COURT_ID[courtFolder.toUpperCase()];
    if (!courtId) continue; // unknown court folder — skip

    // Category is the top-level directory under court folder
    const categoryParts = parts.slice(2, parts.length - 1);
    let category = categoryParts.length > 0
      ? categoryParts[0] // top-level folder
      : 'General';

    let subPath = categoryParts.length > 1
      ? categoryParts.slice(1)
      : [];

    // Dynamic Overrides for Family Court, Revenue Court, and Forum Court
    // (Legacy overrides in case of miscategorization, though less needed with new structure)
    if (courtId === 'district-court') {
      if (category === 'FAMILY COURT' || category === 'Family Court') {
        courtId = 'family-court';
        // Subcategory promotion so we don't have "Family Court" subfolder again
        if (subPath.length > 0) {
          category = subPath[0];
          subPath = subPath.slice(1);
        } else {
          category = 'General forms, computer patrak etc';
        }
      } else if (category === 'REVENUE, MPLRC' || category === 'Revenue Court') {
        courtId = 'revenue-court';
      } else if (category === 'Upbhokta Forum' || category === 'Forum Court') {
        courtId = 'forum-court';
      }
    }

    const displayName = fileNameToDisplayName(filename);
    const language = detectLanguage(langFolder, filename);
    
    // Include subPath in the slug to prevent folder structure conflicts
    const subPathSlug = subPath.length > 0 ? `${subPath.join('-')}-` : '';
    const id = slugify(`${courtId}-${category}-${subPathSlug}${displayName}-${language}`);

    templates.push({
      id,
      name: displayName,
      description: CATEGORY_DISPLAY_NAMES[category] || category,
      filePath: fileUrl as unknown as string,
      language,
      courtId,
      category,
      subPath,
      originalFilename: filename,
    });
  }

  // Sort by category, then by originalFilename to preserve custom ordering (e.g. 1. 2. 3.)
  templates.sort((a, b) =>
    a.category.localeCompare(b.category) || a.originalFilename.localeCompare(b.originalFilename)
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
  // 1. Try exact match
  let found = _registry.find(t => t.id === id);
  if (found) return found;

  // 2. Try backward-compatible matching for old drafts/states without language suffix
  found = _registry.find(t => t.id.startsWith(id + '-') || id.startsWith(t.id + '-'));
  return found;
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
