/**
 * Extract text from various document formats (PDF, DOCX, TXT)
 * Supports Word docs (.docx), PDFs (.pdf), and plain text
 */

export interface ExtractionResult {
  text: string;
  format: 'pdf' | 'docx' | 'text' | 'xlsx';
  fileName: string;
  isBlank: boolean;
  error?: string;
}

/**
 * Extract text from DOCX file
 */
async function extractFromDocx(file: File): Promise<string> {
  try {
    // Use XLSX to read DOCX (it supports Office Open XML which DOCX is based on)
    // For proper DOCX support, we'll use a simpler approach with the file
    const arrayBuffer = await file.arrayBuffer();

    // Try using a simple regex approach on the XML inside DOCX
    // DOCX files are ZIP archives containing XML
    // Since we can't use JSZip directly, we'll try extracting via a library

    // For now, provide a helpful error message
    throw new Error(
      'DOCX parsing requires additional setup. Please convert to PDF or paste text directly.'
    );
  } catch (error: any) {
    throw new Error(`Failed to extract DOCX: ${error.message}`);
  }
}

/**
 * Extract text from PDF file
 */
async function extractFromPdf(file: File): Promise<string> {
  try {
    // Dynamically import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    const { getDocument, GlobalWorkerOptions } = pdfjsLib;

    // Set the worker source for PDF.js
    // Strategy: Try multiple approaches to set up the worker
    let workerSet = false;

    // Try 1: Use the module import (works in dev)
    if (!workerSet) {
      try {
        const workerModule: any = await import(
          'pdfjs-dist/build/pdf.worker.mjs'
        );
        if (workerModule && workerModule.default) {
          GlobalWorkerOptions.workerSrc = workerModule.default;
          workerSet = true;
        }
      } catch (e) {
        // Continue to next strategy
      }
    }

    // Try 2: Use relative URL from node_modules (works in some builds)
    if (!workerSet) {
      try {
        const workerUrl = new URL(
          '../../../node_modules/pdfjs-dist/build/pdf.worker.js',
          import.meta.url
        ).href;
        // Test if URL is valid by checking it starts with http or file
        if (workerUrl.startsWith('http') || workerUrl.startsWith('file')) {
          GlobalWorkerOptions.workerSrc = workerUrl;
          workerSet = true;
        }
      } catch (urlError) {
        // Continue to next strategy
      }
    }

    // Try 3: Use CDN-hosted worker (reliable on Vercel)
    if (!workerSet) {
      // Use unpkg CDN for PDF.js worker - version should match pdfjs-dist version
      GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      workerSet = true;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error: any) {
    // If pdfjs-dist is not available, provide helpful message
    if (error.message && error.message.includes('Cannot find module')) {
      throw new Error(
        'PDF parsing requires additional setup. Please paste the text directly or convert to text format.'
      );
    }

    // Check if it's a worker loading issue
    if (error.message && (error.message.includes('worker') || error.message.includes('Worker'))) {
      throw new Error(
        'PDF parsing is temporarily unavailable. Please try pasting the text directly instead.'
      );
    }

    throw new Error(`Failed to extract PDF: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Extract text from plain text file
 */
async function extractFromText(file: File): Promise<string> {
  return file.text();
}

/**
 * Main extraction function - handles all supported formats
 */
export async function extractTextFromDocument(file: File): Promise<ExtractionResult> {
  const fileName = file.name;
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

  // Validate file size (max 10MB)
  const maxSizeBytes = 10 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      text: '',
      format: 'text',
      fileName,
      isBlank: true,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`,
    };
  }

  try {
    let text = '';
    let format: 'pdf' | 'docx' | 'text' | 'xlsx' = 'text';

    if (fileExtension === 'pdf') {
      text = await extractFromPdf(file);
      format = 'pdf';
    } else if (fileExtension === 'doc') {
      return {
        text: '',
        format: 'text',
        fileName,
        isBlank: true,
        error: 'Legacy .doc files are not supported. Please convert to .docx or PDF and try again.',
      };
    } else if (fileExtension === 'docx') {
      text = await extractFromDocx(file);
      format = 'docx';
    } else if (['txt', 'text'].includes(fileExtension)) {
      text = await extractFromText(file);
      format = 'text';
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
      // For Excel, warn but try to extract
      return {
        text: '',
        format: 'xlsx',
        fileName,
        isBlank: true,
        error: `Excel files (.${fileExtension}) are not supported. Please convert to PDF or text and try again.`,
      };
    } else {
      return {
        text: '',
        format: 'text',
        fileName,
        isBlank: true,
        error: `Unsupported file format (.${fileExtension || 'unknown'}). Supported formats: PDF, DOCX, TXT`,
      };
    }

    // Clean up whitespace and check if blank
    const cleanedText = text.trim();
    const isBlank = cleanedText.length === 0;

    if (isBlank) {
      return {
        text: '',
        format,
        fileName,
        isBlank: true,
        error: `The ${format.toUpperCase()} file appears to be blank or contains no extractable text.`,
      };
    }

    return {
      text: cleanedText,
      format,
      fileName,
      isBlank: false,
    };
  } catch (error: any) {
    return {
      text: '',
      format: 'text',
      fileName,
      isBlank: true,
      error: error.message || `Failed to extract text from ${fileName}`,
    };
  }
}

/**
 * Validate that a file is a supported document type
 */
export function isValidDocumentType(file: File): boolean {
  const supportedExtensions = ['pdf', 'docx', 'doc', 'txt', 'text'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  return supportedExtensions.includes(fileExtension);
}

/**
 * Get a friendly description of supported formats
 */
export function getSupportedFormatsDescription(): string {
  return 'PDF, Word documents (.docx), or plain text (.txt)';
}
