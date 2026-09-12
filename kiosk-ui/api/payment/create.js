const { createFinikPayment } = require('../finik');

const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = 'kiosk-media';

async function saveOrderStatus(orderId, orderData) {
    try {
        await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/orders/${orderId}.json`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'x-upsert': 'true'
            },
            body: JSON.stringify(orderData)
        });
    } catch(e) {
        console.warn('Failed to save order to Supabase:', e.message);
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const amount = Number(body.amount) || 290;
        const templateTitle = body.templateTitle || 'Photo';
        const orderId = body.orderId || ('TRD-' + Date.now() + '-' + Math.floor(Math.random() * 1000));

        let qrImageUrl = '';
        let paymentUrl = '';

        // Попытка создать реальный платёж в Finik
        try {
            const finikRes = await createFinikPayment({ amount, orderId, templateTitle });
            qrImageUrl = finikRes.qrImageUrl;
            paymentUrl = finikRes.paymentUrl;
        } catch (finikErr) {
            console.warn('[Finik API Warning] Используем тестовый ELQR генератор, пока не настроен ключ:', finikErr.message);
            // Fallback: формируем ELQR QR код для теста
            const elqrPayload = `https://qr.finik.kg/#orderId=${orderId}&amount=${amount}&title=${encodeURIComponent(templateTitle)}`;
            paymentUrl = elqrPayload;
            qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(elqrPayload)}`;
        }

        const orderInfo = {
            orderId,
            amount,
            templateTitle,
            status: 'PENDING',
            paymentUrl,
            qrImageUrl,
            createdAt: new Date().toISOString()
        };

        // Сохраняем в облако Supabase асинхронно без блокировки ответа
        saveOrderStatus(orderId, orderInfo).catch(e => console.warn('Failed to save order to Supabase:', e.message));

        return res.status(200).json({
            success: true,
            orderId,
            amount,
            status: 'PENDING',
            paymentUrl,
            qrImageUrl
        });
    } catch (err) {
        console.error('Payment create error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
