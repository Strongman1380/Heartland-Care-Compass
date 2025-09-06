import 'dotenv/config';
import { createServer } from 'http';

const PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const { method, url } = req;
  // CORS (not strictly needed via Vite proxy, but harmless)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  if (method === 'POST' && url === '/api/ai-summarize') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.statusCode = 501;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'AI not configured' }));
    }
    try {
      const body = await readJson(req);
      const system = `You write concise, objective narratives for youth residential program reports. Use neutral tone, past tense. Focus on facts and observed behavior. Avoid speculation.`;
      const notes = Array.isArray(body?.notes) ? body.notes : [];
      const notesText = notes.slice(0, 50).map(n => `- ${n.date || ''} ${n.category ? '[' + n.category + '] ' : ''}${n.note || ''}`).join('\n');
      const user = `Report Type: ${body.reportType}\nPeriod: ${body?.period?.label || `${body?.period?.from} - ${body?.period?.to}`}\n\nYouth: ${body?.youth?.firstName || ''} ${body?.youth?.lastName || ''} (Level ${body?.youth?.level ?? 'N/A'})\n\nRatings averages (if provided): peer=${body?.ratings?.peer ?? 'N/A'}, adult=${body?.ratings?.adult ?? 'N/A'}, investment=${body?.ratings?.invest ?? 'N/A'}, authority=${body?.ratings?.authority ?? 'N/A'}\nTotal points in period: ${body?.pointsTotal ?? 0}\n\nNotes (chronological highlights):\n${notesText}\n\nTask: Draft a 150-220 word narrative summarizing participation, behavior trends, notable incidents (if any), and 2-3 actionable recommendations. Do not include headers. Return plain paragraphs.`;
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
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Upstream AI error', details: err }));
      }
      const json = await resp.json();
      const summary = json?.choices?.[0]?.message?.content || '';
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ summary }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'AI summarize failed', details: e?.message || String(e) }));
    }
  }

  // Not found
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Dev API server listening on http://localhost:${PORT}`);
});
