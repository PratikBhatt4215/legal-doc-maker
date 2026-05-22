import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFOptions {
  elementId: string;
  filename: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const generatePDF = async (options: PDFOptions) => {
  try {
    const element = document.getElementById(options.elementId);

    if (!element) {
      throw new Error('Element not found');
    }

    // Create canvas from HTML element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    pdf.addImage(
      imgData,
      'PNG',
      imgX,
      imgY,
      imgWidth * ratio,
      imgHeight * ratio
    );

    // Save PDF
    pdf.save(options.filename);

    if (options.onSuccess) {
      options.onSuccess();
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    if (options.onError) {
      options.onError(error);
    }
  }
};
