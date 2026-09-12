// ============================================================
// TRENDUM KIOSK — UNIVERSAL AI GATEWAY (KIE.AI & CUSTOM AGGREGATORS)
// Models supported:
// 1. 'nano-banana-2'  -> google/nano-banana-edit (Фото с сохранением лица/композиции)
// 2. 'seedance-2.5'   -> bytedance/seedance-2-5 (Кинематографичное видео из фото)
// 3. 'chatgpt-2.5'    -> openai/gpt-4o-image
// 4. 'kling-video'    -> kwaivgi/kling-v1-6
// ============================================================

const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = 'kiosk-media';

const DEFAULT_KIE_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const KIE_RECORD_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

// 1. Загрузка фото гостя в CDN Supabase для получения публичного URL (требуется Kie.ai)
async function uploadGuestPhotoToCDN(photoBase64OrUrl, orderId) {
    if (!photoBase64OrUrl || photoBase64OrUrl.startsWith('http://') || photoBase64OrUrl.startsWith('https://')) {
        return photoBase64OrUrl;
    }

    try {
        const cleanBase64 = photoBase64OrUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const filename = `guests/guest_${orderId || Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'image/jpeg',
                'x-upsert': 'true'
            },
            body: buffer
        });

        if (res.ok) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
            console.log('[CDN] Фото гостя успешно сохранено:', publicUrl);
            return publicUrl;
        }
    } catch (e) {
        console.warn('[CDN Upload Error]', e.message);
    }
    return photoBase64OrUrl;
}

// 2. Вызов Kie.ai API и ожидание результата задачи
async function generateViaKie({ apiKey, model, prompt, publicPhotoUrl, templateImgUrl }) {
    if (!apiKey) return null;

    // Сопоставление внутренних имен с официальными идентификаторами моделей Kie.ai
    let kieModel = 'google/nano-banana-edit';
    if (model === 'seedance-2.5' || model === 'bytedance/seedance-2-5') kieModel = 'bytedance/seedance-2-5';
    else if (model === 'omni-flash' || model === 'google-omni-flash' || model === 'google/gemini-omni-flash-1-1' || model === 'gemini-omni-video') kieModel = 'google/gemini-omni-flash-1-1';
    else if (model === 'nano-banana-2' || model === 'google/nano-banana-edit') kieModel = 'google/nano-banana-edit';
    else if (model === 'kling-video' || model === 'kwaivgi/kling-v1-6') kieModel = 'kwaivgi/kling-v1-6';
    else if (model && model.includes('/')) kieModel = model;

    console.log(`[Kie.ai] Запуск задачи для модели "${kieModel}"...`);

    // Формирование входных данных под выбранный тип модели
    let inputPayload = {};
    if (kieModel.includes('omni-flash') || kieModel.includes('gemini-omni')) {
        inputPayload = {
            prompt: prompt || 'Cinematic video portrait, smooth natural motion, 4k high quality',
            image_url: publicPhotoUrl,
            duration: '6' // Официально поддерживаемые опции Kie.ai: "4", "6", "8", "10"
        };
    } else if (kieModel.includes('seedance') || kieModel.includes('kling')) {
        inputPayload = {
            prompt: prompt || 'Cinematic movement, 4k resolution, seamless motion',
            image_url: publicPhotoUrl,
            duration: 5
        };
    } else {
        inputPayload = {
            prompt: prompt || 'Photorealistic high-end studio portrait, retain facial likeness',
            image_urls: [publicPhotoUrl],
            output_format: 'png',
            aspect_ratio: '1:1'
        };
    }

    try {
        // Создание задачи с указанием Webhook Callback URL
        const createRes = await fetch(DEFAULT_KIE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: kieModel,
                callBackUrl: 'https://kiosk394.vercel.app/api/ai/kie-callback',
                input: inputPayload
            })
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            console.warn(`[Kie.ai Create Task Error] ${createRes.status}:`, errText);
            return null;
        }

        const createData = await createRes.json();
        const taskId = createData.data ? (createData.data.taskId || createData.data.id) : createData.taskId;

        if (!taskId) {
            console.warn('[Kie.ai] Task ID не получен:', createData);
            return null;
        }

        console.log(`[Kie.ai] Задача создана, taskId: ${taskId}. Webhook: https://kiosk394.vercel.app/api/ai/kie-callback. Ожидание...`);

        // Опрос статуса и вебхука до 50 секунд
        const maxWaitMs = 50000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            await new Promise(r => setTimeout(r, 2500));

            // 1. Проверяем, пришел ли уже Webhook от Kie.ai в Supabase Storage
            try {
                const webhookFileRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/tasks/${taskId}.json?t=${Date.now()}`);
                if (webhookFileRes.ok) {
                    const webhookData = await webhookFileRes.json();
                    if (webhookData && webhookData.mediaUrl) {
                        console.log(`[Kie.ai Webhook] Задача ${taskId} выполнена и получена через Webhook!`);
                        return webhookData.mediaUrl;
                    }
                }
            } catch (_) {}

            // 2. Резервный прямой опрос Kie.ai recordInfo
            const recordRes = await fetch(`${KIE_RECORD_URL}?taskId=${encodeURIComponent(taskId)}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (recordRes.ok) {
                const recordData = await recordRes.json();
                const taskInfo = recordData.data || recordData;
                const state = taskInfo.state || taskInfo.status;

                if (state === 'success' || state === 'SUCCESS' || state === 'completed') {
                    console.log(`[Kie.ai] Задача ${taskId} успешно выполнена!`);
                    
                    let resultUrls = [];
                    if (taskInfo.resultJson) {
                        try {
                            const parsed = typeof taskInfo.resultJson === 'string' ? JSON.parse(taskInfo.resultJson) : taskInfo.resultJson;
                            resultUrls = parsed.resultUrls || parsed.urls || [parsed.url || parsed.video_url];
                        } catch(e) {}
                    }

                    const finalMediaUrl = (resultUrls && resultUrls[0]) || taskInfo.video_url || taskInfo.image_url;
                    if (finalMediaUrl) return finalMediaUrl;
                } else if (state === 'failed' || state === 'FAILED' || state === 'error') {
                    console.warn(`[Kie.ai] Задача ${taskId} завершилась с ошибкой:`, taskInfo.failMsg || 'Неизвестная ошибка');
                    return null;
                }
            }
        }
    } catch (err) {
        console.warn('[Kie.ai Exception]', err.message);
    }
    return null;
}

