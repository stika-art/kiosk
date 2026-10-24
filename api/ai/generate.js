// ============================================================
// TRENDUM KIOSK — UNIVERSAL AI GATEWAY (KIE.AI & CUSTOM AGGREGATORS)
// Models supported:
// 1. 'nano-banana-2'  -> google/nano-banana-edit (Фото с сохранением лица / Примерка одежды)
// 2. 'chatgpt-2.5'    -> gpt-image-2-image-to-image (Базовый GPT Image 2)
// 3. 'pixverse-v6'    -> pixverse/v6/image-to-video (PixVerse V6 — Реалистичное оживление фото в видео)
// 4. 'kling-turbo'    -> kling/v2-5-turbo-image-to-video (Ультра-быстрая генерация видео из фото)
// 5. 'kling-video'    -> kling-2.6/image-to-video (Высокодетализированное видео из фото)
// ============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

let ffmpegStatic = null;
try {
    ffmpegStatic = require('ffmpeg-static');
} catch (e) {
    console.warn('[AI Hub] ffmpeg-static модуль не загружен:', e.message);
}

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
        const isAud = mediaUrl.includes('.mp3') || mediaUrl.includes('.wav') || mediaUrl.includes('.m4a') || (resp.headers.get('content-type') || '').includes('audio');
        const isVid = !isAud && (isVideo || mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || (resp.headers.get('content-type') || '').includes('video'));
        const ext = isAud ? 'mp3' : (isVid ? 'mp4' : 'png');
        const mimeType = isAud ? 'audio/mpeg' : (isVid ? 'video/mp4' : 'image/png');
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

// 4a. Генерация субтитров формата Advanced SubStation Alpha (.ass) для красивого наложения на видео
function generateAssSubtitles(text, totalDurationSec, assPath) {
    const rawSentences = (text || '')
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean);

    const sentences = [];
    rawSentences.forEach(s => {
        const words = s.split(/\s+/);
        if (words.length > 9) {
            const mid = Math.ceil(words.length / 2);
            sentences.push(words.slice(0, mid).join(' '));
            sentences.push(words.slice(mid).join(' '));
        } else {
            sentences.push(s);
        }
    });

    if (sentences.length === 0) {
        sentences.push(text || 'Волшебная сказка');
    }

    const totalChars = sentences.reduce((acc, s) => acc + s.length, 0) || 1;
    const dur = Math.max(3, totalDurationSec);

    let currentTime = 0.5;
    const availableTime = Math.max(1, dur - 1.0);

    const formatAssTime = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        const cs = Math.floor((sec % 1) * 100);
        return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${cs < 10 ? '0' : ''}${cs}`;
    };

    let events = '';
    sentences.forEach((sentence, idx) => {
        const sentenceWeight = sentence.length / totalChars;
        const sentenceDuration = Math.max(2.0, sentenceWeight * availableTime);
        const startTime = currentTime;
        const endTime = (idx === sentences.length - 1) ? dur : Math.min(dur, startTime + sentenceDuration);

        const safeText = sentence.replace(/\\/g, '').replace(/{/g, '').replace(/}/g, '').trim();
        events += `Dialogue: 0,${formatAssTime(startTime)},${formatAssTime(endTime)},Default,,0,0,0,,{\\b1}${safeText}{\\b0}\n`;

        currentTime = endTime + 0.15;
    });

    const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 896
PlayResY: 1200

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,36,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,40,40,90,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}`;

    fs.writeFileSync(assPath, assHeader, 'utf8');
}

// Измерение точной длительности аудио через FFmpeg
function getAudioDuration(filePath) {
    if (!ffmpegStatic) return 30;
    try {
        const res = spawnSync(ffmpegStatic, ['-i', filePath, '-hide_banner'], { encoding: 'utf8' });
        const output = (res.stderr || '') + (res.stdout || '');
        const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
        if (match) {
            const h = parseFloat(match[1]);
            const m = parseFloat(match[2]);
            const s = parseFloat(match[3]);
            return (h * 3600) + (m * 60) + s;
        }
    } catch (e) {
        console.warn('[Fairytale Video] Ошибка замера длительности аудио:', e.message);
    }
    return 30;
}

