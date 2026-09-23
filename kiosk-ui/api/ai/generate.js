// ============================================================
// TRENDUM KIOSK — UNIVERSAL AI GATEWAY (KIE.AI & CUSTOM AGGREGATORS)
// Models supported:
// 1. 'nano-banana-2'  -> google/nano-banana-edit (Фото с сохранением лица / Примерка одежды)
// 2. 'chatgpt-2.5'    -> gpt-image-2-image-to-image (Базовый GPT Image 2)
// 3. 'omni-flash'     -> gemini-omni-video (Google Gemini Omni Flash — Video-to-Video)
// 4. 'kling-turbo'    -> kling/v2-5-turbo-image-to-video (Ультра-быстрая генерация видео из фото)
// 5. 'kling-video'    -> kling-2.6/image-to-video (Высокодетализированное видео из фото)
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

    const isVideo = photoBase64OrUrl.startsWith('data:video/') || prefix === 'videos';
    const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
    const ext = isVideo ? 'mp4' : 'jpg';

    const cleanBase64 = photoBase64OrUrl.replace(/^data:(image|video)\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeFilename = `${prefix}_${orderId || Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    // 1. ПРИОРИТЕТ: Собственное хранилище Supabase Storage (100% прямое оригинальное качество, всегда доступно, без редиректов и HTML)
    try {
        const filePath = `${prefix}/${safeFilename}`;
        const supaRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filePath}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': mimeType,
                'x-upsert': 'true'
            },
            body: buffer
        });

        if (supaRes.ok) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filePath}`;
            console.log(`[CDN Supabase] ${prefix} успешно загружено в оригинальном качестве:`, publicUrl);
            return publicUrl;
        } else {
            console.warn(`[CDN Supabase Warning (${prefix})] Status:`, supaRes.status);
        }
    } catch (e) {
        console.warn(`[CDN Supabase Error (${prefix})]`, e.message);
    }

    // 2. Резервный Catbox CDN (только прямые ссылки)
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', new Blob([buffer], { type: mimeType }), safeFilename);
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

