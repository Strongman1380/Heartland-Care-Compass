/**
 * useExport
 *
 * Wraps exportElementToPDF, exportElementToDocx, and printYouthProfile behind
 * a consistent API with a shared `exporting` loading state.
 */

import { useState, useCallback } from 'react';
import { exportElementToPDF, exportElementToDocx } from '@/utils/export';
import { printYouthProfile } from '@/utils/profileExport';
import type { Youth } from '@/types/app-types';

export type ExportFormat = 'pdf' | 'docx' | 'print';

export interface ExportOptions {
  filename: string;
  format: ExportFormat;
  /** Required for 'pdf' and 'docx' formats */
  element?: HTMLElement | null;
  /** Required for 'print' format */
  youth?: Youth;
}

interface UseExportResult {
  exportData: (options: ExportOptions) => Promise<void>;
  exporting: boolean;
}

export function useExport(): UseExportResult {
  const [exporting, setExporting] = useState(false);

  const exportData = useCallback(async (options: ExportOptions) => {
    const { filename, format, element, youth } = options;
    setExporting(true);
    try {
      if (format === 'pdf') {
        if (!element) throw new Error('element is required for PDF export');
        await exportElementToPDF(element, filename);
      } else if (format === 'docx') {
        if (!element) throw new Error('element is required for DOCX export');
        await exportElementToDocx(element, filename);
      } else if (format === 'print') {
        if (!youth) throw new Error('youth is required for print export');
        printYouthProfile(youth);
      }
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportData, exporting };
}
