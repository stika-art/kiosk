// ============================================================
// TRENDUM KIOSK — ROAST & STANDUP COMIC ENGINE
// 1. GPT Vision: остроумный стендап-анализ фото + генерация промпта
// 2. GPT Image 2.5: генерация гротескной карикатуры (Kie.ai chatgpt-2.5)
// 3. ElevenLabs: живая эмоциональная озвучка со вздохами и смешками
// ============================================================

const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = 'kiosk-media';

const DEFAULT_KIE_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const KIE_RECORD_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

// Дефолтный Voice ID в ElevenLabs для дерзкого мужского голоса стендапера
const DEFAULT_ELEVEN_VOICE_ID = 'ErXwobaYiN019PkySvjV';

// 1. Загрузка фото гостя в CDN Supabase Storage
async function uploadGuestPhotoToCDN(photoBase64OrUrl, orderId) {
    if (!photoBase64OrUrl || photoBase64OrUrl.startsWith('http://') || photoBase64OrUrl.startsWith('https://')) {
        return photoBase64OrUrl;
    }

    try {
        const cleanBase64 = photoBase64OrUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const filename = `guests/roast_${orderId || Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

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
            return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
        }
    } catch (e) {
        console.warn('[Roast CDN Upload Error]', e.message);
    }
    return photoBase64OrUrl;
}

// 2. Сохранение сгенерированного ElevenLabs аудио в CDN
async function uploadAudioToCDN(audioBuffer, orderId) {
    try {
        const filename = `roasts/audio_${orderId || Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'audio/mpeg',
                'x-upsert': 'true'
            },
            body: audioBuffer
        });
        if (res.ok) {
            return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
        }
    } catch (e) {
        console.warn('[Roast Audio Upload Error]', e.message);
    }
    return null;
}

// 3. Fallback пул остроумных шуток с локальным колоритом (если OpenAI ключ не задан)
function getFallbackRoast(publicPhotoUrl) {
    const fallbacks = [
        {
            roast_title: "ОХРАННИК ПАКЕТОВ ИЗ ZARA",
            roast_text: "Так... [sigh] взгляд человека, который зашёл в молл просто погреться, но случайно взял латте в рассрочку... [chuckle] Пафоса на лице на миллион долларов, а в кармане ровно на проезд на маршрутке.",
            charisma_percent: 18,
            main_flaw: "Аура рассрочки MBank",
            mall_status: "Эксперт по фудкорту",
            caricature_prompt: "A satirical caricature portrait based on input photo, wearing an insanely oversized puffy designer jacket, holding 6 giant colorful shopping bags, exaggerated dramatic model expression, colorful cartoon pop-art style, bright studio lighting 8k"
        },
        {
            roast_title: "МАГИСТР БЕСЦЕЛЬНОГО ШОПИНГА",
            roast_text: "Оу... [chuckle] этот взгляд! Попытка скопировать фотосессию GQ перед камерой фотобудки удалась... ну, процента на четыре. [sigh] Зато уверенности хватит, чтобы открыть свой бутик на Дордое прямо сейчас!",
            charisma_percent: 24,
            main_flaw: "Лук с рынка под видом ЦУМа",
            mall_status: "Пришел ради зеркала и вайфая",
            caricature_prompt: "A hilarious caricature based on input photo, dramatic confident pose with sunglasses indoors, ridiculously huge designer coffee cup with a giant straw, recognizable face, colorful editorial cartoon caricature style"
        },
        {
            roast_title: "ГЛАВНЫЙ БОСС ЭСКАЛАТОРА",
            roast_text: "Ну что за поза... [chuckle] Такое ощущение, что ты только что вышел из банка после одобрения кредита и идёшь праздновать комбо-обедом на третьем этаже. [sigh] Держись, звезда молла!",
            charisma_percent: 14,
            main_flaw: "Слишком серьезные щи в ТЦ",
            mall_status: "Король бесплатной дегустации",
            caricature_prompt: "A funny satirical caricature based on input photo, wearing a comically fancy tuxedo jacket with flip flops, standing majestically in a mall food court, exaggerated funny expression, vivid colors, photorealistic caricature render"
        },
        {
            roast_title: "КРИПТОИНВЕСТОР НА ФУДКОРТЕ",
            roast_text: "Так, внимание... [sigh] Лицо человека, который проверяет баланс карты Kaspi и делает вид, что просто экран бликует... [chuckle] Очки в помещении — чтобы никто не видел эти полные надежды глаза!",
            charisma_percent: 12,
            main_flaw: "Скрывает баланс карты",
            mall_status: "Заблудился в поисках туалета",
            caricature_prompt: "A satirical caricature based on input photo, holding a tiny glowing crypto chart on smartphone with panic in eyes, funny oversized sunglasses, humorous editorial caricature art style 8k"
        }
    ];

    const pick = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return pick;
}

