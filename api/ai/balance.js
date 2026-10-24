// ========================================================
// TRENDUM AI — API КРЕДИТОВ И БАЛАНСОВ (ELEVENLABS & KIE.AI)
// ========================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'kiosk-media';

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, xi-api-key, x-api-key');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const provider = (req.query.provider || req.body?.provider || 'elevenlabs').toLowerCase();
    let apiKey = req.query.apiKey || req.body?.apiKey;

    // Если ключ не передан явно — попробуем прочитать из Supabase settings.json
    if (!apiKey) {
        try {
            const cfgRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/config/settings.json?_t=${Date.now()}`);
            if (cfgRes.ok) {
                const cfg = await cfgRes.json();
                if (provider === 'elevenlabs' || provider === 'eleven') {
                    apiKey = cfg.elevenlabs_api_key;
                } else if (provider === 'kie') {
                    apiKey = cfg.aggregator_key;
                }
            }
        } catch (e) {
            console.warn('[Balance API] Не удалось прочитать settings.json:', e.message);
        }
    }

    if (!apiKey && provider === 'elevenlabs') {
        apiKey = process.env.ELEVENLABS_API_KEY;
    }

    if (!apiKey) {
        return res.status(200).json({
            success: false,
            error: 'API-ключ не указан. Введите ключ в настройках админ-панели.'
        });
    }

    // 1. БАЛАНС ELEVENLABS (СИМВОЛЫ И ТАРИФ)
    if (provider === 'elevenlabs' || provider === 'eleven') {
        try {
            const elRes = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
                headers: {
                    'xi-api-key': apiKey.trim()
                }
            });

            if (!elRes.ok) {
                const errText = await elRes.text();
                let errMsg = `Ошибка ElevenLabs (HTTP ${elRes.status})`;
                try {
                    const errJson = JSON.parse(errText);
                    errMsg = errJson.detail?.message || errJson.message || errMsg;
                } catch (_) {}
                return res.status(200).json({
                    success: false,
                    error: errMsg
                });
            }

            const sub = await elRes.json();
            const used = Number(sub.character_count) || 0;
            const limit = Number(sub.character_limit) || 0;
            const remaining = Math.max(0, limit - used);
            const percentUsed = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            const percentRemaining = 100 - percentUsed;

            const formatNum = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

            return res.status(200).json({
                success: true,
                provider: 'elevenlabs',
                tier: sub.tier || 'free',
                status: sub.status || 'active',
                usedCharacters: used,
                totalCharacters: limit,
                remainingCharacters: remaining,
                percentUsed,
                percentRemaining,
                formattedRemaining: `${formatNum(remaining)} символов`,
                formattedTotal: `${formatNum(limit)} символов`,
                formattedUsed: `${formatNum(used)} символов`,
                summary: `${formatNum(remaining)} из ${formatNum(limit)} символов (${sub.tier || 'активен'})`,
                nextResetUnix: sub.next_character_count_reset_unix || null
            });
        } catch (err) {
            console.error('[Balance API ElevenLabs Error]:', err);
            return res.status(200).json({
                success: false,
                error: `Ошибка запроса к ElevenLabs: ${err.message}`
            });
        }
    }

    // 2. БАЛАНС KIE.AI (КРЕДИТЫ)
    if (provider === 'kie') {
        try {
            const kieRes = await fetch('https://api.kie.ai/api/v1/chat/credit', {
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`
                }
            });

            if (!kieRes.ok) {
                return res.status(200).json({
                    success: false,
                    error: `Ошибка Kie.ai (HTTP ${kieRes.status})`
                });
            }

            const data = await kieRes.json();
            const credits = data.data !== undefined ? data.data : 0;
            const usd = (credits * 0.005).toFixed(2);

            return res.status(200).json({
                success: true,
                provider: 'kie',
                credits,
                usd,
                formatted: `${credits} кредитов ($${usd})`
            });
        } catch (err) {
            console.error('[Balance API Kie Error]:', err);
            return res.status(200).json({
                success: false,
                error: `Ошибка запроса к Kie.ai: ${err.message}`
            });
        }
    }

    return res.status(400).json({ error: 'Неизвестный провайдер (ожидается elevenlabs или kie)' });
};
