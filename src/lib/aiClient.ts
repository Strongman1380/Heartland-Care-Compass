export interface AISummaryRequest {
  youth: any;
  reportType: string;
  period: { startDate: string; endDate: string };
  data: any;
}

export async function summarizeReport(payload: AISummaryRequest): Promise<string> {
  try {
    const res = await fetch('/api/ai/summarize-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `AI service error (${res.status})`);
    }
    const data = await res.json();
    return data.summary || '';
  } catch (e) {
    console.warn('AI summarize unavailable:', e);
    return '';
  }
}

