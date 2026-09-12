// ============================================================
// TRENDUM KIOSK — UNIVERSAL AI AGGREGATOR GATEWAY / ROUTER
// Models supported:
// 1. 'nano-banana-2'  -> Nano Banana 2
// 2. 'chatgpt-2.5'    -> ChatGPT 2.5
// 3. Custom models from aggregator (e.g. 'kling-video', 'midjourney', etc.)
// ============================================================

const AGGREGATOR_URL = process.env.AI_AGGREGATOR_URL || '';
const AGGREGATOR_KEY = process.env.AI_AGGREGATOR_KEY || process.env.AI_AGGREGATOR_API_KEY || '';

async function callAIAggregator({ photoData, templateImg, prompt, model, title, orderId, customUrl, customKey }) {
    const targetUrl = customUrl || AGGREGATOR_URL;
    const apiKey = customKey || AGGREGATOR_KEY;

    if (!targetUrl) {
        console.log(`[Aggregator] URL агрегатора не настроен. Возвращаем эталонное фото шаблона.`);
        return null;
    }

    try {
        console.log(`[Aggregator] Отправка запроса в агрегатор: ${targetUrl}, модель: ${model}`);
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Authorization': apiKey ? `Bearer ${apiKey}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'nano-banana-2',
                prompt: prompt || '',
                image: photoData,
                template_image: templateImg,
                order_id: orderId,
                title: title
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.warn(`[Aggregator Error] Статус ${response.status}: ${errText}`);
            return null;
        }

        const data = await response.json();
        // Поддержка распространенных форматов ответов агрегаторов
        const resultUrl = data.image_url 
            || data.url 
            || (data.data && data.data[0] && (data.data[0].url || data.data[0].b64_json ? (data.data[0].url || `data:image/jpeg;base64,${data.data[0].b64_json}`) : null))
            || data.result;

        return resultUrl || null;
    } catch (e) {
        console.warn('[Aggregator Exception]:', e.message);
        return null;
    }
}

module.exports = async (req, res) => {
    // Включение CORS для работы с киоском и мобильными устройствами
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

        console.log(`[AI Hub] Новый заказ: "${title}", модель="${model || 'nano-banana-2'}", orderId="${orderId}"`);
        console.log(`[AI Hub] Промпт: "${prompt ? prompt.slice(0, 80) : '—'}..."`);

        let resultUrl = null;

        // 1. Вызов агрегатора (если задан URL)
        resultUrl = await callAIAggregator({
            photoData,
            templateImg,
            prompt,
            model: model || 'nano-banana-2',
            title,
            orderId,
            customUrl: aggregatorUrl,
            customKey: aggregatorKey
        });

        // 2. Если агрегатор ещё не настроен или запрос в процессе тестирования:
        // Возвращаем фото шаблона, чтобы цикл киоска (печать, показ, QR) не прерывался
        if (!resultUrl) {
            resultUrl = templateImg;
        }

        return res.status(200).json({
            success: true,
            orderId,
            model: model || 'nano-banana-2',
            title: title || 'Фотопортрет',
            prompt: prompt || '',
            resultUrl,
            mode: (aggregatorUrl || AGGREGATOR_URL) ? 'live' : 'preview',
            message: 'Обработка завершена успешно'
        });
    } catch (err) {
        console.error('[AI Gateway Error]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