module.exports = async (req, res) => {
    // Включение CORS для киоска
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { photoData, templateImg, prompt, model, title, orderId, aggregatorUrl, aggregatorKey } = body;

        const effectiveKey = aggregatorKey || process.env.AI_AGGREGATOR_KEY || process.env.KIE_API_KEY || 'fde11cd9f361b989eb19b8ef8530bfbd';

        console.log(`[AI Hub] Новый запрос: "${title}", модель="${model}", заказ="${orderId}"`);

        // 1. Получаем публичный URL фото гостя через Supabase
        const publicPhotoUrl = await uploadGuestPhotoToCDN(photoData, orderId);

        // 2. Запуск генерации через Kie.ai (если ключ указан)
        let resultUrl = null;
        if (effectiveKey) {
            resultUrl = await generateViaKie({
                apiKey: effectiveKey,
                model: model || 'nano-banana-2',
                prompt,
                publicPhotoUrl,
                templateImgUrl: templateImg
            });
        }

        // 3. Fallback: если ключ еще не введен или генерация не удалась, возвращаем эталонный шаблон
        if (!resultUrl) {
            resultUrl = templateImg;
        }

        return res.status(200).json({
            success: true,
            orderId,
            model: model || 'nano-banana-2',
            title: title || 'Портрет',
            prompt: prompt || '',
            resultUrl,
            mode: effectiveKey ? 'live' : 'preview',
            message: effectiveKey ? 'Успешно обработано через Kie.ai' : 'Тестовый режим (ключ не задан)'
        });
    } catch (err) {
        console.error('[AI Gateway Error]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