// 4. Генерация текста и динамического промпта через GPT Vision
async function analyzePhotoWithGptVision({ photoUrl, openaiKey }) {
    if (!openaiKey) {
        return getFallbackRoast(photoUrl);
    }

    const systemPrompt = `Ты — остроумный, добродушный стендап-комик и судья моды в фотобудке премиального ТЦ (Бишкек / Алматы).
Твоя задача — сделать короткую, уморительную и дерзкую «прожарку» (roast) человека по его фотографии, строго в рамках дружеского юмора (без мата, без токсичности).

СТРОЖАЙШИЕ ЗАПРЕТЫ (TABOO):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО шутить про: здоровье, инвалидность, дефекты тела, зубы, кожу, вес, рост, расу, национальность или религию.
- Шути ТОЛЬКО про: позу, выражение лица («взгляд потерявшегося в молле», пафосный прищур перед камерой), одежду (оверсайз, бренды, капюшон в тепле), шопинг в ТЦ, кредиты/рассрочки (MBank, Kaspi, Optima), фудкорт, бесцельные прогулки.

ВАЖНО ДЛЯ ОЗВУЧКИ ELEVENLABS:
В тексте обязательно расставляй маркеры живых эмоций комика:
- Паузы троеточиями: "..."
- Вздохи: "[sigh]"
- Смешки и усмешки: "[chuckle]" или "[laugh]"
Это заставит синтезатор речи звучать максимально живо и эмоционально!

ПРАВИЛО РАЗНООБРАЗИЯ:
Всегда создавай полностью уникальный текст и уникальный английский промпт для карикатуры! Не повторяй шаблонные фразы.

ФОРМАТ ВЫВОДА — СТРОГО ВАЛИДНЫЙ JSON:
{
  "roast_title": "Короткий панч-заголовок (до 4 слов)",
  "roast_text": "Текст прожарки со вздохами и смешками (2-3 предложения, до 220 знаков)",
  "charisma_percent": целое_число_от_5_до_45,
  "main_flaw": "Шуточный грех лука (до 5 слов)",
  "mall_status": "Шуточный статус в ТЦ (до 5 слов)",
  "caricature_prompt": "Детальный персональный промпт на английском для генерации карикатуры в GPT Image 2.5 на базе внешности и одежды гостя"
}`;

    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.88,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Проанализируй этого гостя фотобудки в ТЦ и выдай смешную стендап-прожарку с карикатурным промптом.' },
                            { type: 'image_url', image_url: { url: photoUrl } }
                        ]
                    }
                ],
                max_tokens: 600
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            const rawContent = data.choices[0].message.content;
            return JSON.parse(rawContent);
        } else {
            console.warn('[Vision API Error]', await resp.text());
        }
    } catch (e) {
        console.warn('[Vision Exception]', e.message);
    }

    return getFallbackRoast(photoUrl);
}

// 5. Генерация карикатуры через GPT Image 2.5 (Kie.ai chatgpt-2.5)
async function generateCaricatureViaGptImage({ apiKey, publicPhotoUrl, caricaturePrompt }) {
    if (!apiKey) return publicPhotoUrl;

    const fullPrompt = caricaturePrompt || 'A satirical editorial meme caricature portrait based on input photo, exaggerated funny facial expression, recognizable face, comic roast style, ridiculous stylish outfit in a shopping mall, vibrant colors, photorealistic render 8k';

    try {
        const createRes = await fetch(DEFAULT_KIE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/nano-banana-edit',
                callBackUrl: 'https://kiosk394.vercel.app/api/ai/kie-callback',
                input: {
                    prompt: fullPrompt,
                    image_urls: [publicPhotoUrl],
                    output_format: 'png',
                    aspect_ratio: '9:16'
                }
            })
        });

        if (!createRes.ok) {
            console.warn('[GPT Image Create Task Error]', await createRes.text());
            return publicPhotoUrl;
        }

        const createData = await createRes.json();
        const taskId = createData.data ? (createData.data.taskId || createData.data.id) : createData.taskId;
        if (!taskId) return publicPhotoUrl;

        // Ожидание результата до 40 секунд
        const maxWaitMs = 40000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            await new Promise(r => setTimeout(r, 2500));

            // Проверка Supabase Webhook
            try {
                const webhookFileRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/tasks/${taskId}.json?t=${Date.now()}`);
                if (webhookFileRes.ok) {
                    const webhookData = await webhookFileRes.json();
                    if (webhookData && webhookData.mediaUrl) {
                        return webhookData.mediaUrl;
                    }
                }
            } catch (_) {}

            // Проверка recordInfo
            const recordRes = await fetch(`${KIE_RECORD_URL}?taskId=${encodeURIComponent(taskId)}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (recordRes.ok) {
                const recordData = await recordRes.json();
                const taskInfo = recordData.data || recordData;
                const state = taskInfo.state || taskInfo.status;

                if (state === 'success' || state === 'SUCCESS' || state === 'completed') {
                    let resultUrls = [];
                    if (taskInfo.resultJson) {
                        try {
                            const parsed = typeof taskInfo.resultJson === 'string' ? JSON.parse(taskInfo.resultJson) : taskInfo.resultJson;
                            resultUrls = parsed.resultUrls || parsed.urls || [parsed.url || parsed.image_url];
                        } catch(e) {}
                    }
                    const finalMediaUrl = (resultUrls && resultUrls[0]) || taskInfo.image_url;
                    if (finalMediaUrl) return finalMediaUrl;
                } else if (state === 'failed' || state === 'FAILED') {
                    break;
                }
            }
        }
    } catch (e) {
        console.warn('[GPT Image Exception]', e.message);
    }

    return publicPhotoUrl;
}