// 2b. Перенос готового результата генерации из сторонних CDN (Kie.ai/aiquickdraw) в собственный чистый Supabase CDN
// Полностью исключает домены "aiquickdraw" и "chatgpt", гарантируя брендированные чистые ссылки и вечное хранение
async function persistResultToSupabase(mediaUrl, orderId, isVideo = false) {
    if (!mediaUrl || typeof mediaUrl !== 'string') return mediaUrl;
    if (mediaUrl.includes('supabase.co')) return mediaUrl;

    try {
        console.log(`[CDN Supabase] Скачивание готового результата из внешнего источника (${mediaUrl.slice(0, 50)}...) в Supabase Storage...`);
        const resp = await fetch(mediaUrl);
        if (!resp.ok) {
            console.warn(`[CDN Supabase] Не удалось скачать результат: HTTP ${resp.status}`);
            return mediaUrl;
        }

        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const isVid = isVideo || mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || (resp.headers.get('content-type') || '').includes('video');
        const ext = isVid ? 'mp4' : 'png';
        const mimeType = isVid ? 'video/mp4' : 'image/png';
        const safeOrder = (orderId || Date.now()).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `results/trendum_${safeOrder}_${Math.random().toString(36).substring(7)}.${ext}`;

        const supaRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': mimeType,
                'x-upsert': 'true'
            },
            body: buffer
        });

        if (supaRes.ok) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
            console.log(`[CDN Supabase] Результат сохранен в чистый Supabase CDN:`, publicUrl);
            return publicUrl;
        } else {
            console.warn(`[CDN Supabase Warning] Ошибка сохранения результата:`, supaRes.status);
        }
    } catch (e) {
        console.warn(`[CDN Supabase Persistence Error]`, e.message);
    }
    return mediaUrl;
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
async function generateViaKie({ apiKey, model, prompt, publicPhotoUrl, guestVideoUrl, templateImgUrl, isTryOn, resolution, orderId }) {
    if (!apiKey || (!publicPhotoUrl && !guestVideoUrl)) return null;

    // Разрешение: строго 1K для ультра-быстрой генерации 5-8 сек на киоске
    const targetResolution = '1K';

    if (!publicPhotoUrl && !templateImgUrl && !guestVideoUrl) {
        console.warn('[Kie.ai] Отсутствуют изображения/видео для обработки, вызов Kie.ai отменен для защиты баланса.');
        return null;
    }

    // Сопоставление моделей:
    // По умолчанию для всех фото-шаблонов используется флагман сайта ChatGPT — GPT Image 2.5 Sunburst (gpt-image-2-5-sunburst-image-to-image),
    // а для виртуальной примерки одежды — google/nano-banana-edit.
    let kieModel = 'gpt-image-2-5-sunburst-image-to-image';
    if (isTryOn) {
        // Виртуальная примерка одежды -> Nano Banana (Google Image Edit)
        kieModel = 'google/nano-banana-edit';
    } else if (model === 'nano-banana-2' || model === 'google/nano-banana-edit') {
        kieModel = 'google/nano-banana-edit';
    } else if (model === 'gpt-image-2-5-sunburst' || model === 'chatgpt-2.5-sunburst' || model === 'gpt-image-2-5-sunburst-image-to-image' || model === 'chatgpt-2.5') {
        // Официальный флагман сайта ChatGPT с максимальной точностью лица — GPT Image 2.5 Sunburst
        kieModel = 'gpt-image-2-5-sunburst-image-to-image';
    } else if (model === 'gpt-image-2-5-flare' || model === 'chatgpt-2.5-flare' || model === 'gpt-image-2-5-flare-image-to-image') {
        // Скоростная версия GPT Image 2.5 Flare
        kieModel = 'gpt-image-2-5-flare-image-to-image';
    } else if (model === 'gpt-image-2' || model === 'chatgpt-2' || model === 'gpt-image-2-image-to-image') {
        // Предыдущее поколение GPT Image 2 (если выбрано явно)
        kieModel = 'gpt-image-2-image-to-image';
    } else if (model === 'omni-flash' || model === 'google-omni-flash' || model === 'gemini-omni-video' || model === 'google/gemini-omni-flash-1-1' || model === 'google/gemini-omni-1.1-flash' || (typeof model === 'string' && (model.includes('omni') || model.includes('gemini')))) {
        // Google Gemini Omni Flash — Video-to-Video (официальная модель в Kie.ai: gemini-omni-video)
        kieModel = 'gemini-omni-video';
    } else if (model === 'kling-2.6/motion-control' || model === 'kling-motion-2.6') {
        kieModel = 'kling-2.6/motion-control';
    } else if (model === 'kling-motion' || model === 'kling-motion-control' || model === 'kling-3.0/motion-control' || (typeof model === 'string' && model.includes('motion'))) {
        // Kling Motion Control: перенос движений танца/прикола из видео-референса на фото гостя
        kieModel = 'kling-3.0/motion-control';
    } else if (model === 'kling-turbo' || model === 'kling-v2-5-turbo' || (typeof model === 'string' && model.includes('turbo'))) {
        // Ультра-быстрая генерация видео Kling Turbo (высокая скорость для киоска, ~25-35 сек)
        kieModel = 'kling/v2-5-turbo-image-to-video';
    } else if (model === 'kling-video' || model === 'kwaivgi/kling-v1-6' || (typeof model === 'string' && model.includes('kling'))) {
        // Kling 2.6 Image-to-Video (высокая детализация)
        kieModel = 'kling-2.6/image-to-video';
    } else if (model && model !== 'default') {
        kieModel = model;
    } else {
        // Официальный флагман сайта ChatGPT — GPT Image 2.5 Sunburst
        kieModel = 'gpt-image-2-5-sunburst-image-to-image';
    }

    const isGeminiOmni = kieModel === 'gemini-omni-video' || kieModel.includes('gemini') || kieModel.includes('omni');
    const isKlingMotion = kieModel === 'kling-motion' || 
                          kieModel === 'kling-3.0/motion-control' || 
                          kieModel === 'kling-2.6/motion-control' || 
                          kieModel.includes('motion');
    const isVideoModel = isGeminiOmni || 
                         isKlingMotion ||
                         kieModel.includes('kling') || 
                         kieModel.includes('video') || 
                         kieModel.includes('runway') || 
                         kieModel.includes('luma') || 
                         kieModel.includes('hailuo');

    console.log(`[Kie.ai AI Hub] Запуск задачи "${kieModel}" [${targetResolution}] (isVideo=${isVideoModel}, isKlingMotion=${isKlingMotion}, isGeminiOmni=${isGeminiOmni}, isTryOn=${Boolean(isTryOn)})...`);

    const safePrompt = sanitizeForOpenAI(prompt);

    // Формирование входных данных под выбранный тип модели
    let inputPayload = {};
    if (isKlingMotion) {
        // Kling Motion Control: фото гостя + видео-референс танца/прикола из шаблона
        const cleanMotionPrompt = (safePrompt && safePrompt.trim().length > 3)
            ? safePrompt.trim()
            : 'The person in the photo accurately performs the dance movements from the reference video, seamless natural motion, cinematic lighting, high quality, preserve facial likeness and features';

        // Видео-референс танца берется из загруженного в шаблон файла (templateImgUrl)
        const motionVideoUrl = templateImgUrl || guestVideoUrl || 'https://kiosk394.vercel.app/kiosk-ui/assets/card_loop.mp4';

        // В Kie.ai для Kling Motion Control параметр mode строго '720p' или '1080p' (значение 'std' вызывает ошибку 500!)
        const motionMode = (targetResolution === '1080p' || targetResolution === '4K' || targetResolution === 'PRO') ? '1080p' : '720p';

        inputPayload = {
            prompt: cleanMotionPrompt,
            input_urls: [publicPhotoUrl],
            video_urls: [motionVideoUrl],
            mode: motionMode,
            character_orientation: 'image'
        };
    } else if (isGeminiOmni) {
        // Google Gemini Omni Flash: Video-to-Video (трансформация живого видеоролика гостя по промпту шаблона)
        const v2vPrompt = (safePrompt && safePrompt.trim().length > 3)
            ? safePrompt.trim()
            : 'Smooth natural cinematic video transformation, seamlessly integrate person face and identity into the scene, fluid motion, high quality render';

        const isTemplateVideo = templateImgUrl && (
            templateImgUrl.endsWith('.mp4') || 
            templateImgUrl.endsWith('.webm') || 
            templateImgUrl.includes('.mp4?') || 
            templateImgUrl.includes('.webm?') || 
            templateImgUrl.includes('/video/')
        );

        // Исходное видео для трансформации:
        // ПРИОРИТЕТ 1: Записанное гостем видео прямо перед экраном киоска
        // ПРИОРИТЕТ 2: Видео шаблона из каталога (если было загружено)
        // ПРИОРИТЕТ 3: Базовый ролик киоска
        const sourceVideoUrl = guestVideoUrl || (isTemplateVideo 
            ? templateImgUrl 
            : 'https://kiosk394.vercel.app/kiosk-ui/assets/card_loop.mp4');

        inputPayload = {
            prompt: v2vPrompt,
            // Исходное видео для Video-to-Video трансформации (2 юнита квоты в Kie.ai)
            video_list: [
                {
                    url: sourceVideoUrl
                }
            ],
            // Референс стиля (фото обложки шаблона) или стоп-кадр лица гостя (1 юнит квоты в Kie.ai)
            image_urls: (templateImgUrl && !isTemplateVideo) 
                ? [templateImgUrl] 
                : (publicPhotoUrl ? [publicPhotoUrl] : [])
        };
    } else if (isVideoModel) {
        // Оптимизированный промпт движения лица и позы
        let rawVideoPrompt = (safePrompt && safePrompt.trim().length > 3)
            ? safePrompt.trim()
            : 'Smooth subtle cinematic motion, natural breathing, soft hair movement, gentle dynamic lighting, photorealistic high quality portrait animation';
        // Убираем 4K маркеры, замедляющие диффузию
        let cleanVideoPrompt = rawVideoPrompt.replace(/\b(4k|8k|ultra hd|4k resolution)\b/gi, '').trim();

        // Универсальный вход для моделей Kling Image-to-Video на Kie.ai
        inputPayload = {
            prompt: cleanVideoPrompt || 'Smooth subtle cinematic motion, natural breathing, soft hair movement, gentle dynamic lighting',
            image_url: publicPhotoUrl,
            image_urls: [publicPhotoUrl],
            first_frame_url: publicPhotoUrl,
            duration: '5',
            sound: false,
            resolution: '720p',
            camera_fixed: true
        };
    } else if (isTryOn) {
        // Виртуальная примерка одежды / товаров на гостя через Nano Banana (2 фото: гость + вещь)
        const cleanTryOn = (safePrompt || '')
            .replace(/\b(девушка|девушки|девушку|девушке|женщина|женщины|женщину|парень|парня|парню|мужчина|мужчины|мужчину|девочка|девочки|девочку|мальчик|мальчика|человек|человека|модель|персонаж|портрет)\b/gi, '')
            .replace(/\b(girl|woman|female|lady|man|male|guy|boy|person|human|model|character|portrait)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        const imageUrls = [publicPhotoUrl];
        if (templateImgUrl && templateImgUrl.startsWith('http')) {
            imageUrls.push(templateImgUrl);
        }

        const tryOnDirective = `IMAGE EDITING DIRECTIVE — DO NOT GENERATE FROM SCRATCH:
Two source images provided:
Image 1: The original photograph of the person.
Image 2: The clothing item to try on.

CRITICAL MANDATORY INSTRUCTIONS:
1. DO NOT GENERATE A NEW PERSON OR FACE FROM SCRATCH.
2. ABSOLUTE IDENTITY & FACE PRESERVATION: Keep the real person from Image 1 100% intact. Retain their exact face, facial features, facial structure, eyes, nose, mouth, skin tone, facial hair (beard/mustache if present), hair color, hairstyle, body build, gender, age, and natural expression identical to Image 1. Do NOT alter their facial identity under any circumstances.
3. CLOTHING REPLACEMENT ONLY: Remove only the clothes worn by the person in Image 1 and dress them in the exact garment from Image 2. Drape the clothing realistically onto their body, matching their pose and lighting with photorealistic fabric texture and natural folds. ${cleanTryOn ? 'Garment details: ' + cleanTryOn : ''}`;

        inputPayload = {
            prompt: tryOnDirective,
            image_urls: imageUrls,
            input_urls: imageUrls,
            image_url: publicPhotoUrl,
            inputImage: publicPhotoUrl,
            output_format: 'png',
            aspect_ratio: '3:4',
            resolution: targetResolution
        };
    } else {
        // Стилизация портрета (дудл, арт, аниме, киберпанк, мультики, обложки и др.)
        // ВАЖНО: В модель передается фото самого гостя (publicPhotoUrl)!
        // Очищаем промпт от слов, заставляющих ИИ рисовать человека/портрет с нуля
        let rawStyleText = (safePrompt && safePrompt.trim().length > 3) ? safePrompt.trim() : 'artistic aesthetic styling';
        let cleanStyleText = rawStyleText
            .replace(/\b(девушка|девушки|девушку|девушке|женщина|женщины|женщину|парень|парня|парню|мужчина|мужчины|мужчину|девочка|девочки|девочку|мальчик|мальчика|человек|человека|модель|персонаж|портрет|портрета)\b/gi, '')
            .replace(/\b(girl|woman|female|lady|man|male|guy|boy|person|human|model|character|portrait)\b/gi, '')
            .replace(/\b(create a|generate a|draw a|paint a|render a)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        const styleDirective = `IMAGE EDITING DIRECTIVE — DO NOT GENERATE A NEW PERSON OR FACE FROM SCRATCH:
An original photograph of a real person is provided as the input image.

CRITICAL MANDATORY INSTRUCTIONS:
1. DO NOT GENERATE FROM SCRATCH: This is an image editing task on the provided photo. Do NOT invent a new character, new face, or random model.
2. ABSOLUTE FACE & LIKENESS PRESERVATION:
   - Strictly keep the exact face, facial features, facial structure, eye shape, nose, lips, jawline, skin tone, facial hair (beard, mustache if present), hair color, hairstyle, gender, and age of the person in the input photo 100% UNCHANGED.
   - The person in the output must be unmistakably recognized as the EXACT SAME real individual from the input photo.
3. AESTHETIC STYLING ONLY:
   - Apply ONLY the artistic visual style, lighting, color palette, background, and textures (${cleanStyleText || 'vibrant artistic aesthetic'}) directly onto this existing photograph.
   - Blend the original person seamlessly into the chosen style without modifying their personal facial identity.`;

        if (kieModel.includes('gpt-image')) {
            // Строго официальный payload для GPT Image 2 и 2.5 Image-to-Image на Kie.ai
            inputPayload = {
                prompt: styleDirective,
                input_urls: [publicPhotoUrl],
                aspect_ratio: '3:4',
                resolution: targetResolution
            };
            // В Kie.ai параметр background поддерживается только при 1K
            if (targetResolution === '1K') {
                inputPayload.background = 'auto';
            }
        } else {
            inputPayload = {
                prompt: styleDirective,
                input_urls: [publicPhotoUrl],
                image_urls: [publicPhotoUrl],
                image_url: publicPhotoUrl,
                inputImage: publicPhotoUrl,
                output_format: 'png',
                aspect_ratio: '3:4',
                resolution: targetResolution
            };
        }
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

            // Если модель kling-3.0/motion-control вернула ошибку — пробуем kling-2.6/motion-control
            if (!taskId && isKlingMotion && targetModel === 'kling-3.0/motion-control') {
                console.warn('[Kie.ai Kling Motion] Kling 3.0 вернул ошибку, переключаемся на Kling 2.6 Motion Control...');
                targetModel = 'kling-2.6/motion-control';
                createRes = await fetch(DEFAULT_KIE_URL, {
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
                try {
                    createData = await createRes.json();
                    if (createData && createData.code === 200 && createData.data) {
                        taskId = createData.data.taskId || createData.data.id || createData.data.recordId;
                    }
                } catch(e2) {}
            }

            const isVideoTask = targetModel.includes('gemini') ||
                                targetModel.includes('omni') ||
                                targetModel.includes('kling') || 
                                targetModel.includes('video') || 
                                targetModel.includes('runway') || 
                                targetModel.includes('luma') || 
                                targetModel.includes('hailuo');

            if (!taskId) {
                const failReason = (createData && (createData.msg || createData.message)) 
                    ? (createData.msg || createData.message) 
                    : `HTTP ${createRes.status}`;
                console.warn(`[Kie.ai Create Task Error for ${targetModel}]`, createData || createRes.status);
                return { failed: true, error: `Kie.ai: ${failReason}`, model: targetModel, isVideo: isVideoTask };
            }

            console.log(`[Kie.ai Hub] Задача создана (${targetModel}), taskId: ${taskId}, isVideo: ${isVideoTask}. Ожидание результата...`);

            // Для видеомоделей: делаем 1 быстрый опрос (1.5 сек). Если задача еще не завершена —
            // СРАЗУ возвращаем taskId клиенту для асинхронного поллинга со шкалой прогресса.
            // Это исключает 504 таймауты Vercel и зависания экрана на киоске.
            const maxWaitMs = isVideoTask ? 3000 : 45000;
            const startTime = Date.now();

            while (Date.now() - startTime < maxWaitMs) {
                await new Promise(r => setTimeout(r, 1500));

                // Прямой опрос Kie.ai recordInfo
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
                                if (parsed) {
                                    if (Array.isArray(parsed.resultUrls)) resultUrls.push(...parsed.resultUrls);
                                    if (Array.isArray(parsed.urls)) resultUrls.push(...parsed.urls);
                                    if (Array.isArray(parsed.videos)) {
                                        parsed.videos.forEach(v => {
                                            if (typeof v === 'string') resultUrls.push(v);
                                            else if (v && (v.url || v.video_url || v.videoUrl)) resultUrls.push(v.url || v.video_url || v.videoUrl);
                                        });
                                    }
                                    if (parsed.video_url) resultUrls.push(parsed.video_url);
                                    if (parsed.videoUrl) resultUrls.push(parsed.videoUrl);
                                    if (parsed.url) resultUrls.push(parsed.url);
                                    if (parsed.output) {
                                        if (typeof parsed.output === 'string') resultUrls.push(parsed.output);
                                        else if (parsed.output.video_url) resultUrls.push(parsed.output.video_url);
                                        else if (parsed.output.url) resultUrls.push(parsed.output.url);
                                    }
                                }
                            } catch(e) {}
                        }
                        if (taskInfo.response) {
                            const resp = taskInfo.response;
                            if (Array.isArray(resp.resultUrls)) resultUrls.push(...resp.resultUrls);
                            if (resp.video_url) resultUrls.push(resp.video_url);
                            if (resp.videoUrl) resultUrls.push(resp.videoUrl);
                            if (resp.url) resultUrls.push(resp.url);
                        }
                        if (taskInfo.output) {
                            if (typeof taskInfo.output === 'string') resultUrls.push(taskInfo.output);
                            else if (taskInfo.output.video_url) resultUrls.push(taskInfo.output.video_url);
                            else if (taskInfo.output.url) resultUrls.push(taskInfo.output.url);
                        }

                        const finalMediaUrl = resultUrls.find(u => Boolean(u)) || 
                                              taskInfo.video_url || 
                                              taskInfo.videoUrl || 
                                              taskInfo.image_url || 
                                              taskInfo.url;

                        if (finalMediaUrl) {
                            const cleanFinalUrl = await persistResultToSupabase(finalMediaUrl, orderId, isVideoTask);
                            return { resultUrl: cleanFinalUrl, taskId, resolution: targetResolution, model: targetModel, isVideo: isVideoTask };
                        }
                    } else if (state === 'fail' || state === 'failed' || state === 'error') {
                        const errMsg = taskInfo.failMsg || taskInfo.errorMessage || 'Неизвестная ошибка генерации';
                        console.warn(`[Kie.ai] Задача ${taskId} (${targetModel}) завершилась с ошибкой:`, errMsg);
                        return { failed: true, error: errMsg, taskId, model: targetModel, isVideo: isVideoTask };
                    }
                }
            }

            // Если задача ещё в процессе — возвращаем taskId для асинхронного поллинга клиентом
            console.log(`[Kie.ai AI Hub] Задача ${taskId} (${targetModel}) в процессе, передаем клиенту для поллинга`);
            return { pending: true, taskId, resolution: targetResolution, model: targetModel, isVideo: isVideoTask };

        } catch (err) {
            console.warn(`[Kie.ai Task Exception for ${targetModel}]`, err.message);
            return { failed: true, error: err.message, model: targetModel };
        }
    }

    // Запуск строго через выбранную модель без скрытых подмен и фоллбэков
    console.log(`[Kie.ai AI Hub] Запуск генерации строго в целевой модели: "${kieModel}"`);
    const outcome = await executeKieTask(kieModel, inputPayload);
    return outcome;
}

