import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: 'AI not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const reportType = body.reportType || 'summary';
    const youth = body.youth || {};
    const period = body.period || {};
    const notes: Array<{ date?: string; category?: string; note?: string }> = Array.isArray(body.notes) ? body.notes : [];
    const ratings = body.ratings || {};
    const pointsTotal = body.pointsTotal || 0;

    const system = `You write concise, objective narratives for youth residential program reports. Use neutral tone, past tense. Focus on facts and observed behavior. Avoid speculation.`;

    const notesText = notes
      .slice(0, 50)
      .map((n) => `- ${n.date || ''} ${n.category ? '[' + n.category + '] ' : ''}${n.note || ''}`)
      .join('\n');

    const user = `Report Type: ${reportType}\nPeriod: ${period.label || `${period.from} - ${period.to}`}\n\nYouth: ${youth.firstName || ''} ${youth.lastName || ''} (Level ${youth.level ?? 'N/A'})\n\nRatings averages (if provided): peer=${ratings.peer ?? 'N/A'}, adult=${ratings.adult ?? 'N/A'}, investment=${ratings.invest ?? 'N/A'}, authority=${ratings.authority ?? 'N/A'}\nTotal points in period: ${pointsTotal}\n\nNotes (chronological highlights):\n${notesText}\n\nTask: Draft a 150-220 word narrative summarizing participation, behavior trends, notable incidents (if any), and 2-3 actionable recommendations. Do not include headers. Return plain paragraphs.`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(502).json({ error: 'Upstream AI error', details: err });
    }
    const json = await resp.json();
    const summary = json?.choices?.[0]?.message?.content || '';
    return res.status(200).json({ summary });
  } catch (e: any) {
    console.error('AI summarize error', e);
    return res.status(500).json({ error: 'AI summarize failed', details: e?.message || String(e) });
  }
}

