// Utilities to export a DOM element to PDF or Word DOCX from the browser
import html2pdf from 'html2pdf.js';
import htmlToDocx from 'html-to-docx';

export async function exportElementToPDF(element: HTMLElement, filename: string) {
  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  } as any;

  await (html2pdf() as any).set(opt).from(element).save();
}

export async function exportElementToDocx(element: HTMLElement, filename: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${element.outerHTML}</body></html>`;

  const blob: Blob = await htmlToDocx(html, undefined, {
    orientation: 'portrait',
    margins: { top: 720, right: 720, bottom: 720, left: 720 }, // half inch margins (in twentieths of a point)
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Prefer exporting from an HTML string to avoid layout/visibility issues when the
// export container is off-screen or hidden.
export async function exportHTMLToPDF(html: string, filename: string) {
  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  } as any;

  await (html2pdf() as any).set(opt).from(html).save();
}

export async function exportHTMLToDocx(htmlBody: string, filename: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${htmlBody}</body></html>`;
  const blob: Blob = await htmlToDocx(html, undefined, {
    orientation: 'portrait',
    margins: { top: 720, right: 720, bottom: 720, left: 720 },
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
