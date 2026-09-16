const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = 'kiosk-media';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            const payload = {
                ...body,
                receivedAt: new Date().toISOString()
            };

            await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/diag/kiosk_report.json`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'x-upsert': 'true'
                },
                body: JSON.stringify(payload, null, 2)
            });

            return res.status(200).json({ success: true, message: 'Report saved' });
        } catch(e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    // GET: return latest report
    try {
        const sRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/diag/kiosk_report.json?_t=${Date.now()}`);
        if (sRes.ok) {
            const data = await sRes.json();
            return res.status(200).json(data);
        }
        return res.status(200).json({ success: false, message: 'No report yet' });
    } catch(err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
