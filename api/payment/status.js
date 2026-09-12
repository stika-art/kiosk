const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = 'kiosk-media';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const orderId = req.query.orderId;
    if (!orderId) {
        return res.status(400).json({ success: false, error: 'Missing orderId' });
    }

    try {
        // Читаем актуальное состояние заказа из Supabase
        const supabaseRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/orders/${orderId}.json?_t=${Date.now()}`);
        if (supabaseRes.ok) {
            const data = await supabaseRes.json();
            return res.status(200).json({
                success: true,
                orderId: data.orderId,
                status: data.status,
                paidAt: data.paidAt || null
            });
        }

        return res.status(200).json({
            success: true,
            orderId,
            status: 'PENDING'
        });
    } catch(e) {
        return res.status(200).json({
            success: true,
            orderId,
            status: 'PENDING'
        });
    }
};