// Сборка полноценного MP4 видео сказки (обложка + голос ElevenLabs 4 + фоновая музыка + наложенные субтитры)
async function assembleFairytaleVideo({ voiceBuffer, voiceUrl, text, bgTrackUrl, orderId, customCoverUrl = null }) {
    if (!ffmpegStatic) {
        console.warn('[Fairytale Video] FFmpeg недоступен для видеорендеринга сказки');
        return null;
    }

    const tempDir = os.tmpdir();
    const safeOrder = (orderId || Date.now()).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
    const tmpVoice = path.join(tempDir, `tf_voice_${safeOrder}_${Date.now()}.mp3`);
    const tmpBg = path.join(tempDir, `tf_bg_${safeOrder}_${Date.now()}.mp3`);
    const tmpAss = path.join(tempDir, `tf_sub_${safeOrder}_${Date.now()}.ass`);
    const outVideo = path.join(tempDir, `tf_video_${safeOrder}_${Date.now()}.mp4`);
    let tmpCustomCover = null;

    let hasBg = false;

    try {
        // 1. Сохраняем голосовой файл
        if (voiceBuffer) {
            fs.writeFileSync(tmpVoice, voiceBuffer);
        } else if (voiceUrl) {
            const resp = await fetch(voiceUrl);
            if (!resp.ok) throw new Error('Не удалось скачать аудио сказки');
            const ab = await resp.arrayBuffer();
            fs.writeFileSync(tmpVoice, Buffer.from(ab));
        } else {
            throw new Error('Отсутствуют аудиоданные сказки для видео');
        }

        // 2. Длительность озвучки
        const duration = Math.max(3, getAudioDuration(tmpVoice));
        console.log(`[Fairytale Video] Хронометраж озвучки сказки: ${duration.toFixed(1)} сек`);

        // 3. Загружаем фоновый трек, если он предоставлен
        if (bgTrackUrl && typeof bgTrackUrl === 'string' && bgTrackUrl.startsWith('http')) {
            try {
                const bgResp = await fetch(bgTrackUrl);
                if (bgResp.ok) {
                    const bgAb = await bgResp.arrayBuffer();
                    fs.writeFileSync(tmpBg, Buffer.from(bgAb));
                    hasBg = true;
                    console.log(`[Fairytale Video] Фоновая музыка загружена (${fs.statSync(tmpBg).size} байт)`);
                }
            } catch (e) {
                console.warn('[Fairytale Video] Ошибка загрузки фонового трека:', e.message);
            }
        }

        // 4. Генерируем субтитры
        generateAssSubtitles(text, duration, tmpAss);

        // 5. Поиск файла обложки (приоритет: персонализированная обложка с лицом ребенка)
        let coverPath = null;
        if (customCoverUrl && typeof customCoverUrl === 'string' && customCoverUrl.startsWith('http')) {
            try {
                console.log(`[Fairytale Video] Скачивание персонализированной обложки с лицом ребенка: ${customCoverUrl}`);
                const cResp = await fetch(customCoverUrl);
                if (cResp.ok) {
                    const cAb = await cResp.arrayBuffer();
                    tmpCustomCover = path.join(tempDir, `tf_cov_${safeOrder}_${Date.now()}.jpg`);
                    fs.writeFileSync(tmpCustomCover, Buffer.from(cAb));
                    if (fs.existsSync(tmpCustomCover) && fs.statSync(tmpCustomCover).size > 1000) {
                        coverPath = tmpCustomCover;
                        console.log(`[Fairytale Video] Обложка с лицом ребенка успешно подготовлена (${fs.statSync(tmpCustomCover).size} байт)`);
                    }
                }
            } catch (ce) {
                console.warn('[Fairytale Video] Не удалось скачать customCoverUrl, fallback:', ce.message);
            }
        }

        if (!coverPath) {
            coverPath = path.join(__dirname, '..', '..', 'images', 'fairytale_cover.jpg');
            if (!fs.existsSync(coverPath)) coverPath = path.join(__dirname, 'images', 'fairytale_cover.jpg');
            if (!fs.existsSync(coverPath)) coverPath = path.join(process.cwd(), 'images', 'fairytale_cover.jpg');
            if (!fs.existsSync(coverPath)) coverPath = path.join(process.cwd(), 'kiosk-ui', 'images', 'fairytale_cover.jpg');
        }

        if (!coverPath || !fs.existsSync(coverPath)) {
            console.warn('[Fairytale Video] Обложка fairytale_cover.jpg не найдена, генерация фонового кадра');
            const fallbackCover = path.join(tempDir, `tf_fb_${Date.now()}.jpg`);
            spawnSync(ffmpegStatic, ['-y', '-f', 'lavfi', '-i', 'color=c=#15092a:s=896x1200', '-vframes', '1', fallbackCover]);
            coverPath = fallbackCover;
        }

        const normalizedCover = coverPath.replace(/\\/g, '/');
        const escapedAss = tmpAss.replace(/\\/g, '/').replace(/:/g, '\\:');

        // 6. Формирование параметров FFmpeg
        const ffmpegArgs = ['-y'];

        // Вход 0: обложка (зациклена)
        ffmpegArgs.push('-loop', '1', '-i', normalizedCover);

        // Вход 1: голос диктора ElevenLabs
        ffmpegArgs.push('-i', tmpVoice.replace(/\\/g, '/'));

        // Вход 2: фоновый трек (если есть, зациклен)
        if (hasBg) {
            ffmpegArgs.push('-stream_loop', '-1', '-i', tmpBg.replace(/\\/g, '/'));
            ffmpegArgs.push(
                '-filter_complex',
                `[1:a]volume=1.0[v];[2:a]volume=0.18[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[aout];[0:v]scale=896:1200:force_original_aspect_ratio=increase,crop=896:1200,subtitles='${escapedAss}'[vout]`,
                '-map', '[vout]',
                '-map', '[aout]'
            );
        } else {
            ffmpegArgs.push(
                '-filter_complex',
                `[0:v]scale=896:1200:force_original_aspect_ratio=increase,crop=896:1200,subtitles='${escapedAss}'[vout]`,
                '-map', '[vout]',
                '-map', '1:a'
            );
        }

        ffmpegArgs.push(
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-t', duration.toFixed(2),
            outVideo
        );

        console.log('[Fairytale Video] Рендеринг видеоролика сказки в MP4 с субтитрами...');
        const renderRes = spawnSync(ffmpegStatic, ffmpegArgs, { encoding: 'utf8' });

        if (!fs.existsSync(outVideo) || fs.statSync(outVideo).size === 0) {
            console.warn('[Fairytale Video] FFmpeg не сформировал файл видео:', renderRes.stderr?.slice(-350));
            return null;
        }

        const videoSize = fs.statSync(outVideo).size;
        console.log(`[Fairytale Video] Видеосказка успешно отрендерена: ${(videoSize / 1024 / 1024).toFixed(2)} МБ`);

        // 7. Загружаем готовый видеофайл MP4 в Supabase Storage
        const videoBuffer = fs.readFileSync(outVideo);
        const filename = `results/fairytale_video_${safeOrder}_${Math.random().toString(36).substring(7)}.mp4`;

        const supaRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'video/mp4',
                'x-upsert': 'true'
            },
            body: videoBuffer
        });

        if (supaRes.ok) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
            console.log('[Fairytale Video] Видеосказка загружена в Supabase CDN:', publicUrl);
            return publicUrl;
        } else {
            console.warn('[Fairytale Video] Ошибка загрузки видеосказки в Supabase CDN');
            return null;
        }
    } catch (err) {
        console.warn('[Fairytale Video] Ошибка при сборке видеосказки:', err.message);
        return null;
    } finally {
        try { if (fs.existsSync(tmpVoice)) fs.unlinkSync(tmpVoice); } catch (e) {}
        try { if (fs.existsSync(tmpBg)) fs.unlinkSync(tmpBg); } catch (e) {}
        try { if (fs.existsSync(tmpAss)) fs.unlinkSync(tmpAss); } catch (e) {}
        try { if (fs.existsSync(outVideo)) fs.unlinkSync(outVideo); } catch (e) {}
        try { if (tmpCustomCover && fs.existsSync(tmpCustomCover)) fs.unlinkSync(tmpCustomCover); } catch (e) {}
    }
}

