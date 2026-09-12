const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

// Хранилище заказов для эквайринга oBusiness / ELQR в памяти сервера
const ordersDB = {};

const server = http.createServer(async (req, res) => {
    // API МАРШРУТЫ ДЛЯ ЭКВАЙРИНГА FINIK / ELQR
    if (req.url.startsWith('/api/payment/create') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const orderId = 'TRD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                const amount = Number(data.amount) || 290;
                const templateTitle = data.templateTitle || 'AI Photo';

                let qrImageUrl = '';
                let paymentUrl = '';

                // Пытаемся вызвать реальный Finik Acquiring API
                try {
                    const { createFinikPayment } = require('../api/finik');
                    const finikRes = await createFinikPayment({ amount, orderId, templateTitle });
                    qrImageUrl = finikRes.qrImageUrl;
                    paymentUrl = finikRes.paymentUrl;
                } catch (finikErr) {
                    console.log('[Finik] Локальный тестовый режим ELQR (пока ключ настраивается):', finikErr.message);
                    paymentUrl = `https://qr.finik.kg/#orderId=${orderId}&amount=${amount}&title=${encodeURIComponent(templateTitle)}`;
                    qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentUrl)}`;
                }

                // Регистрируем заказ в памяти
                ordersDB[orderId] = {
                    orderId,
                    amount,
                    templateTitle,
                    status: 'PENDING',
                    paymentUrl,
                    qrImageUrl,
                    createdAt: new Date().toISOString()
                };

                // Сохраняем в Supabase для облачной синхронизации
                try {
                    const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
                    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
                    await fetch(`${SUPABASE_URL}/storage/v1/object/kiosk-media/orders/${orderId}.json`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'x-upsert': 'true'
                        },
                        body: JSON.stringify(ordersDB[orderId])
                    });
                } catch(e) {}

                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({
                    success: true,
                    orderId,
                    amount,
                    status: 'PENDING',
                    qrPayload: paymentUrl,
                    qrImageUrl
                }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    if (req.url.startsWith('/api/payment/status') && req.method === 'GET') {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const orderId = urlObj.searchParams.get('orderId');
        let order = ordersDB[orderId];

        // Если в локальной памяти статус еще не PAID, проверяем облачный Supabase
        if (!order || order.status !== 'PAID') {
            try {
                const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
                const sRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/kiosk-media/orders/${orderId}.json?_t=${Date.now()}`);
                if (sRes.ok) {
                    const cloudData = await sRes.json();
                    if (cloudData && cloudData.status === 'PAID') {
                        if (!order) ordersDB[orderId] = cloudData;
                        ordersDB[orderId].status = 'PAID';
                        order = ordersDB[orderId];
                    }
                }
            } catch(e) {}
        }

        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });

        if (!order) {
            res.end(JSON.stringify({ success: false, error: 'Order not found', status: 'PENDING' }));
        } else {
            res.end(JSON.stringify({ success: true, orderId: order.orderId, status: order.status }));
        }
        return;
    }

    // ВЕБХУК: Finik / AversPay отправляет уведомление об оплате
    if ((req.url.startsWith('/api/payment/webhook') || req.url.startsWith('/api/payment/finik-callback')) && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            console.log(`[Finik Webhook] Получены данные:`, body);
            try {
                const hookData = JSON.parse(body || '{}');
                const orderId = hookData.PaymentId || hookData.paymentId || (hookData.Data && hookData.Data.orderId) || hookData.id || hookData.orderId;
                
                if (orderId) {
                    if (!ordersDB[orderId]) ordersDB[orderId] = { orderId };
                    ordersDB[orderId].status = 'PAID';
                    ordersDB[orderId].paidAt = new Date().toISOString();
                    console.log(`[Finik Webhook] Заказ ${orderId} успешно подтвержден (PAID)`);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Webhook processed' }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }
                

    // Тестовая ручка для симуляции оплаты (вызывается кнопкой "Тест оплата" в киоске)
    if (req.url.startsWith('/api/payment/simulate-success') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const orderId = data.orderId;
                if (orderId && ordersDB[orderId]) {
                    ordersDB[orderId].status = 'PAID';
                    console.log(`[Simulate] Заказ ${orderId} переведен в статус PAID`);
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, status: 'PAID' }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }

    // Очищаем URL от параметров ?v=9999 для правильного поиска файлов на диске Windows
    const cleanPath = req.url.split('?')[0];
    let reqPath = cleanPath === '/' ? '/index.html' : cleanPath;
    if (cleanPath === '/admin' || cleanPath === '/admin/') {
        reqPath = '/admin.html';
    }
    let filePath = path.join(PUBLIC_DIR, reqPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`  TRENDUM KIOSK SERVER IS RUNNING ON PORT ${PORT}`);
    console.log(`  Access from Kiosk: http://192.168.0.100:${PORT}`);
    console.log(`===================================================`);
});
