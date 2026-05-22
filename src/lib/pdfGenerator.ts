import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export type PaperSize = 'a4' | 'legal';

export interface PDFOptions {
  elementId: string;
  filename: string;
  paperSize: PaperSize;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

// Paper dimensions in mm
const PAPER_SIZES: Record<PaperSize, [number, number]> = {
  a4:    [210, 297],
  legal: [216, 356],
};

export const generatePDF = async (options: PDFOptions) => {
  try {
    const container = document.getElementById(options.elementId);
    if (!container) throw new Error('Editor element not found');

    const [pdfW, pdfH] = PAPER_SIZES[options.paperSize];

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfW, pdfH],
    });

    // Find all rendered page sections inside docx-preview wrapper
    const pages = container.querySelectorAll('.docx-wrapper > section, .docx');

    if (pages.length > 0) {
      // ── Page-by-Page Rendering ──
      // This preserves exact page boundaries from the Word template!
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        if (i > 0) pdf.addPage([pdfW, pdfH]);

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: pageEl.offsetWidth,
          height: pageEl.offsetHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      }
    } else {
      // Fallback: Capture the entire element and slice it (if not using docx-preview sections)
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdfW;
      const imgHeight = (canvas.height * pdfW) / canvas.width;

      let yOffset = 0;
      let remaining = imgHeight;

      while (remaining > 0) {
        if (yOffset > 0) pdf.addPage([pdfW, pdfH]);
        pdf.addImage(imgData, 'PNG', 0, -yOffset, imgWidth, imgHeight);
        yOffset += pdfH;
        remaining -= pdfH;
      }
    }

    // Sanitize filename for mobile OS safety (avoid spaces, non-ASCII/Hindi chars, special symbols)
    let safeFilename = options.filename
      .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII (Devanagari, etc.)
      .replace(/[\s\(\)\[\]\{\}\<\>\\\/\|\:\*\?\"\'\`,;]/g, "_") // Replace spaces and special characters with underscores
      .replace(/_+/g, "_"); // Collapse multiple underscores
    
    if (!safeFilename.toLowerCase().endsWith('.pdf')) {
      safeFilename += '.pdf';
    }
    if (safeFilename === '.pdf' || safeFilename.length <= 4) {
      safeFilename = `legal_document_${Date.now()}.pdf`;
    }

    // ── NATIVE SAVING/SHARING ON MOBILE ──
    if (Capacitor.isNativePlatform()) {
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
      const fileResult = await Filesystem.writeFile({
        path: safeFilename,
        data: pdfBase64,
        directory: Directory.Cache, // Temp directory on device
      });

      await Share.share({
        title: 'Drafted Legal Document',
        text: 'Here is your drafted legal document.',
        url: fileResult.uri,
        dialogTitle: 'Save/Share PDF',
      });

      options.onSuccess?.();
    } else {
      // Browser fallback (PC/Mac)
      pdf.save(safeFilename);
      options.onSuccess?.();
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    options.onError?.(error);
  }
};
