// /api/auth.js — Server-side password verification for pipeline dashboard
// Password stored in PIPELINE_PASSWORD env var, never exposed to frontend

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://axseter.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const expected = process.env.PIPELINE_PASSWORD;
    if (!expected) {
        console.error('PIPELINE_PASSWORD not configured');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    const { password } = req.body || {};
    if (!password || typeof password !== 'string') {
        return res.status(400).json({ ok: false });
    }

    // Constant-time comparison to prevent timing attacks
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    const match = a.length === b.length && require('crypto').timingSafeEqual(a, b);

    if (match) {
        return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ ok: false });
}
