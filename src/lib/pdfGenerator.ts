import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import NativePdfExporter from './nativePdfExporterPlugin';
import legalDocumentCss from '../styles/legal-document.css?inline';

export type PaperSize = 'a4' | 'legal';

export interface PDFOptions {
  elementId: string;
  filename: string;
  paperSize: PaperSize;
  pagesToExport?: number[];
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * Builds a clean, self-contained HTML string from the rendered document.
 */
function buildHtmlString(options: PDFOptions): string {
  const container = document.getElementById(options.elementId);
  if (!container) throw new Error('Editor element not found');

  const clone = container.cloneNode(true) as HTMLElement;

  // Filter pages if requested
  if (options.pagesToExport && options.pagesToExport.length > 0) {
    const pages = Array.from(clone.querySelectorAll('section.docx'));
    pages.forEach((page, index) => {
      if (!options.pagesToExport!.includes(index)) page.remove();
    });
  }

  // Strip UI-only elements
  clone.querySelectorAll('.margin-ruler-container').forEach(el => el.remove());
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  clone.querySelectorAll('.legal-conditional-space').forEach(el => {
    el.parentNode?.replaceChild(document.createTextNode(' '), el);
  });
  clone.querySelectorAll('.legal-editable-field').forEach((el: any) => {
    const text = (el.textContent || '').replace(/\u200B/g, '').trim();
    if (text === '') {
      el.textContent = '';
    } else {
      el.className = '';
      el.removeAttribute('style');
    }
  });

  const isLegal = options.paperSize === 'legal';
  const pageSizeCss = isLegal ? '8.5in 14in' : 'A4 portrait';

  // Full styles — safe since we write to a file, not through the bridge
  const docxStyles = Array.from(document.querySelectorAll('style'))
    .map(s => s.textContent ?? '')
    .filter(css => css.includes('.docx') || css.includes('docx-preview'))
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${options.filename}</title>
  <style>
    ${docxStyles}
    ${legalDocumentCss}
    @page { size: ${pageSizeCss}; margin: 1in; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    .docx-wrapper {
      display: block !important;
      background: #fff !important; padding: 0 !important;
      margin: 0 !important; visibility: visible !important;
    }
    .docx-wrapper * { visibility: visible !important; }
    .docx-wrapper > section.docx {
      box-shadow: none !important; border: none !important;
      background: #fff !important; margin: 0 !important;
      page-break-after: always !important; break-after: page !important;
    }
    .docx-wrapper > section.docx:last-child {
      page-break-after: avoid !important; break-after: avoid !important;
    }
    .no-print, .margin-ruler-container { display: none !important; }
  </style>
</head>
<body>${clone.innerHTML}</body>
</html>`;
}

/**
 * Native Android:
 * 1. Writes the full HTML to a cache file using @capacitor/filesystem
 *    (avoids the Capacitor JS bridge size limit — only the tiny file path is sent to Java)
 * 2. Java plugin reads the file, loads it in a hidden WebView, and renders to PDF silently.
 */
async function generatePDFNative(options: PDFOptions): Promise<void> {
  const container = document.getElementById(options.elementId);
  if (!container) throw new Error('Editor element not found');

  let pageCount = container.querySelectorAll('section.docx').length;
  if (options.pagesToExport && options.pagesToExport.length > 0) {
    pageCount = options.pagesToExport.length;
  }

  const html = buildHtmlString(options);

  console.log('[PDF] Exporting HTML natively using NativePdfExporter:', options.filename, 'pageCount:', pageCount);

  const result = await NativePdfExporter.export({
    html,
    filename: options.filename,
    paperSize: options.paperSize,
    pageCount,
  });

  console.log('[PDF] Native export complete. Saved to:', result.downloadPath, 'path:', result.path);

  // Trigger native share dialog to allow sharing via WhatsApp, email, etc.
  try {
    const fileUrl = result.path.startsWith('file://') ? result.path : `file://${result.path}`;
    await Share.share({
      title: options.filename,
      url: fileUrl,
      dialogTitle: 'Share PDF Document',
    });
  } catch (shareError) {
    console.error('[PDF] Sharing failed:', shareError);
  }

  options.onSuccess?.();
}

/**
 * Web fallback — opens a print dialog in the browser.
 */
function generatePDFWeb(options: PDFOptions): void {
  const html = buildHtmlString(options);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
      options.onSuccess?.();
    }, 300);
  }
}

export const generatePDF = async (options: PDFOptions): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await generatePDFNative(options);
    } else {
      generatePDFWeb(options);
    }
  } catch (error) {
    console.error('[PDF] generation error:', error);
    options.onError?.(error);
  }
};