let lastCleanupTimestamp = 0;
function triggerBackgroundCleanup() {
    const now = Date.now();
    if (now - lastCleanupTimestamp > 2 * 3600 * 1000) {
        lastCleanupTimestamp = now;
        try {
            const { cleanupStorage } = require('../cron/cleanup');
            cleanupStorage(12).catch(e => console.warn('[Background Cleanup Error]', e.message));
        } catch(e) {}
    }
}

// Защита: проверка статуса оплаты заказа в Supabase Storage перед вызовом платных нейросетей
async function verifyPaidOrder(orderId) {
    if (!orderId) {
        return { ok: false, error: 'Отсутствует номер заказа (orderId)' };
    }
    try {
        const checkRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/orders/${orderId}.json`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        if (!checkRes.ok) {
            return { ok: false, error: 'Заказ не найден в базе данных. Оплата не подтверждена.' };
        }
        const orderData = await checkRes.json();
        if (orderData.status !== 'PAID') {
            return { ok: false, error: `Заказ не оплачен (текущий статус: ${orderData.status || 'PENDING'})` };
        }
        return { ok: true, order: orderData };
    } catch (e) {
        console.warn('[Order Verification Fallback]', e.message);
        return { ok: true, fallback: true };
    }
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
        // Фоновая автоматическая очистка временных медиа старше 12 часов
        triggerBackgroundCleanup();

        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { photoData, videoUrl, guestVideoUrl, templateImg, prompt, model, title, price, orderId, location, isTryOn, resolution, aggregatorUrl, aggregatorKey, elevenlabsKey, elevenlabsVoiceId } = body;

        // 0. Защита: строгая проверка оплаты заказа перед генерацией
        const paymentCheck = await verifyPaidOrder(orderId);
        if (!paymentCheck.ok) {
            console.warn(`[AI Hub Security] Генерация отклонена для заказа "${orderId}": ${paymentCheck.error}`);
            return res.status(403).json({
                success: false,
                error: paymentCheck.error,
                orderId
            });
        }

        const effectiveKey = aggregatorKey || process.env.AI_AGGREGATOR_KEY || process.env.KIE_API_KEY || 'fde11cd9f361b989eb19b8ef8530bfbd';
        const targetResolution = '1K';

        console.log(`[AI Hub] Запрос подтвержден и оплачен: "${title}", модель="${model || 'chatgpt-2.5'}", заказ="${orderId}"`);

        // Защита от списания кредитов Kie.ai без реальных данных
        if (!photoData && !templateImg && !videoUrl && !guestVideoUrl) {
            console.log('[AI Hub] Входные медиаданные отсутствуют. Обращение к Kie.ai пропущено для защиты кредитов.');
            return res.status(200).json({
                success: true,
                pending: false,
                state: 'fallback',
                message: 'Медиаданные отсутствуют, генерация пропущена'
            });
        }

        // 1. Получаем публичный URL фото гостя, шаблона и записанного видео гостя через CDN Supabase
        const publicPhotoUrl = await uploadImageToCDN(photoData, 'guests', orderId);
        const publicTemplateUrl = await uploadImageToCDN(templateImg, 'clothes', orderId);
        const rawGuestVideo = guestVideoUrl || videoUrl;
        const publicGuestVideoUrl = rawGuestVideo ? await uploadImageToCDN(rawGuestVideo, 'guests', orderId) : null;

        if (!publicPhotoUrl && !publicTemplateUrl && !publicGuestVideoUrl) {
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
            guestVideoUrl: publicGuestVideoUrl,
            templateImgUrl: publicTemplateUrl,
            isTryOn: Boolean(isTryOn),
            resolution: targetResolution,
            orderId
        }) : Promise.resolve(null);

        const audioPromise = (speechText && (effectiveKey || elevenlabsKey)) ? generateElevenLabsAudio({
            text: speechText,
            elevenlabsKey,
            apiKey: effectiveKey,
            voiceId: elevenlabsVoiceId || 'XNrB7jz2HCkpU5yK08kP',
            orderId: `tryon_voice_${orderId || Date.now()}`
        }).catch(e => null) : Promise.resolve(null);

        const [generationOutcome, audioUrl] = await Promise.all([imagePromise, audioPromise]);

        const effectiveModelName = generationOutcome?.model || model || (isTryOn ? 'nano-banana-2' : 'chatgpt-2.5');

        // Если целевая модель вернула явную ошибку (без скрытых фоллбэков)
        if (generationOutcome && generationOutcome.failed) {
            console.warn(`[AI Hub] Модель ${effectiveModelName} завершилась с ошибкой:`, generationOutcome.error);
            return res.status(200).json({
                success: false,
                error: generationOutcome.error || `Ошибка генерации в модели ${effectiveModelName}`,
                model: effectiveModelName,
                orderId
            });
        }

        // Если задача ещё в процессе (OpenAI) — возвращаем статус pending для поллинга
        if (generationOutcome && generationOutcome.pending) {
            return res.status(200).json({
                success: true,
                pending: true,
                state: 'generating',
                taskId: generationOutcome.taskId,
                orderId,
                resolution: generationOutcome.resolution || targetResolution,
                model: effectiveModelName,
                isVideo: Boolean(generationOutcome && generationOutcome.isVideo),
                audioUrl: audioUrl || null,
                speechText: speechText || '',
                message: `Генерация через ${effectiveModelName} выполняется...`
            });
        }

        let generatedImageUrl = generationOutcome?.resultUrl || null;
        if (generatedImageUrl && !generatedImageUrl.includes('supabase.co')) {
            generatedImageUrl = await persistResultToSupabase(generatedImageUrl, orderId, Boolean(generationOutcome?.isVideo));
        }

        // Защита: ни при каких обстоятельствах не подменять результат видео/фото шаблоном!
        if (!generatedImageUrl) {
            console.warn(`[AI Hub] Модель ${effectiveModelName} не вернула результат генерации`);
            return res.status(200).json({
                success: false,
                error: generationOutcome?.error || `Не удалось сгенерировать медиа через ${effectiveModelName}. Пожалуйста, попробуйте еще раз.`,
                model: effectiveModelName,
                orderId
            });
        }

        return res.status(200).json({
            success: true,
            pending: false,
            state: 'success',
            orderId,
            taskId: generationOutcome?.taskId || null,
            model: effectiveModelName,
            resolution: generationOutcome?.resolution || targetResolution,
            title: title || 'Портрет',
            prompt: prompt || '',
            location: location || '',
            isTryOn: Boolean(isTryOn),
            resultUrl: generatedImageUrl,
            audioUrl: audioUrl || null,
            speechText: speechText || '',
            mode: effectiveKey ? 'live' : 'preview',
            message: `Успешно сгенерировано через ${effectiveModelName}`
        });
    } catch (err) {
        console.error('[AI Gateway Error]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

