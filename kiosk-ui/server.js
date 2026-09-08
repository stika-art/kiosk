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

const server = http.createServer((req, res) => {
    // API МАРШРУТЫ ДЛЯ ЭКВАЙРИНГА OBUSINESS / ELQR
    if (req.url.startsWith('/api/payment/create') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const orderId = 'TRD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                const amount = Number(data.amount) || 290;
                const templateTitle = data.templateTitle || 'AI Photo';

                // Регистрируем заказ в памяти (в дальнейшем сюда передаются данные от реального oBusiness API)
                ordersDB[orderId] = {
                    orderId,
                    amount,
                    templateTitle,
                    status: 'PENDING', // PENDING -> PAID -> FAILED
                    createdAt: new Date().toISOString()
                };

                // В боевом режиме здесь будет вызов реального oBusiness API:
                // const qrData = await callOBusinessCreateOrder({ orderId, amount, ... });
                // Сейчас формируем ответ со ссылкой на генерацию ELQR QR-кода
                const qrPayload = `elqr://pay?orderId=${orderId}&amount=${amount}&merchant=TRENDUM`;
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrPayload)}`;

                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({
                    success: true,
                    orderId,
                    amount,
                    status: 'PENDING',
                    qrPayload,
                    qrImageUrl
                }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (req.url.startsWith('/api/payment/status') && req.method === 'GET') {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const orderId = urlObj.searchParams.get('orderId');
        const order = ordersDB[orderId];

        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });

        if (!order) {
            res.end(JSON.stringify({ success: false, error: 'Order not found', status: 'NOT_FOUND' }));
        } else {
            res.end(JSON.stringify({ success: true, orderId: order.orderId, status: order.status }));
        }
        return;
    }

    // ВЕБХУК: oBusiness отправляет уведомление об успешной оплате
    if (req.url.startsWith('/api/payment/webhook') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            console.log(`[oBusiness Webhook] Получены данные:`, body);
            try {
                const hookData = JSON.parse(body || '{}');
                const orderId = hookData.orderId || hookData.order_id || hookData.account;
                
                if (orderId && ordersDB[orderId]) {
                    ordersDB[orderId].status = 'PAID';
                    ordersDB[orderId].paidAt = new Date().toISOString();
                    console.log(`[oBusiness Webhook] Заказ ${orderId} успешно подтвержден (PAID)`);
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
