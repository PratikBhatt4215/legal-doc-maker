import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
    const element = document.getElementById(options.elementId);
    if (!element) throw new Error('Editor element not found');

    const [pdfW, pdfH] = PAPER_SIZES[options.paperSize];

    // Capture the element at high resolution
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfW, pdfH],
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pdfW;
    const imgHeight = (canvas.height * pdfW) / canvas.width;

    let yOffset = 0;
    let remaining = imgHeight;

    // Multi-page support: slice image across pages
    while (remaining > 0) {
      if (yOffset > 0) pdf.addPage([pdfW, pdfH]);
      pdf.addImage(imgData, 'PNG', 0, -yOffset, imgWidth, imgHeight);
      yOffset += pdfH;
      remaining -= pdfH;
    }

    pdf.save(options.filename);
    options.onSuccess?.();
  } catch (error) {
    console.error('PDF generation error:', error);
    options.onError?.(error);
  }
};
