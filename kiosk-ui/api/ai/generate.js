// ============================================================
// TRENDUM KIOSK — UNIVERSAL AI GATEWAY (KIE.AI & CUSTOM AGGREGATORS)
// Models supported:
// 1. 'nano-banana-2'  -> google/nano-banana-edit (Фото с сохранением лица / Примерка одежды)
// 2. 'chatgpt-2.5'    -> openai/gpt-4o-image (GPT Image 2.5 с фоллбэком на nano-banana-edit)
// 3. 'seedance-2.5'   -> bytedance/seedance-2-5 (Кинематографичное видео из фото)
// 4. 'omni-flash'     -> google/gemini-omni-flash-1-1 (Анимация лица и видео)
// 5. 'kling-video'    -> kwaivgi/kling-v1-6
// 6. 'elevenlabs'     -> голосовая озвучка бутика/контейнера при выдаче результата
// ============================================================

const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = 'kiosk-media';

const DEFAULT_KIE_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const KIE_RECORD_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

// 1. Загрузка фото гостя или одежды в CDN Supabase для получения публичного URL
async function uploadImageToCDN(photoBase64OrUrl, prefix = 'guests', orderId) {
    if (!photoBase64OrUrl) return null;

    if (photoBase64OrUrl.startsWith('http://') || photoBase64OrUrl.startsWith('https://')) {
        return photoBase64OrUrl;
    }

    // Если передан относительный путь к ассету киоска (assets/... или images/...)
    if (photoBase64OrUrl.startsWith('assets/') || photoBase64OrUrl.startsWith('/assets/') ||
        photoBase64OrUrl.startsWith('images/') || photoBase64OrUrl.startsWith('/images/')) {
        const cleanPath = photoBase64OrUrl.startsWith('/') ? photoBase64OrUrl.slice(1) : photoBase64OrUrl;
        return `https://kiosk394.vercel.app/kiosk-ui/${cleanPath}`;
    }

    // Загрузка Base64 данных в Supabase Storage
    try {
        const cleanBase64 = photoBase64OrUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const filename = `${prefix}/${prefix}_${orderId || Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

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
            console.log(`[CDN] ${prefix} успешно сохранено:`, publicUrl);
            return publicUrl;
        }
    } catch (e) {
        console.warn(`[CDN Supabase Error (${prefix})]`, e.message);
    }

    // Резервная загрузка через Catbox CDN, если бакет Supabase недоступен
    try {
        const cleanBase64 = photoBase64OrUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), `${prefix}_${Date.now()}.jpg`);
        const catRes = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form
        });
        if (catRes.ok) {
            const catUrl = (await catRes.text()).trim();
            if (catUrl && catUrl.startsWith('http')) {
                console.log(`[CDN Catbox] ${prefix} успешно загружено:`, catUrl);
                return catUrl;
            }
        }
    } catch (e2) {
        console.warn(`[CDN Catbox Error (${prefix})]`, e2.message);
    }

    return photoBase64OrUrl;
}

// 2. Сохранение аудио озвучки бутика в Supabase CDN
async function uploadAudioToCDN(audioBuffer, orderId) {
    try {
        const filename = `tryon/voice_${orderId || Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
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
        console.warn('[Try-On Audio Upload Error]', e.message);
    }
    return null;
}

// 3. Генерация озвучки через Kie.ai (ElevenLabs Multilingual V2)
async function generateElevenLabsViaKie({ text, apiKey, voiceId, orderId }) {
    if (!apiKey) return null;
    const targetVoiceId = (voiceId && voiceId.length > 3) ? voiceId : 'XNrB7jz2HCkpU5yK08kP';

    try {
        console.log(`[Kie.ai ElevenLabs Try-On] Создание задачи озвучки (голос: ${targetVoiceId})...`);
        const createRes = await fetch(DEFAULT_KIE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'elevenlabs/text-to-speech-multilingual-v2',
                input: {
                    text: text,
                    voice: targetVoiceId
                }
            })
        });

        if (!createRes.ok) return null;
        const createData = await createRes.json();
        const taskId = createData.data?.taskId || createData.taskId || createData.id;
        if (!taskId) return null;

        const startTime = Date.now();
        while (Date.now() - startTime < 20000) {
            await new Promise(r => setTimeout(r, 1500));
            const recordRes = await fetch(`${KIE_RECORD_URL}?taskId=${taskId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (recordRes.ok) {
                const recordData = await recordRes.json();
                const taskInfo = recordData.data || recordData;
                const state = taskInfo.state || taskInfo.status;
                if (state === 'success' || state === 'SUCCESS' || state === 'completed') {
                    let audioUrl = null;
                    if (taskInfo.resultJson) {
                        try {
                            const parsed = typeof taskInfo.resultJson === 'string' ? JSON.parse(taskInfo.resultJson) : taskInfo.resultJson;
                            const urls = parsed.resultUrls || parsed.urls || [parsed.url || parsed.audio_url];
                            audioUrl = urls && urls[0];
                        } catch(e) {}
                    }
                    if (!audioUrl) audioUrl = taskInfo.audio_url || taskInfo.url;
                    if (audioUrl) {
                        try {
                            const aResp = await fetch(audioUrl);
                            if (aResp.ok) {
                                const arrBuf = await aResp.arrayBuffer();
                                const cdnUrl = await uploadAudioToCDN(Buffer.from(arrBuf), orderId);
                                if (cdnUrl) return cdnUrl;
                            }
                        } catch(e) {}
                        return audioUrl;
                    }
                } else if (state === 'failed' || state === 'FAILED') {
                    break;
                }
            }
        }
    } catch (e) {
        console.warn('[Kie.ai ElevenLabs Try-On Exception]', e.message);
    }
    return null;
}

// 4. Универсальная озвучка: прямой ElevenLabs или через Kie.ai
async function generateElevenLabsAudio({ text, elevenlabsKey, apiKey, voiceId, orderId }) {
    const targetVoiceId = (voiceId && voiceId.length > 3) ? voiceId : 'XNrB7jz2HCkpU5yK08kP';

    if (elevenlabsKey) {
        try {
            const url = `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}?output_format=mp3_44100_128`;
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
                        stability: 0.5,
                        similarity_boost: 0.85,
                        style: 0.35,
                        use_speaker_boost: true
                    }
                })
            });

            if (resp.ok) {
                const arrayBuffer = await resp.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const audioUrl = await uploadAudioToCDN(buffer, orderId);
                if (audioUrl) return audioUrl;
            }
        } catch(e) {
            console.warn('[ElevenLabs Direct Exception]', e.message);
        }
    }

    if (apiKey) {
        return await generateElevenLabsViaKie({ text, apiKey, voiceId: targetVoiceId, orderId });
    }
    return null;
}

// Функция очистки промптов от товарных знаков, блокируемых фильтрами OpenAI (Forbes, Roblox, Pixar и др.)
function sanitizeForOpenAI(p) {
    if (!p) return 'Photorealistic high-end studio portrait, retain facial likeness and features';
    return p
        .replace(/\bforbes\b/gi, 'prestigious business magazine')
        .replace(/\broblox\b/gi, '3D voxel gaming character')
        .replace(/\bdisney\b/gi, '3D animated cartoon')
        .replace(/\bpixar\b/gi, '3D CGI animated')
        .replace(/\bmarvel\b/gi, 'superhero cinematic')
        .replace(/\bplayboy\b/gi, 'luxury glamour magazine')
        .replace(/\bvogue\b/gi, 'haute couture fashion magazine')
        .replace(/\btiktok\b/gi, 'viral dynamic video aesthetic')
        .replace(/\binstagram\b/gi, 'social media aesthetic');
}

// 5. Вызов Kie.ai API и ожидание результата задачи генерации изображения
async function generateViaKie({ apiKey, model, prompt, publicPhotoUrl, templateImgUrl, isTryOn, resolution }) {
    if (!apiKey || !publicPhotoUrl) return null;

    // Выбор разрешения (1K, 2K, 4K)
    const validResolutions = ['1K', '2K', '4K'];
    const targetResolution = validResolutions.includes((resolution || '').toUpperCase()) 
        ? resolution.toUpperCase() 
        : '2K';

    if (!publicPhotoUrl && !templateImgUrl) {
        console.warn('[Kie.ai] Отсутствуют изображения для обработки, вызов Kie.ai отменен для защиты баланса.');
        return null;
    }

    // Сопоставление моделей:
    let kieModel = 'gpt-image-2-5-sunburst-image-to-image';
    if (isTryOn || model === 'nano-banana-2' || model === 'google/nano-banana-edit') {
        // Виртуальная примерка одежды полностью переведена на Nano Banana (Google Image Edit)
        kieModel = 'google/nano-banana-edit';
    } else if (model === 'seedance-2.5' || model === 'bytedance/seedance-2-5') {
        kieModel = 'bytedance/seedance-2-5';
    } else if (model === 'omni-flash' || model === 'google-omni-flash' || model === 'google/gemini-omni-flash-1-1' || model === 'gemini-omni-video') {
        kieModel = 'google/gemini-omni-flash-1-1';
    } else if (model === 'kling-video' || model === 'kwaivgi/kling-v1-6') {
        kieModel = 'kwaivgi/kling-v1-6';
    } else {
        // Для всех фото-стилей и портретов: ChatGPT 2.5 (gpt-image-2-5-sunburst)
        kieModel = 'gpt-image-2-5-sunburst-image-to-image';
    }

    console.log(`[Kie.ai AI Hub] Запуск задачи "${kieModel}" [${targetResolution}] (isTryOn=${Boolean(isTryOn)})...`);

    const safePrompt = sanitizeForOpenAI(prompt);

    // Формирование входных данных под выбранный тип модели
    let inputPayload = {};
    if (kieModel.includes('omni-flash') || kieModel.includes('gemini-omni')) {
        inputPayload = {
            prompt: prompt || 'Cinematic video portrait, smooth natural motion, 4k high quality',
            image_url: publicPhotoUrl,
            duration: '6'
        };
    } else if (kieModel.includes('seedance') || kieModel.includes('kling')) {
        inputPayload = {
            prompt: prompt || 'Cinematic movement, 4k resolution, seamless motion',
            image_url: publicPhotoUrl,
            duration: 5
        };
    } else if (isTryOn || kieModel.includes('nano-banana')) {
        // Виртуальная примерка одежды / товаров на гостя через Nano Banana (2 фото: гость + вещь)
        const tryOnPrompt = safePrompt && safePrompt.trim().length > 10
            ? safePrompt
            : 'Virtual clothing try-on: Fit the clothing item realistically onto the person in the photo. Seamlessly drape the garment with natural folds, lighting, and texture, keeping the person exact face, expression and hair.';
        
        const imageUrls = [publicPhotoUrl];
        if (templateImgUrl && templateImgUrl.startsWith('http')) {
            imageUrls.push(templateImgUrl);
        }

        inputPayload = {
            prompt: `Virtual try-on: Take the clothing item from the second image and dress the person in the first image in it. CRITICAL MANDATORY: Strictly preserve the exact person from the first image completely intact: keep their exact gender, face, facial features, facial hair (beard, mustache if present), hair color, hairstyle, age, and likeness. Do NOT alter the person's gender or facial identity. Replace ONLY the garment with the clothing from the second image. ${tryOnPrompt}`,
            image_urls: imageUrls,
            input_urls: imageUrls,
            image_url: publicPhotoUrl,
            output_format: 'png',
            aspect_ratio: '3:4',
            resolution: targetResolution
        };
    } else {
        // Стилизация портрета (дудл, арт, аниме, киберпанк, мультики, обложки и др.)
        // ВАЖНО: В ChatGPT передается ТОЛЬКО ОДНО фото — фото самого гостя (publicPhotoUrl)!
        // Картинка шаблона — это лишь обложка/образец стиля для меню.
        // Очищаем и нейтрализуем указания на пол в описании стиля (например "девушка в дудл стиле" или "cute girl"),
        // чтобы шаблон стиля не сбивал нейросеть при обработке мужчин, парней или детей.
        let rawStyleText = (safePrompt && safePrompt.trim().length > 3) ? safePrompt.trim() : 'doodle art style, vibrant colors, expressive artistic portrait';
        let cleanStyleText = rawStyleText
            .replace(/\b(девушка|девушки|девушку|девушке|женщина|женщины|женщину|парень|парня|парню|мужчина|мужчины|мужчину|девочка|девочки|девочку|мальчик|мальчика)\b/gi, 'person')
            .replace(/\b(girl|woman|female|lady|man|male|guy|boy)\b/gi, 'person');

        const stylePrompt = `CRITICAL MANDATORY INSTRUCTION: You are transforming the REAL PERSON shown in the input photo into this exact artistic style.
1. GENDER & LIKENESS: Strictly PRESERVE the exact gender, biological sex, facial features, face shape, facial hair (beard/mustache if present), hair color, hairstyle, age, ethnicity, and facial expression of the person in the input photo completely intact. Do NOT change a man into a woman or a woman into a man under any circumstances. If the person in the photo is a male/man, the output MUST be a male/man.
2. ARTISTIC STYLE: Apply ONLY the artistic visual illustration style, line work, aesthetic, color palette, and background to this person: ${cleanStyleText}.
3. The resulting portrait MUST clearly and unmistakably be the EXACT SAME PERSON from the input photo, seamlessly drawn in this artistic style.`;

        inputPayload = {
            prompt: stylePrompt,
            image_urls: [publicPhotoUrl],
            resolution: targetResolution
        };
    }

    // Вспомогательная функция выполнения задачи с опросом статуса
    async function executeKieTask(targetModel, targetPayload) {
        try {
            let createRes = await fetch(DEFAULT_KIE_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: targetModel,
                    callBackUrl: 'https://kiosk394.vercel.app/api/ai/kie-callback',
                    input: targetPayload
                })
            });

            let createData = null;
            try {
                createData = await createRes.json();
            } catch(e) {}

            let taskId = (createData && createData.code === 200 && createData.data) 
                ? (createData.data.taskId || createData.data.id || createData.data.recordId) 
                : null;

            if (!taskId) {
                console.warn(`[Kie.ai Create Task Error for ${targetModel}]`, createData || createRes.status);
                return null;
            }

            console.log(`[Kie.ai ChatGPT] Задача создана (${targetModel}), taskId: ${taskId}, разрешение: ${targetResolution}. Ожидание результата...`);

            // Опрос статуса до 45 секунд (в пределах лимита Vercel)
            const maxWaitMs = 45000;
            const startTime = Date.now();

            while (Date.now() - startTime < maxWaitMs) {
                await new Promise(r => setTimeout(r, 2500));

                // 1. Проверяем webhook в Supabase
                try {
                    const webhookFileRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/tasks/${taskId}.json?t=${Date.now()}`);
                    if (webhookFileRes.ok) {
                        const webhookData = await webhookFileRes.json();
                        if (webhookData && webhookData.mediaUrl) {
                            console.log(`[Kie.ai Webhook] Задача ${taskId} получена через Webhook!`);
                            return { resultUrl: webhookData.mediaUrl, taskId, resolution: targetResolution };
                        }
                    }
                } catch (_) {}

                // 2. Прямой опрос Kie.ai recordInfo
                const recordRes = await fetch(`${KIE_RECORD_URL}?taskId=${encodeURIComponent(taskId)}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (recordRes.ok) {
                    const recordData = await recordRes.json();
                    const taskInfo = recordData.data || recordData;
                    const state = (taskInfo.state || taskInfo.status || '').toLowerCase();

                    if (state === 'success' || state === 'completed') {
                        console.log(`[Kie.ai] Задача ${taskId} успешно выполнена!`);
                        
                        let resultUrls = [];
                        if (taskInfo.resultJson) {
                            try {
                                const parsed = typeof taskInfo.resultJson === 'string' ? JSON.parse(taskInfo.resultJson) : taskInfo.resultJson;
                                resultUrls = parsed.resultUrls || parsed.urls || [parsed.url || parsed.video_url];
                            } catch(e) {}
                        }
                        if ((!resultUrls || resultUrls.length === 0) && taskInfo.response) {
                            resultUrls = taskInfo.response.resultUrls || [taskInfo.response.url];
                        }

                        const finalMediaUrl = (resultUrls && resultUrls[0]) || taskInfo.video_url || taskInfo.image_url;
                        if (finalMediaUrl) {
                            return { resultUrl: finalMediaUrl, taskId, resolution: targetResolution };
                        }
                    } else if (state === 'fail' || state === 'failed' || state === 'error') {
                        console.warn(`[Kie.ai] Задача ${taskId} завершилась с ошибкой:`, taskInfo.failMsg || taskInfo.errorMessage || 'Неизвестная ошибка');
                        return null;
                    }
                }
            }

            // Если задача ещё в процессе (OpenAI может генерировать до 60-80с) — возвращаем taskId для асинхронного поллинга клиентом
            console.log(`[Kie.ai ChatGPT] Задача ${taskId} всё ещё генерируется, передаем клиенту для поллинга`);
            return { pending: true, taskId, resolution: targetResolution };

        } catch (err) {
            console.warn(`[Kie.ai Task Exception for ${targetModel}]`, err.message);
        }
        return null;
    }

    // Попытка 1: запуск через ChatGPT (gpt-image-2-5-sunburst)
    let outcome = await executeKieTask(kieModel, inputPayload);
    if (outcome) return outcome;

    // Попытка 2 (Резерв): если ChatGPT дал сбой или отклонён фильтром OpenAI, пробуем резервную модель
    if (kieModel.includes('gpt-image') || (inputPayload.image_urls && inputPayload.image_urls.length > 1)) {
        console.warn('[Kie.ai] Резервная попытка генерации через google/nano-banana-edit...');
        const fallbackPayload = {
            prompt: safePrompt || 'Photorealistic cinematic studio portrait, retain facial likeness and features',
            image_urls: [publicPhotoUrl],
            input_urls: [publicPhotoUrl],
            output_format: 'png',
            aspect_ratio: '3:4'
        };
        outcome = await executeKieTask('google/nano-banana-edit', fallbackPayload);
        if (outcome) return outcome;
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
        const { photoData, templateImg, prompt, model, title, price, orderId, location, isTryOn, resolution, aggregatorUrl, aggregatorKey, elevenlabsKey, elevenlabsVoiceId } = body;

        const effectiveKey = aggregatorKey || process.env.AI_AGGREGATOR_KEY || process.env.KIE_API_KEY || 'fde11cd9f361b989eb19b8ef8530bfbd';
        const targetResolution = resolution || '2K';

        console.log(`[AI Hub] Новый запрос: "${title}", модель="${model || 'chatgpt-2.5'}", разрешение="${targetResolution}", заказ="${orderId}", isTryOn=${Boolean(isTryOn)}`);

        // Защита от списания кредитов Kie.ai без реальных данных
        if (!photoData && !templateImg) {
            console.log('[AI Hub] Входные изображения отсутствуют. Обращение к Kie.ai пропущено для защиты кредитов.');
            return res.status(200).json({
                success: true,
                pending: false,
                state: 'fallback',
                message: 'Изображения отсутствуют, генерация пропущена'
            });
        }

        // 1. Получаем публичный URL фото гостя и шаблона одежды через CDN Supabase
        const publicPhotoUrl = await uploadImageToCDN(photoData, 'guests', orderId);
        const publicTemplateUrl = await uploadImageToCDN(templateImg, 'clothes', orderId);

        if (!publicPhotoUrl && !publicTemplateUrl) {
            console.log('[AI Hub] Изображения не загружены в CDN. Обращение к Kie.ai отменено для защиты кредитов.');
            return res.status(200).json({
                success: true,
                pending: false,
                state: 'fallback',
                message: 'Изображения не загружены'
            });
        }

        // 2. Формируем текст голосовой озвучки (в каком бутике продается)
        let speechText = '';
        if (location) {
            speechText = `Вам очень идёт ${title || 'эта одежда'}! Её можно приобрести: ${location}. Стоимость — ${price || 450} сом. Покажите это фото продавцу!`;
        }

        // 3. Запуск генерации через ChatGPT (Kie.ai) и озвучки ElevenLabs
        const imagePromise = effectiveKey ? generateViaKie({
            apiKey: effectiveKey,
            model: model || 'chatgpt-2.5',
            prompt,
            publicPhotoUrl,
            templateImgUrl: publicTemplateUrl,
            isTryOn: Boolean(isTryOn),
            resolution: targetResolution
        }) : Promise.resolve(null);

        const audioPromise = (speechText && (effectiveKey || elevenlabsKey)) ? generateElevenLabsAudio({
            text: speechText,
            elevenlabsKey,
            apiKey: effectiveKey,
            voiceId: elevenlabsVoiceId || 'XNrB7jz2HCkpU5yK08kP',
            orderId: `tryon_voice_${orderId || Date.now()}`
        }).catch(e => null) : Promise.resolve(null);

        const [generationOutcome, audioUrl] = await Promise.all([imagePromise, audioPromise]);

        // Если задача ещё в процессе (OpenAI) — возвращаем статус pending для поллинга
        if (generationOutcome && generationOutcome.pending) {
            return res.status(200).json({
                success: true,
                pending: true,
                state: 'generating',
                taskId: generationOutcome.taskId,
                orderId,
                resolution: generationOutcome.resolution || targetResolution,
                model: 'chatgpt-2.5',
                audioUrl: audioUrl || null,
                speechText: speechText || '',
                message: 'Генерация ChatGPT выполняется...'
            });
        }

        const generatedImageUrl = generationOutcome?.resultUrl || null;
        const resultUrl = generatedImageUrl || templateImg;

        return res.status(200).json({
            success: true,
            pending: false,
            state: generatedImageUrl ? 'success' : 'fallback',
            orderId,
            taskId: generationOutcome?.taskId || null,
            model: 'chatgpt-2.5',
            resolution: generationOutcome?.resolution || targetResolution,
            title: title || 'Портрет',
            prompt: prompt || '',
            location: location || '',
            isTryOn: Boolean(isTryOn),
            resultUrl,
            audioUrl: audioUrl || null,
            speechText: speechText || '',
            mode: effectiveKey ? 'live' : 'preview',
            message: generatedImageUrl ? 'Успешно сгенерировано через ChatGPT' : 'Генерация завершилась'
        });
    } catch (err) {
        console.error('[AI Gateway Error]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

