// Utilities to export a DOM element to PDF or Word DOCX from the browser

export async function exportElementToPDF(element: HTMLElement, filename: string) {
  try {
    const mod: any = await import('html2pdf.js');
    const html2pdf: any = mod.default || mod;
    
    if (!html2pdf) {
      throw new Error('html2pdf.js failed to load');
    }
    
    const opt = {
      margin: 36, // Match CSS @page margin: 36pt (~0.5 inch)
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth || 816,
        windowHeight: element.scrollHeight || 1056
      },
      jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    } as any;

    // Wait a tiny bit for any pending renders
    await new Promise(resolve => setTimeout(resolve, 100));

    await (html2pdf() as any).set(opt).from(element).save();
  } catch (error: any) {
    console.error('PDF Export Error:', error);
    throw new Error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
  }
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
export async function exportHTMLToPDF(content: string | HTMLElement, filename: string) {
  try {
    const mod: any = await import('html2pdf.js');
    const html2pdf: any = mod.default || mod;
    
    if (!html2pdf) {
      throw new Error('html2pdf.js failed to load');
    }
    
    const opt = {
      margin: 36, // Match CSS @page margin: 36pt (~0.5 inch)
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: typeof content === 'string' ? 816 : ((content as HTMLElement).scrollWidth || 816), // 816px is roughly 8.5 inches at 96dpi
        windowHeight: typeof content === 'string' ? undefined : ((content as HTMLElement).scrollHeight || 1056)
      },
      jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    } as any;

    if (typeof content === 'string') {
      // Use absolute positioning with opacity:0 so html2canvas can measure layout
      // (position:fixed at -9999px causes html2canvas to render a blank canvas)
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '0';
      tempContainer.style.top = '0';
      tempContainer.style.width = '612pt';
      tempContainer.style.zIndex = '-9999';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.overflow = 'visible';
      tempContainer.style.opacity = '1'; // Ensure it's fully opaque for html2canvas
      tempContainer.style.backgroundColor = '#ffffff'; // Ensure white background
      tempContainer.innerHTML = content;
      document.body.appendChild(tempContainer);

      // Wait a tiny bit for the DOM to fully render the new element before capturing
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        await (html2pdf() as any).set(opt).from(tempContainer).save();
      } finally {
        document.body.removeChild(tempContainer);
      }
    } else {
      await (html2pdf() as any).set(opt).from(content).save();
    }
  } catch (error: any) {
    console.error('PDF Export Error:', error);
    throw new Error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
  }
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
