// Utilities to export a DOM element to PDF or Word DOCX from the browser

export async function exportElementToPDF(element: HTMLElement, filename: string) {
  const mod: any = await import('html2pdf.js');
  const html2pdf: any = mod.default || mod;
  const opt = {
    margin: 36, // Match CSS @page margin: 36pt (~0.5 inch)
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    },
    jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  } as any;

  await (html2pdf() as any).set(opt).from(element).save();
}

export async function exportElementToDocx(element: HTMLElement, filename: string) {
  const mod: any = await import('html-to-docx');
  const htmlToDocx: any = mod.default || mod;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${element.outerHTML}</body></html>`;

  const blob: Blob = await htmlToDocx(html, undefined, {
    orientation: 'portrait',
    margins: { top: 720, right: 720, bottom: 720, left: 720 }, // half inch margins (twentieths of a point)
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
  const mod: any = await import('html2pdf.js');
  const html2pdf: any = mod.default || mod;
  const opt = {
    margin: 36, // Match CSS @page margin: 36pt (~0.5 inch)
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    },
    jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  } as any;

  await (html2pdf() as any).set(opt).from(html).save();
}

export async function exportHTMLToDocx(htmlBody: string, filename: string) {
  const mod: any = await import('html-to-docx');
  const htmlToDocx: any = mod.default || mod;
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

