import { registerPlugin } from '@capacitor/core';

export interface NativePdfExporterPlugin {
  export(options: {
    html: string;
    paperSize: 'a4' | 'legal';
    filename: string;
    pageCount?: number;
  }): Promise<{ downloadPath: string; path: string }>;
}

const NativePdfExporter = registerPlugin<NativePdfExporterPlugin>('NativePdfExporter');

export default NativePdfExporter;
