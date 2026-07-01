// api/proxy.js — Vercel API Route
// ทำหน้าที่เป็น proxy ระหว่าง browser กับ Google Apps Script
// เพื่อหลีกเลี่ยงปัญหา CORS

export default async function handler(req, res) {
  // อนุญาต CORS จากทุก origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // อ่าน Script URL จาก query parameter
  const scriptUrl = req.query.scriptUrl;
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/')) {
    return res.status(400).json({ status: 'error', message: 'Invalid scriptUrl' });
  }

  try {
    if (req.method === 'GET') {
      // JSONP-style loadAll — ส่งต่อ GET ไปยัง Apps Script
      const params = new URLSearchParams();
      Object.keys(req.query).forEach(k => {
        if (k !== 'scriptUrl') params.append(k, req.query[k]);
      });
      const url = scriptUrl + (params.toString() ? '?' + params.toString() : '');
      const response = await fetch(url);
      const text = await response.text();
      // ถ้าเป็น JSONP (มี callback) ให้ตอบเป็น JSON ตรงๆ แทน
      const cb = req.query.callback;
      if (cb && text.startsWith(cb + '(')) {
        const json = text.slice(cb.length + 1, -1);
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(json);
      }
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(text);

    } else if (req.method === 'POST') {
      // ส่งต่อ POST ไปยัง Apps Script
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch {
        return res.status(200).send(text);
      }
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