// 4b. Генерация 3D обложки книги сказок с сохранением черт лица ребенка из фотографии
async function generateFairytaleCover({ apiKey, photoUrl, childName, theme, mood, langCode, orderId }) {
    if (!apiKey || !photoUrl || typeof photoUrl !== 'string' || !photoUrl.startsWith('http')) {
        return null;
    }

    console.log(`[Fairytale Cover] Запуск генерации 3D-обложки книги сказок с лицом ребенка (order: ${orderId})...`);
    const cleanChild = sanitizeForOpenAI(childName || 'Child');
    const cleanTheme = sanitizeForOpenAI(theme || 'Magical adventure');
    const cleanMood = sanitizeForOpenAI(mood || 'Inspiring, joyful and kind');

    const promptText = `IMAGE EDITING DIRECTIVE — DO NOT GENERATE A NEW PERSON OR FACE FROM SCRATCH:
A real input photo of a child is provided.
CRITICAL MANDATORY INSTRUCTIONS:
1. Turn this photo into an enchanting 3D Disney Pixar animation fairytale storybook cover.
2. ABSOLUTE FACE & LIKENESS PRESERVATION:
   - Strictly keep the exact face, facial features, smiling eyes, nose, lips, hair color, haircut and recognizable identity of the child from the input photo completely preserved.
   - The child must be undeniably recognized as the EXACT SAME real individual from the photo, rendered in charming 3D Disney Pixar animation style.
3. STORYBOOK COVER AESTHETIC:
   - The child is the heroic center of a magical fairytale book cover adventure about ${cleanTheme}.
   - Mood: ${cleanMood}.
   - Glowing golden sparkles, enchanted fairytale lighting, rich magical colors, ornate storybook border framing, 8k render, masterpiece.`;

    try {
        const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-image-2-image-to-image',
                input: {
                    prompt: promptText,
                    input_urls: [photoUrl],
                    aspect_ratio: '3:4',
                    resolution: '1K',
                    background: 'auto'
                }
            })
        });

        if (!createRes.ok) {
            console.warn('[Fairytale Cover] Kie.ai createTask error:', createRes.status);
            return null;
        }

        const createData = await createRes.json();
        const taskId = createData?.data?.taskId || createData?.taskId;
        if (!taskId) return null;

        console.log(`[Fairytale Cover] Задача генерации обложки отправлена в Kie.ai (${taskId}), ожидаем результат...`);

        const startWait = Date.now();
        while (Date.now() - startWait < 30000) {
            await new Promise(r => setTimeout(r, 2000));
            const statRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!statRes.ok) continue;

            const statData = await statRes.json();
            const rec = statData?.data || statData;
            const state = (rec?.state || rec?.status || '').toLowerCase();

            if (state === 'success') {
                let imgUrl = rec.resultUrl || (Array.isArray(rec.resultUrls) && rec.resultUrls[0]) || rec.mediaUrl || rec.output?.image_url;
                if (imgUrl) {
                    console.log('[Fairytale Cover] Обложка книги сказок с лицом ребенка успешно сгенерирована:', imgUrl);
                    const cdnUrl = await persistResultToSupabase(imgUrl, orderId, false);
                    return cdnUrl || imgUrl;
                }
            } else if (state === 'fail' || state === 'failed') {
                console.warn('[Fairytale Cover] Ошибка генерации обложки:', rec?.failReason || rec?.error);
                break;
            }
        }
    } catch (e) {
        console.warn('[Fairytale Cover] Исключение при создании обложки сказки:', e.message);
    }
    return null;
}

