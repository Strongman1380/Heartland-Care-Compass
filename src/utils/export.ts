// Utilities to export a DOM element to PDF or Word document from the browser.
//
// PDF approach: opens the content in a new browser tab/window with print CSS,
// then calls window.print(). The user's browser print dialog lets them save as
// PDF or send to a physical printer. This avoids the unreliable html2pdf.js
// dynamic-import issues with Vite.
//
// DOCX approach: packages the HTML as an application/vnd.ms-word blob with a
// .doc extension. Word, LibreOffice, and Google Docs all open these files.
// html-to-docx cannot run in the browser (it imports Node.js built-ins like
// fs, crypto, stream) so it has been replaced with this approach.

const PRINT_STYLES = `
  @page { margin: 0.5in; size: letter portrait; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #fff; color: #111; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function buildPrintDocument(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title.replace(/</g, '&lt;')}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}

function openPrintWindow(html: string): void {
  // Use a Blob URL so the browser loads the page normally — this ensures
  // the load event fires after attachment (unlike document.write which can
  // fire synchronously before the listener is added).
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('Could not open print window. Please allow pop-ups for this site and try again.');
  }
  win.addEventListener('load', () => {
    win.focus();
    win.print();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
}

function downloadWordDoc(htmlBody: string, filename: string): void {
  // Build a minimal Word-compatible HTML document
  const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
     xmlns:w='urn:schemas-microsoft-com:office:word'
     xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <meta name="ProgId" content="Word.Document">
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
    <style>
      @page WordSection1 { size: 8.5in 11in; margin: 0.75in; }
      body { font-family: 'Times New Roman', serif; font-size: 12pt; }
      div.WordSection1 { page: WordSection1; }
    </style>
  </head>
  <body><div class="WordSection1">${htmlBody}</div></body>
</html>`;

  const blob = new Blob([doc], { type: 'application/vnd.ms-word;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Use .doc — Word/LibreOffice open HTML wrapped in .doc natively
  const base = filename.replace(/\.(docx?|pdf)$/i, '');
  a.download = `${base}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportElementToPDF(element: HTMLElement, filename: string) {
  try {
    const title = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    openPrintWindow(buildPrintDocument(element.outerHTML, title));
  } catch (error: any) {
    console.error('PDF Export Error:', error);
    throw new Error(error.message || 'PDF export failed');
  }
}

export async function exportElementToDocx(element: HTMLElement, filename: string) {
  try {
    downloadWordDoc(element.outerHTML, filename);
  } catch (error: any) {
    console.error('DOCX Export Error:', error);
    throw new Error(error.message || 'Word document export failed');
  }
}

export async function exportHTMLToPDF(content: string | HTMLElement, filename: string) {
  try {
    const title = (typeof filename === 'string' ? filename : 'Document')
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]/g, ' ');
    const bodyHtml = typeof content === 'string' ? content : content.outerHTML;
    openPrintWindow(buildPrintDocument(bodyHtml, title));
  } catch (error: any) {
    console.error('PDF Export Error:', error);
    throw new Error(error.message || 'PDF export failed');
  }
}

export async function exportHTMLToDocx(htmlBody: string, filename: string) {
  try {
    downloadWordDoc(htmlBody, filename);
  } catch (error: any) {
    console.error('DOCX Export Error:', error);
    throw new Error(error.message || 'Word document export failed');
  }
}
