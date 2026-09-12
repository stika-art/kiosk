// ============================================================
// TRENDUM KIOSK — KIE.AI WEBHOOK CALLBACK HANDLER
// Receives task completion events from Kie.ai
// ============================================================

const crypto = require('crypto');

const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = 'kiosk-media';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Signature, X-Webhook-Timestamp');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'active',
            service: 'Kie.ai Webhook Callback Endpoint',
            url: 'https://kiosk394.vercel.app/api/ai/kie-callback'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = req.body || {};
        console.log('[Kie Webhook] Получен callback от Kie.ai:', JSON.stringify(body));

        // Получение данных задачи
        const taskInfo = body.data || body;
        const taskId = taskInfo.taskId || taskInfo.id || body.taskId;
        const state = taskInfo.state || taskInfo.status || body.state;

        if (!taskId) {
            console.warn('[Kie Webhook] Пропущен taskId в теле запроса');
            return res.status(400).json({ code: 400, msg: 'Missing taskId' });
        }

        // Проверка HMAC подписи, если передан секретный ключ
        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const webhookHmacKey = process.env.KIE_WEBHOOK_HMAC_KEY;

        if (webhookHmacKey && signature && timestamp) {
            try {
                const dataToSign = `${taskId}.${timestamp}`;
                const expectedSignature = crypto
                    .createHmac('sha256', webhookHmacKey)
                    .update(dataToSign)
                    .digest('base64');

                if (signature !== expectedSignature) {
                    console.warn('[Kie Webhook] Несовпадение HMAC подписи!');
                    return res.status(401).json({ code: 401, msg: 'Invalid signature' });
                }
                console.log('[Kie Webhook] HMAC подпись успешно верифицирована');
            } catch (sigErr) {
                console.warn('[Kie Webhook Sig Error]', sigErr.message);
            }
        }

        // Извлечение медиа-ссылки из результата
        let mediaUrl = null;
        if (taskInfo.resultJson) {
            try {
                const parsed = typeof taskInfo.resultJson === 'string' ? JSON.parse(taskInfo.resultJson) : taskInfo.resultJson;
                const resultUrls = parsed.resultUrls || parsed.urls || [parsed.url || parsed.video_url];
                if (resultUrls && resultUrls[0]) mediaUrl = resultUrls[0];
            } catch (e) {}
        }
        if (!mediaUrl) {
            mediaUrl = taskInfo.video_url || taskInfo.image_url || body.video_url || body.image_url;
        }

        const taskResult = {
            taskId,
            state: state || 'success',
            mediaUrl,
            updatedAt: new Date().toISOString(),
            raw: taskInfo
        };

        // Сохранение в Supabase Storage (kiosk-media/tasks/${taskId}.json)
        try {
            const path = `tasks/${taskId}.json`;
            await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${path}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'x-upsert': 'true'
                },
                body: JSON.stringify(taskResult)
            });
            console.log(`[Kie Webhook] Результат задачи ${taskId} сохранен в Supabase CDN`);
        } catch (storageErr) {
            console.warn('[Kie Webhook Storage Error]', storageErr.message);
        }

        return res.status(200).json({
            code: 200,
            msg: 'success',
            data: { taskId, state: taskResult.state }
        });
    } catch (err) {
        console.error('[Kie Webhook Handler Error]', err);
        return res.status(500).json({ code: 500, msg: err.message });
    }
};