// 4c. Прямой синтез детской сказки через новейший ElevenLabs 4 (модель eleven_v4) с генерацией видео MP4
async function generateViaElevenLabsDirect({ apiKey, voiceId, text, orderId, modelId = 'eleven_v4', bgTrackUrl = null, customCoverUrl = null }) {
    if (!apiKey || !text) return null;
    const cleanVoiceId = (voiceId || 'JBFqnCBsd6RMkjVDRZzb').trim();
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(cleanVoiceId)}`;
    const targetModel = modelId || 'eleven_v4';

    console.log(`[ElevenLabs 4 Engine] Прямой синтез через "${targetModel}" (voice: ${cleanVoiceId}, length: ${text.length} символов)...`);

    try {
        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: targetModel,
                voice_settings: {
                    stability: 0.55,
                    similarity_boost: 0.75,
                    style: 0.35,
                    use_speaker_boost: true
                }
            })
        });

        if (!resp.ok) {
            const errBody = await resp.text().catch(() => '');
            console.warn(`[ElevenLabs 4 Error] HTTP ${resp.status}:`, errBody);
            return { failed: true, error: `ElevenLabs 4: HTTP ${resp.status} - ${errBody.slice(0, 140)}` };
        }

        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const safeOrder = (orderId || Date.now()).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `results/fairytale_${safeOrder}_${Math.random().toString(36).substring(7)}.mp3`;

        const supaRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'audio/mpeg',
                'x-upsert': 'true'
            },
            body: buffer
        });

        if (supaRes.ok) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
            console.log(`[ElevenLabs 4] Аудиосказка успешно сгенерирована и сохранена в Supabase CDN:`, publicUrl);

            // Автоматическая сборка видео (.MP4) с обложкой и субтитрами
            let videoUrl = null;
            try {
                videoUrl = await assembleFairytaleVideo({
                    voiceBuffer: buffer,
                    text,
                    bgTrackUrl,
                    orderId,
                    customCoverUrl
                });
            } catch (vErr) {
                console.warn('[ElevenLabs 4] Сборка видеосказки завершилась с ошибкой:', vErr.message);
            }

            if (videoUrl) {
                return {
                    success: true,
                    resultUrl: videoUrl,
                    mediaUrl: videoUrl,
                    videoUrl: videoUrl,
                    audioUrl: publicUrl,
                    coverUrl: customCoverUrl,
                    isVideo: true,
                    isFairytale: true,
                    model: targetModel
                };
            }

            return {
                success: true,
                resultUrl: publicUrl,
                mediaUrl: publicUrl,
                audioUrls: [publicUrl],
                coverUrl: customCoverUrl,
                isAudio: true,
                model: targetModel
            };
        }
        return { failed: true, error: 'Ошибка сохранения аудиофайла сказки в Supabase CDN' };
    } catch (err) {
        console.warn(`[ElevenLabs 4 Exception]`, err.message);
        return { failed: true, error: `ElevenLabs 4: ${err.message}` };
    }
}

// 5. Вызов Kie.ai API и ожидание результата задачи генерации изображения или видео
async function generateViaKie({ apiKey, model, prompt, publicPhotoUrl, guestVideoUrl, templateImgUrl, isTryOn, resolution, orderId, title, duration, isFairytale, fairytaleData, voiceId }) {
    const isMusicTarget = (model === 'suno' || (model && model.toLowerCase().includes('suno')) || (model && model.toLowerCase().includes('music')));
    const isFairytaleTarget = Boolean(isFairytale) || model === 'fairytale' || (model && model.toLowerCase().includes('fairytale')) || (model && model.toLowerCase().includes('elevenlabs'));
    if (!apiKey || (!isMusicTarget && !isFairytaleTarget && !publicPhotoUrl && !guestVideoUrl && !templateImgUrl)) return null;

    // Разрешение: строго 1K для ультра-быстрой генерации 5-8 сек на киоске
    const targetResolution = '1K';

    // Сопоставление моделей:
    // По умолчанию GPT Image 2 — быстрая генерация 5-15 сек для киоска.
    let kieModel = 'gpt-image-2-image-to-image';
    if (isTryOn) {
        // Виртуальная примерка одежды -> GPT Image 2 (понимает "Одень одежду с первой фото")
        kieModel = model === 'nano-banana-2' || model === 'google/nano-banana-edit'
            ? 'google/nano-banana-edit'
            : 'gpt-image-2-image-to-image';
    } else if (model === 'nano-banana-2' || model === 'google/nano-banana-edit') {
        kieModel = 'google/nano-banana-edit';
    } else if (model === 'gpt-image-2-5-sunburst' || model === 'chatgpt-2.5-sunburst' || model === 'gpt-image-2-5-sunburst-image-to-image') {
        // GPT Image 2.5 Sunburst — максимальная детализация (медленнее), только при явном выборе
        kieModel = 'gpt-image-2-5-sunburst-image-to-image';
    } else if (model === 'gpt-image-2-5-flare' || model === 'chatgpt-2.5-flare' || model === 'gpt-image-2-5-flare-image-to-image') {
        // GPT Image 2.5 Flare — скоростная версия 2.5
        kieModel = 'gpt-image-2-5-flare-image-to-image';
    } else if (model === 'gpt-image-2' || model === 'chatgpt-2' || model === 'chatgpt-2.5' || model === 'gpt-image-2-image-to-image') {
        // GPT Image 2 — быстрая генерация (дефолт для всех карточек с chatgpt-2 / chatgpt-2.5)
        kieModel = 'gpt-image-2-image-to-image';
    } else if (model === 'pixverse-v6' || model === 'pixverse' || model === 'pixverse/v6/image-to-video' || model === 'pixverse-v6/image-to-video' || model === 'omni-flash' || model === 'google-omni-flash' || model === 'gemini-omni-video' || (typeof model === 'string' && (model.includes('pixverse') || model.includes('omni') || model.includes('gemini')))) {
        // PixVerse V6 — Флагманское кинематографичное оживление фото в видео (официальная модель Kie.ai: pixverse/v6/image-to-video)
        kieModel = 'pixverse/v6/image-to-video';
    } else if (model === 'kling-turbo' || model === 'kling/v2-5-turbo-image-to-video') {
        kieModel = 'kling/v2-5-turbo-image-to-video';
    } else if (model === 'kling-video' || model === 'kling-2.6/image-to-video') {
        kieModel = 'kling-2.6/image-to-video';
    } else if (model === 'suno' || model === 'suno-v6' || model === 'suno-v6-mini' || model === 'suno-v6-wild' || model === 'suno-v4' || model === 'suno-v3.5' || model === 'ai-music-api/generate' || (typeof model === 'string' && (model.includes('suno') || model.includes('music') || model.includes('трек') || model.includes('песн')))) {
        // Suno AI (V6) — Генерация музыки и песен через официальный API Kie.ai
        kieModel = 'ai-music-api/generate';
    } else if (model === 'fairytale' || isFairytaleTarget || (typeof model === 'string' && (model.includes('elevenlabs') || model.includes('fairytale') || model.includes('сказк')))) {
        // ElevenLabs Multilingual V2 — Синтез сказочного голоса диктора
        kieModel = 'elevenlabs/text-to-speech-multilingual-v2';
    } else if (model && model !== 'default') {
        kieModel = model;
    } else {
        // Дефолт — GPT Image 2 (быстро, 5-15 сек)
        kieModel = 'gpt-image-2-image-to-image';
    }

    const isPixverse = kieModel === 'pixverse/v6/image-to-video' || kieModel.includes('pixverse');
    const isGeminiOmni = kieModel === 'gemini-omni-video' || kieModel.includes('gemini') || kieModel.includes('omni');
    const isMusicModel = kieModel === 'ai-music-api/generate' || kieModel.includes('music') || kieModel.includes('suno');
    const isFairytaleModel = kieModel === 'elevenlabs/text-to-speech-multilingual-v2' || kieModel.includes('elevenlabs') || isFairytaleTarget;
    const isVideoModel = !isMusicModel && !isFairytaleModel && (isPixverse ||
                         isGeminiOmni ||
                         kieModel.includes('video') ||
                         kieModel.includes('kling') ||
                         kieModel.includes('runway') ||
                         kieModel.includes('luma') ||
                         kieModel.includes('hailuo'));

    console.log(`[Kie.ai AI Hub] Запуск задачи "${kieModel}" [${targetResolution}] (isVideo=${isVideoModel}, isMusic=${isMusicModel}, isFairytale=${isFairytaleModel}, isPixverse=${isPixverse}, duration=${duration || 5}s, isTryOn=${Boolean(isTryOn)})...`);

    const safePrompt = sanitizeForOpenAI(prompt);

    // Формирование входных данных под выбранный тип модели
    let inputPayload = {};
    if (isFairytaleModel) {
        // Озвучивание сказки через ElevenLabs 4 (eleven_v4) в Kie.ai
        const targetVoice = voiceId || 'James';
        const storyText = safePrompt || 'Жил-был на свете маленький герой, который очень любил волшебные приключения.';
        inputPayload = {
            text: storyText,
            voice: targetVoice,
            model_id: 'eleven_v4',
            model: 'eleven_v4',
            stability: 0.55,
            similarity_boost: 0.75
        };
    } else if (isMusicModel) {
        // Генерация полноценной музыки и песен через Suno AI (актуальная флагманская версия V6 в Kie.ai)
        const musicPrompt = (safePrompt && safePrompt.trim().length > 3)
            ? safePrompt.trim()
            : 'Энергичный современный трек с качающим битом, запоминающимся припевом и русским вокалом';

        // Поддержка версий модели Kie.ai: V6 (по умолчанию), V6_MINI, V6_WILD
        let targetMusicModel = 'V6';
        if (typeof model === 'string') {
            const mLow = model.toLowerCase();
            if (mLow.includes('mini')) {
                targetMusicModel = 'V6_MINI';
            } else if (mLow.includes('wild')) {
                targetMusicModel = 'V6_WILD';
            }
        }

        inputPayload = {
            prompt: musicPrompt,
            custom_mode: false,
            customMode: false,
            instrumental: false,
            model: targetMusicModel,
            title: title || 'Trendum Hit'
        };
    } else if (isPixverse) {
        // Генерация ультра-реалистичного видео из фото гостя через PixVerse V6
        const defaultPrompt = 'Smooth natural cinematic motion, realistic high quality animation, highly detailed, fluid lifelike movement, 4k render';
        const vPrompt = (safePrompt && safePrompt.trim().length > 3)
            ? safePrompt.trim()
            : defaultPrompt;

        // Длительность видео от 2 до 15 секунд (по умолчанию 5 секунд)
        const targetDuration = Math.min(15, Math.max(2, parseInt(duration, 10) || 5));

        // Источник изображения для PixVerse Image-to-Video:
        // ПРИОРИТЕТ 1: Фото гостя, сделанное у киоска
        // ПРИОРИТЕТ 2: Обложка шаблона
        const sourceImageUrl = publicPhotoUrl || templateImgUrl;

        inputPayload = {
            prompt: vPrompt,
            image_url: sourceImageUrl,
            duration: targetDuration,
            quality: '720p',
            aspect_ratio: '9:16',
            generate_audio_switch: false,
            generate_multi_clip_switch: false
        };
    } else if (isGeminiOmni) {
        const isTemplateVideo = templateImgUrl && (
            templateImgUrl.endsWith('.mp4') || 
            templateImgUrl.endsWith('.webm') || 
            templateImgUrl.includes('.mp4?') || 
            templateImgUrl.includes('.webm?') || 
            templateImgUrl.includes('/video/')
        );

        const defaultPrompt = isTemplateVideo
            ? 'The person from the reference image accurately performs the exact dance movements, choreography, and rhythm from the reference video, keeping natural fluid motion, preserving facial identity and likeness, realistic body anatomy, cinematic lighting, 1080p high quality render'
            : 'Smooth natural cinematic video transformation, seamlessly integrate person face and identity into the scene, fluid motion, high quality render';

        const v2vPrompt = (safePrompt && safePrompt.trim().length > 3)
            ? safePrompt.trim()
            : defaultPrompt;

        const sourceVideoUrl = guestVideoUrl || (isTemplateVideo 
            ? templateImgUrl 
            : 'https://kiosk394.vercel.app/kiosk-ui/assets/card_loop.mp4');

        inputPayload = {
            prompt: v2vPrompt,
            video_list: [
                {
                    url: sourceVideoUrl
                }
            ],
            image_urls: (templateImgUrl && !isTemplateVideo) 
                ? [templateImgUrl] 
                : (publicPhotoUrl ? [publicPhotoUrl] : [])
        };
    } else if (isTryOn) {
        // Виртуальная примерка одежды: Image 1 = одежда (шаблон), Image 2 = гость
        // Порядок важен: ИИ берёт одежду с первого фото и надевает на человека со второго

        const imageUrls = [];
        // ПЕРВЫМ идёт фото одежды (шаблон карточки)
        if (templateImgUrl && templateImgUrl.startsWith('http')) {
            imageUrls.push(templateImgUrl);
        }
        // ВТОРЫМ идёт фото гостя
        imageUrls.push(publicPhotoUrl);

        // Простой и эффективный промпт — как в примере пользователя
        const extraDetails = (safePrompt || '').trim();
        const tryOnDirective = extraDetails.length > 3
            ? `Одень одежду с первой фото на человека со второй фото. ${extraDetails}`
            : `Одень одежду с первой фото на человека со второй фото. Сохрани лицо, причёску и телосложение человека точно как на второй фото. Замени только одежду на ту что на первой фото.`;

        inputPayload = {
            prompt: tryOnDirective,
            image_urls: imageUrls,
            input_urls: imageUrls,
            image_url: templateImgUrl || publicPhotoUrl,
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

            const isVideoTask = targetModel.includes('pixverse') ||
                                targetModel.includes('kling') ||
                                targetModel.includes('gemini') ||
                                targetModel.includes('omni') ||
                                targetModel.includes('video') ||
                                targetModel.includes('runway') ||
                                targetModel.includes('luma') ||
                                targetModel.includes('hailuo');
            const isAudioTask = targetModel.includes('music') ||
                                targetModel.includes('suno') ||
                                targetModel.includes('audio') ||
                                targetModel.includes('elevenlabs') ||
                                targetModel.includes('fairytale');

            if (!taskId) {
                const failReason = (createData && (createData.msg || createData.message)) 
                    ? (createData.msg || createData.message) 
                    : `HTTP ${createRes.status}`;
                console.warn(`[Kie.ai Create Task Error for ${targetModel}]`, createData || createRes.status);
                return { failed: true, error: `Kie.ai: ${failReason}`, model: targetModel, isVideo: isVideoTask, isAudio: isAudioTask };
            }

            console.log(`[Kie.ai Hub] Задача создана (${targetModel}), taskId: ${taskId}, isVideo: ${isVideoTask}, isAudio: ${isAudioTask}. Ожидание результата...`);

            // Для видео и аудио моделей: делаем 1 быстрый опрос (1.5-3 сек). Если задача еще не завершена —
            // СРАЗУ возвращаем taskId клиенту для асинхронного поллинга со шкалой прогресса.
            // Это исключает 504 таймауты Vercel и зависания экрана на киоске.
            const maxWaitMs = (isVideoTask || isAudioTask) ? 3000 : 45000;
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
                                    if (Array.isArray(parsed.audio_urls)) resultUrls.push(...parsed.audio_urls);
                                    if (Array.isArray(parsed.audios)) {
                                        parsed.audios.forEach(a => {
                                            if (typeof a === 'string') resultUrls.push(a);
                                            else if (a && (a.url || a.audio_url || a.audioUrl)) resultUrls.push(a.url || a.audio_url || a.audioUrl);
                                        });
                                    }
                                    if (parsed.audio_url) resultUrls.push(parsed.audio_url);
                                    if (parsed.audioUrl) resultUrls.push(parsed.audioUrl);
                                    if (parsed.music_url) resultUrls.push(parsed.music_url);
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
                                        else if (parsed.output.audio_url) resultUrls.push(parsed.output.audio_url);
                                        else if (parsed.output.video_url) resultUrls.push(parsed.output.video_url);
                                        else if (parsed.output.url) resultUrls.push(parsed.output.url);
                                    }
                                }
                            } catch(e) {}
                        }
                        // Извлечение аудио-треков (гарантирует, что Вариант 1 и Вариант 2 — это РАЗНЫЕ треки от Suno, а не stream_audio_url одного трека)
                        const audioTracks = [];
                        const addAudioTrack = (u) => {
                            if (!u || typeof u !== 'string') return;
                            const s = u.trim();
                            if (!s) return;
                            if (!audioTracks.includes(s)) audioTracks.push(s);
                        };

                        const processAudioItem = (item) => {
                            if (!item) return;
                            if (typeof item === 'string') {
                                addAudioTrack(item);
                                return;
                            }
                            if (typeof item === 'object') {
                                // Главное: берем audio_url (основной MP3), и НЕ берем stream_audio_url того же трека
                                const mainAudio = item.audio_url || item.audioUrl || item.music_url;
                                if (mainAudio) {
                                    addAudioTrack(mainAudio);
                                    return;
                                }
                                if (item.stream_audio_url) {
                                    addAudioTrack(item.stream_audio_url);
                                    return;
                                }
                                if (item.url && (item.url.includes('.mp3') || item.url.includes('.wav') || item.url.includes('audio') || item.url.includes('suno'))) {
                                    addAudioTrack(item.url);
                                }
                            }
                        };

                        if (taskInfo.response) {
                            const resp = taskInfo.response;
                            if (Array.isArray(resp.data)) resp.data.forEach(processAudioItem);
                            if (Array.isArray(resp.resultUrls)) resp.resultUrls.forEach(processAudioItem);
                            if (resp.audio_url) addAudioTrack(resp.audio_url);
                            if (resp.audioUrl) addAudioTrack(resp.audioUrl);
                        }
                        if (taskInfo.data && Array.isArray(taskInfo.data)) {
                            taskInfo.data.forEach(processAudioItem);
                        }
                        if (taskInfo.resultJson) {
                            try {
                                const parsed = typeof taskInfo.resultJson === 'string' ? JSON.parse(taskInfo.resultJson) : taskInfo.resultJson;
                                if (parsed) {
                                    if (Array.isArray(parsed.data)) parsed.data.forEach(processAudioItem);
                                    if (Array.isArray(parsed.audios)) parsed.audios.forEach(processAudioItem);
                                    if (Array.isArray(parsed.audio_urls)) parsed.audio_urls.forEach(processAudioItem);
                                    if (Array.isArray(parsed.resultUrls)) parsed.resultUrls.forEach(processAudioItem);
                                    if (parsed.audio_url) addAudioTrack(parsed.audio_url);
                                    if (parsed.audioUrl) addAudioTrack(parsed.audioUrl);
                                }
                            } catch(e) {}
                        }
                        if (taskInfo.output) processAudioItem(taskInfo.output);
                        if (taskInfo.audio_url) addAudioTrack(taskInfo.audio_url);
                        if (taskInfo.audioUrl) addAudioTrack(taskInfo.audioUrl);

                        if (taskInfo.response) {
                            const resp = taskInfo.response;
                            if (Array.isArray(resp.resultUrls)) resultUrls.push(...resp.resultUrls);
                            if (Array.isArray(resp.data)) {
                                resp.data.forEach(item => {
                                    if (typeof item === 'string') resultUrls.push(item);
                                    else if (item && typeof item === 'object') {
                                        if (item.url) resultUrls.push(item.url);
                                        if (item.video_url) resultUrls.push(item.video_url);
                                        if (item.audio_url) resultUrls.push(item.audio_url);
                                    }
                                });
                            }
                            if (resp.video_url) resultUrls.push(resp.video_url);
                            if (resp.videoUrl) resultUrls.push(resp.videoUrl);
                            if (resp.url) resultUrls.push(resp.url);
                        }
                        if (taskInfo.data && Array.isArray(taskInfo.data)) {
                            taskInfo.data.forEach(item => {
                                if (typeof item === 'string') resultUrls.push(item);
                                else if (item && typeof item === 'object') {
                                    if (item.url) resultUrls.push(item.url);
                                    if (item.audio_url) resultUrls.push(item.audio_url);
                                }
                            });
                        }
                        if (taskInfo.output) {
                            if (typeof taskInfo.output === 'string') resultUrls.push(taskInfo.output);
                            else if (taskInfo.output.audio_url) resultUrls.push(taskInfo.output.audio_url);
                            else if (taskInfo.output.video_url) resultUrls.push(taskInfo.output.video_url);
                            else if (taskInfo.output.url) resultUrls.push(taskInfo.output.url);
                        }

                        if (isAudioTask || audioTracks.length > 0) {
                            const allAudio = audioTracks.length > 0 ? audioTracks : [...new Set(resultUrls.filter(u => typeof u === 'string' && Boolean(u.trim())))];
                            if (allAudio.length > 0) {
                                const cleanAudioUrls = await Promise.all(
                                    allAudio.slice(0, 2).map((url, idx) => persistResultToSupabase(url, `${orderId}_track${idx + 1}`, false))
                                );
                                console.log(`[Generate Audio] Найдено ${allAudio.length} уникальных треков. Вариант 1: ${cleanAudioUrls[0]}, Вариант 2: ${cleanAudioUrls[1] || 'нет'}`);
                                return {
                                    resultUrl: cleanAudioUrls[0],
                                    audioUrls: cleanAudioUrls,
                                    taskId,
                                    resolution: 'HD',
                                    model: targetModel,
                                    isVideo: false,
                                    isAudio: true
                                };
                            }
                        }

                        const finalMediaUrl = resultUrls.find(u => Boolean(u)) || 
                                              taskInfo.audio_url ||
                                              taskInfo.audioUrl ||
                                              taskInfo.video_url || 
                                              taskInfo.videoUrl || 
                                              taskInfo.image_url || 
                                              taskInfo.url;

                        if (finalMediaUrl) {
                            const cleanFinalUrl = await persistResultToSupabase(finalMediaUrl, orderId, isVideoTask);
                            return { resultUrl: cleanFinalUrl, taskId, resolution: (isVideoTask || isAudioTask) ? 'HD' : targetResolution, model: targetModel, isVideo: isVideoTask, isAudio: isAudioTask };
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
            return { pending: true, taskId, resolution: (isVideoTask || isAudioTask) ? 'HD' : targetResolution, model: targetModel, isVideo: isVideoTask, isAudio: isAudioTask };

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

    const strOrder = String(orderId);
    if (strOrder.startsWith('sim_') || strOrder.startsWith('test_')) {
        return { ok: true, isSimulation: true };
    }

    // Делаем до 4 попыток с задержкой 350мс на случай сетевой задержки репликации в Supabase Storage
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const checkRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/orders/${orderId}.json?_t=${Date.now()}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            if (checkRes.ok) {
                const orderData = await checkRes.json();
                if (orderData.status === 'PAID') {
                    return { ok: true, order: orderData };
                }
            }
        } catch (e) {
            console.warn(`[Order Verification Attempt ${attempt + 1}]`, e.message);
        }

        if (attempt < 3) {
            await new Promise(r => setTimeout(r, 350));
        }
    }

    return { ok: false, error: 'Заказ не оплачен или не подтвержден в базе данных. Пожалуйста, завершите оплату.' };
}

// Кэш активных задач по orderId для предотвращения дублирования генераций и списания лишних кредитов
const activeOrderTasks = new Map();

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
        const { photoData, videoUrl, guestVideoUrl, templateImg, prompt, model, title, price, orderId, location, isTryOn, resolution, aggregatorUrl, aggregatorKey, duration, isFairytale, fairytaleData } = body;

        // 0. Защита от дублирования запросов с одного киоска по одному и тому же заказу
        if (orderId && activeOrderTasks.has(orderId)) {
            const cached = activeOrderTasks.get(orderId);
            if (Date.now() - cached.timestamp < 120000 && cached.response) {
                console.log(`[AI Hub Deduplication] Заказ "${orderId}" уже запущен (taskId: ${cached.taskId}), отдаем существующий ответ без повторного вызова Kie.ai`);
                return res.status(200).json(cached.response);
            }
        }

        // 0b. Защита: строгая проверка оплаты заказа перед генерацией
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

        console.log(`[AI Hub] Запрос подтвержден и оплачен: "${title}", модель="${model || 'chatgpt-2.5'}", duration=${duration || 5}s, заказ="${orderId}"`);

        // Защита от списания кредитов Kie.ai без реальных данных
        const isMusicReq = (model === 'suno' || (typeof model === 'string' && (model.includes('suno') || model.includes('music') || model.includes('трек') || model.includes('песн'))));
        const isFairytaleReq = Boolean(isFairytale) || model === 'fairytale' || (typeof model === 'string' && (model.includes('fairytale') || model.includes('сказк') || model.includes('elevenlabs')));

        if (!isMusicReq && !isFairytaleReq && !photoData && !templateImg && !videoUrl && !guestVideoUrl) {
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

        if (!isMusicReq && !isFairytaleReq && !publicPhotoUrl && !publicTemplateUrl && !publicGuestVideoUrl) {
            console.log('[AI Hub] Изображения не загружены в CDN. Обращение к Kie.ai отменено для защиты кредитов.');
            return res.status(200).json({
                success: true,
                pending: false,
                state: 'fallback',
                message: 'Изображения не загружены'
            });
        }

        // Подбор активного Voice ID из Supabase settings для сказки
        let activeVoiceId = null;
        let fairytaleCoverUrl = null;
        let fairytaleNarrative = prompt;
        let selectedBgTrackUrl = null;
        let selectedBgTrackName = null;

        if (isFairytaleReq) {
            const langCode = (fairytaleData?.lang || 'ru').toLowerCase();
            try {
                const cfgRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/config/settings.json?_t=${Date.now()}`);
                if (cfgRes.ok) {
                    const cfg = await cfgRes.json();
                    let voiceList = [];
                    if (langCode === 'en' || langCode === 'english') {
                        voiceList = cfg.fairytale_voices_english || [];
                    } else if (langCode === 'kg' || langCode === 'kyrgyz') {
                        voiceList = cfg.fairytale_voices_kyrgyz || [];
                    } else {
                        voiceList = cfg.fairytale_voices_foreign || cfg.fairytale_voices_russian || [];
                    }

                    const activeVoices = (voiceList || []).filter(v => v.active !== false && (v.id || v.name));
                    if (activeVoices.length > 0) {
                        const randomVoice = activeVoices[Math.floor(Math.random() * activeVoices.length)];
                        activeVoiceId = randomVoice.id || randomVoice.name;
                    }

                    // Случайный выбор фоновой сказочной музыки (BGM)
                    let bgList = body.fairytaleBgTracks;
                    if (!Array.isArray(bgList) || bgList.length === 0) {
                        bgList = cfg.fairytale_bg_tracks || [];
                    }
                    const activeBgList = (bgList || []).filter(t => t && t.active !== false && t.url);
                    if (activeBgList.length > 0) {
                        const randomBg = activeBgList[Math.floor(Math.random() * activeBgList.length)];
                        selectedBgTrackUrl = randomBg.url;
                        selectedBgTrackName = randomBg.name || 'Сказочная мелодия';
                        console.log(`[AI Hub] Выбран случайный фоновый трек сказки: "${selectedBgTrackName}" (${selectedBgTrackUrl})`);
                    }
                }
            } catch(e) {
                console.warn('[AI Hub] Не удалось загрузить голоса/треки из Supabase settings:', e.message);
            }

            if (!activeVoiceId) {
                if (langCode === 'en' || langCode === 'english') {
                    const enVoices = ['pNInz6obpgDQGcFmaJgB', 'EXAVITQu4vr4xnSDxMaL', 'IKne3meq5aSn9XLyUdCD', '21m00Tcm4TlvDq8ikWAM', 'CwhRBWXzGAHq8TQ4Fs17'];
                    activeVoiceId = enVoices[Math.floor(Math.random() * enVoices.length)];
                } else if (langCode === 'kg' || langCode === 'kyrgyz') {
                    const kgVoices = ['James', 'Arnold', 'Adam'];
                    activeVoiceId = kgVoices[Math.floor(Math.random() * kgVoices.length)];
                } else {
                    const ruVoices = ['JBFqnCBsd6RMkjVDRZzb', 'pNInz6obpgDQGcFmaJgB', '21m00Tcm4TlvDq8ikWAM', 'EXAVITQu4vr4xnSDxMaL'];
                    activeVoiceId = ruVoices[Math.floor(Math.random() * ruVoices.length)];
                }
            }

            if (fairytaleData) {
                const child = (fairytaleData.childName || 'малыш').trim();
                const theme = (fairytaleData.theme || 'волшебные приключения').trim();
                const mood = (fairytaleData.mood || 'добрая сказка').trim();

                if (langCode === 'en' || langCode === 'english') {
                    fairytaleNarrative = `Once upon a time, in a peaceful world filled with wonder and twinkling stars, there lived a brave and kind-hearted explorer named ${child}. ${child} had a curious spirit and dreamed of extraordinary journeys. One magical evening, an enchanted glowing portal opened wide, leading into a secret kingdom all about ${theme}. The atmosphere was warm and breathtaking, with soft golden sparkles drifting in the air. Showing a truly ${mood} character, ${child} stepped forward with courage, helped a little forest creature in need, and unlocked the grand secret of the enchanted realm. Together with cheerful magical friends, ${child} brought harmony and dazzling light back to the kingdom. From that day on, everyone knew that kindness, a brave heart, and believing in dreams can create the greatest magic of all!`;
                } else if (langCode === 'kg' || langCode === 'kyrgyz') {
                    fairytaleNarrative = `Бир бар экен, бир жок экен, илгери-илгери өткөн заманда, асман тиреген бийик тоолордун арасында ${child} аттуу өтө адептүү, акылдуу жана боорукер бала жашаптыр. Анын эң чоң кыялы — ${theme} тууралуу кереметтүү сырларды ачуу экен. Бир күнү таң заарда тоо башынан сыйкырдуу алтын нурлар чачырап, жомоктогудай керемет дүйнөнүн эшиги ачылат. Ал жерде ${mood} мүнөзү менен өзгөчөлөнгөн ${child} эч бир кыйынчылыктан коркпой, жаңы досторуна чын жүрөктөн жардам берип, өзүнүн эр жүрөктүүлүгүн жана тапкычтыгын көрсөтөт. Бардык тоскоолдуктар жеңилип, сыйкырдуу өлкөгө бейпилдик жана чексиз кубаныч орнойт. Ошондон бери ${child} таза жүрөк, жакшылык жана бекем достук эң чоң кереметтерди жаратарын жакшы билет!`;
                } else {
                    fairytaleNarrative = `В одном уютном и светлом городке жил любознательный и смелый герой по имени ${child}. Больше всего на свете ${child} любил мечтать и искренне верил в настоящие чудеса. И вот однажды, когда на вечернем небе зажглись первые золотистые звезды, перед ним открылась тайная тропинка в сказочную страну, где развернулась удивительная история про ${theme}. Вокруг парили светящиеся искорки, а воздух был наполнен предвкушением волшебства. В этом удивительном путешествии во всей красе проявился ${mood} характер нашего героя: ${child} смело шагнул навстречу приключениям, протянул руку помощи новым друзьям и помог разгадать древнюю добрую тайну. Благодаря дружбе и доброте все преграды растаяли, а сказочный мир засиял яркими праздничными огнями. С тех пор ${child} твердо знает: искреннее сердце, смелость и доброта способны сотворить самое настоящее чудо!`;
                }
            }

            // Создание персонализированной обложки книги сказок с лицом ребенка
            if (publicPhotoUrl) {
                try {
                    fairytaleCoverUrl = await generateFairytaleCover({
                        apiKey: effectiveApiKey,
                        photoUrl: publicPhotoUrl,
                        childName: fairytaleData?.childName,
                        theme: fairytaleData?.theme,
                        mood: fairytaleData?.mood,
                        langCode,
                        orderId
                    });
                } catch (covErr) {
                    console.warn('[AI Hub] Ошибка генерации обложки сказки:', covErr.message);
                }
                if (!fairytaleCoverUrl) {
                    fairytaleCoverUrl = publicPhotoUrl;
                }
            }
        }

        // 2. Для аудиосказки: приоритетный вызов официального ElevenLabs 4 (eleven_v4)
        let generationOutcome = null;

        if (isFairytaleReq) {
            let elKey = body.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY;
            let elModel = body.elevenlabsModel || 'eleven_v4';

            if (!elKey) {
                try {
                    const cfgRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/config/settings.json?_t=${Date.now()}`);
                    if (cfgRes.ok) {
                        const cfg = await cfgRes.json();
                        if (cfg.elevenlabs_api_key) elKey = cfg.elevenlabs_api_key;
                        if (cfg.elevenlabs_model) elModel = cfg.elevenlabs_model;
                    }
                } catch (e) { }
            }

            if (elKey) {
                console.log(`[AI Hub] Вызов официального ElevenLabs 4 (${elModel}) для сказки (voice: ${activeVoiceId})...`);
                generationOutcome = await generateViaElevenLabsDirect({
                    apiKey: elKey,
                    voiceId: activeVoiceId,
                    text: fairytaleNarrative || prompt,
                    orderId,
                    modelId: elModel,
                    bgTrackUrl: selectedBgTrackUrl,
                    customCoverUrl: fairytaleCoverUrl
                });
            }
        }

        // Если прямой вызов не был настроен или не вернул результат — запуск через Kie.ai
        if (!generationOutcome) {
            generationOutcome = effectiveKey ? await generateViaKie({
                apiKey: effectiveKey,
                model: isFairytaleReq ? 'elevenlabs/text-to-speech-multilingual-v2' : (model || 'chatgpt-2.5'),
                prompt: fairytaleNarrative || prompt,
                publicPhotoUrl,
                guestVideoUrl: publicGuestVideoUrl,
                templateImgUrl: publicTemplateUrl,
                isTryOn: Boolean(isTryOn),
                isFairytale: isFairytaleReq,
                fairytaleData,
                voiceId: activeVoiceId,
                resolution: targetResolution,
                orderId,
                title,
                duration
            }) : null;
        }

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

        // Если задача ещё в процессе (OpenAI / Suno) — возвращаем статус pending для поллинга
        if (generationOutcome && generationOutcome.pending) {
            const pendingResp = {
                success: true,
                pending: true,
                state: 'generating',
                taskId: generationOutcome.taskId,
                orderId,
                apiKey: effectiveKey,
                resolution: generationOutcome.resolution || targetResolution,
                model: effectiveModelName,
                isVideo: Boolean(generationOutcome && generationOutcome.isVideo),
                audioUrl: null,
                speechText: '',
                message: isMusicReq ? 'Создание персонального трека выполняется...' : `Генерация через ${effectiveModelName} выполняется...`
            };

            if (orderId && generationOutcome.taskId) {
                activeOrderTasks.set(orderId, {
                    taskId: generationOutcome.taskId,
                    timestamp: Date.now(),
                    response: pendingResp
                });
            }

            return res.status(200).json(pendingResp);
        }

        let generatedImageUrl = generationOutcome?.resultUrl || generationOutcome?.mediaUrl || null;
        if (generatedImageUrl && !generatedImageUrl.includes('supabase.co')) {
            generatedImageUrl = await persistResultToSupabase(generatedImageUrl, orderId, Boolean(generationOutcome?.isVideo));
        }

        // Если это аудиозадача (сказка ElevenLabs или трек Suno)
        if (generationOutcome && generationOutcome.isAudio && generatedImageUrl) {
            if (isFairytaleReq) {
                try {
                    const videoUrl = await assembleFairytaleVideo({
                        voiceUrl: generatedImageUrl,
                        text: fairytaleNarrative || prompt,
                        bgTrackUrl: selectedBgTrackUrl,
                        orderId,
                        customCoverUrl: fairytaleCoverUrl
                    });
                    if (videoUrl) {
                        return res.status(200).json({
                            success: true,
                            pending: false,
                            state: 'success',
                            orderId,
                            taskId: generationOutcome?.taskId || null,
                            model: effectiveModelName,
                            resultUrl: videoUrl,
                            mediaUrl: videoUrl,
                            videoUrl: videoUrl,
                            audioUrl: generatedImageUrl,
                            coverUrl: fairytaleCoverUrl,
                            isVideo: true,
                            isFairytale: true,
                            title: title || 'Волшебная сказка',
                            message: `Сказка с видеообложкой и субтитрами создана через ${effectiveModelName}`
                        });
                    }
                } catch (e) {
                    console.warn('[AI Hub] Не удалось собрать видеосказку из Kie аудио:', e.message);
                }
            }

            return res.status(200).json({
                success: true,
                pending: false,
                state: 'success',
                orderId,
                taskId: generationOutcome?.taskId || null,
                model: effectiveModelName,
                resultUrl: generatedImageUrl,
                audioUrls: generationOutcome.audioUrls || [generatedImageUrl],
                coverUrl: fairytaleCoverUrl,
                isAudio: true,
                bgTrackUrl: selectedBgTrackUrl,
                bgTrackName: selectedBgTrackName,
                title: title || 'Аудиосказка',
                message: `Успешно создано через ${effectiveModelName}`
            });
        }

        // Защита: ни при каких обстоятельствах не подменять результат видео/фото шаблоном!
        if (!generatedImageUrl) {
            console.warn(`[AI Hub] Модель ${effectiveModelName} не вернула результат генерации`);
            return res.status(200).json({
                success: false,
                error: generationOutcome?.error || (isMusicReq ? 'Не удалось создать трек. Пожалуйста, попробуйте еще раз.' : `Не удалось сгенерировать медиа через ${effectiveModelName}. Пожалуйста, попробуйте еще раз.`),
                model: effectiveModelName,
                orderId
            });
        }

        const isVideoFinal = Boolean(generationOutcome?.isVideo) ||
            (typeof generatedImageUrl === 'string' && (generatedImageUrl.endsWith('.mp4') || generatedImageUrl.includes('.mp4?')));

        return res.status(200).json({
            success: true,
            pending: false,
            state: 'success',
            orderId,
            taskId: generationOutcome?.taskId || null,
            model: effectiveModelName,
            resolution: generationOutcome?.resolution || targetResolution,
            title: title || (isFairytaleReq ? 'Волшебная сказка' : 'Портрет'),
            prompt: prompt || '',
            location: location || '',
            isTryOn: Boolean(isTryOn),
            isVideo: isVideoFinal,
            isFairytale: Boolean(isFairytaleReq),
            resultUrl: generatedImageUrl,
            mediaUrl: generatedImageUrl,
            videoUrl: isVideoFinal ? generatedImageUrl : null,
            audioUrl: null,
            speechText: '',
            mode: effectiveKey ? 'live' : 'preview',
            message: `Успешно сгенерировано через ${effectiveModelName}`
        });
    } catch (err) {
        console.error('[AI Gateway Error]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

