const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = 'kiosk-media';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const orderId = body.orderId;
        if (orderId) {
            const updatedOrder = {
                orderId,
                status: 'PAID',
                simulated: true,
                paidAt: new Date().toISOString()
            };

            await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/orders/${orderId}.json`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'x-upsert': 'true'
                },
                body: JSON.stringify(updatedOrder)
            });
        }
        return res.status(200).json({ success: true, status: 'PAID' });
    } catch (e) {
        return res.status(400).json({ success: false });
    }
};