// 6. Генерация эмоциональной озвучки через ElevenLabs API
async function generateElevenLabsAudio({ text, elevenlabsKey, voiceId, orderId }) {
    if (!elevenlabsKey) return null;

    const targetVoiceId = voiceId || DEFAULT_ELEVEN_VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}?output_format=mp3_44100_128`;

    try {
        console.log(`[ElevenLabs] Генерация озвучки для голоса ${targetVoiceId}...`);

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': elevenlabsKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.35,        // Низкая стабильность = максимальная экспрессия и эмоции
                    similarity_boost: 0.85, // Четкость тембра
                    style: 0.55,            // Стилизация под естественную разговорную речь
                    use_speaker_boost: true
                }
            })
        });

        if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const audioUrl = await uploadAudioToCDN(buffer, orderId);
            console.log('[ElevenLabs] Аудио успешно сгенерировано и сохранено:', audioUrl);
            return audioUrl;
        } else {
            console.warn('[ElevenLabs API Error]', resp.status, await resp.text());
        }
    } catch (e) {
        console.warn('[ElevenLabs Exception]', e.message);
    }

    return null;
}

// ОСНОВНОЙ ОБРАБОТЧИК ЭНДПОИНТА
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { photoData, orderId, aggregatorKey, elevenlabsKey, elevenlabsVoiceId, openaiKey } = body;

        const effectiveOrderId = orderId || ('roast-' + Date.now());
        const effectiveAggregatorKey = aggregatorKey || process.env.AI_AGGREGATOR_KEY || process.env.KIE_API_KEY || 'fde11cd9f361b989eb19b8ef8530bfbd';
        const effectiveElevenKey = elevenlabsKey || process.env.ELEVENLABS_API_KEY || '';
        const effectiveOpenaiKey = openaiKey || process.env.OPENAI_API_KEY || '';

        console.log(`[Roast Hub] Запуск прожарки для заказа ${effectiveOrderId}...`);

        // 1. Загрузка фото гостя в CDN
        const publicPhotoUrl = await uploadGuestPhotoToCDN(photoData, effectiveOrderId);

        // 2. Vision анализ и генерация текста прожарки + уникального карикатурного промпта
        const roastData = await analyzePhotoWithGptVision({
            photoUrl: publicPhotoUrl,
            openaiKey: effectiveOpenaiKey
        });

        // 3. Параллельный запуск генерации карикатуры (GPT Image 2.5) и озвучки (ElevenLabs)
        const [caricatureUrl, audioUrl] = await Promise.all([
            generateCaricatureViaGptImage({
                apiKey: effectiveAggregatorKey,
                publicPhotoUrl,
                caricaturePrompt: roastData.caricature_prompt
            }),
            generateElevenLabsAudio({
                text: roastData.roast_text,
                elevenlabsKey: effectiveElevenKey,
                voiceId: elevenlabsVoiceId,
                orderId: effectiveOrderId
            })
        ]);

        return res.status(200).json({
            success: true,
            orderId: effectiveOrderId,
            title: roastData.roast_title,
            text: roastData.roast_text,
            charisma: roastData.charisma_percent || 15,
            flaw: roastData.main_flaw || 'Аура рассрочки MBank',
            mallStatus: roastData.mall_status || 'Эксперт по фудкорту',
            caricaturePrompt: roastData.caricature_prompt,
            imageUrl: caricatureUrl || publicPhotoUrl,
            originalPhotoUrl: publicPhotoUrl,
            audioUrl: audioUrl,
            hasAudio: Boolean(audioUrl)
        });
    } catch (err) {
        console.error('[Roast Server Error]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};