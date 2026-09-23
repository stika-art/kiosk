// ============================================================
// TRENDUM KIOSK — ADMIN AUTHENTICATION SERVICE
// Защищенная проверка PIN-кода администратора на стороне сервера
// ============================================================

const crypto = require('crypto');

const AUTH_SECRET = process.env.ADMIN_AUTH_SECRET || process.env.SUPABASE_ANON_KEY || 'trendum-kiosk-secret-key-2026';
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

function generateSessionToken() {
    const dayBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return crypto.createHmac('sha256', AUTH_SECRET)
        .update(`admin-auth-session-${dayBucket}`)
        .digest('hex');
}

function verifySessionToken(token) {
    if (!token || typeof token !== 'string') return false;
    const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    
    for (const day of [currentDay, currentDay - 1]) {
        const expected = crypto.createHmac('sha256', AUTH_SECRET)
            .update(`admin-auth-session-${day}`)
            .digest('hex');
        const bufA = Buffer.from(token);
        const bufB = Buffer.from(expected);
        if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
            return true;
        }
    }
    return false;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const query = req.query || {};

        const action = body.action || query.action || 'login';

        // 1. Проверка существующего токена сессии
        if (action === 'verify') {
            const token = body.token || query.token || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '');
            const isValid = verifySessionToken(token);
            return res.status(200).json({ success: true, valid: isValid });
        }

        // 2. Вход по PIN-коду
        if (req.method === 'POST') {
            const inputPin = String(body.pin || '').trim();

            if (!inputPin) {
                return res.status(400).json({ success: false, error: 'Введите PIN-код' });
            }

            const isMatch = (inputPin.length === ADMIN_PIN.length) &&
                crypto.timingSafeEqual(Buffer.from(inputPin), Buffer.from(ADMIN_PIN));

            if (isMatch) {
                const token = generateSessionToken();
                console.log('[Admin Auth] Успешная авторизация администратора');
                return res.status(200).json({
                    success: true,
                    token,
                    message: 'Авторизация успешна'
                });
            } else {
                console.warn('[Admin Auth Warning] Попытка входа с неверным PIN-кодом');
                return res.status(401).json({
                    success: false,
                    error: 'Неверный PIN-код администратора'
                });
            }
        }

        return res.status(405).json({ success: false, error: 'Метод не поддерживается' });
    } catch (err) {
        console.error('[Admin Auth Error]', err);
        return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
};
