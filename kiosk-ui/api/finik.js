const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FINIK_HOST = process.env.FINIK_HOST || 'api.acquiring.averspay.kg';
const FINIK_API_KEY = process.env.FINIK_API_KEY || 'zDN9eKsniY6urxK2FAMxW1iy7CUhIARA3tpCkdf3';
const FINIK_ACCOUNT_ID = process.env.FINIK_ACCOUNT_ID || 'aa01a640-66ec-417f-895d-ba9d988fab18';
const FINIK_REDIRECT_URL = process.env.FINIK_REDIRECT_URL || 'https://kiosk394.vercel.app/kiosk-ui/';

// Публичный ключ Finik для валидации входящих вебхуков
const FINIK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuF/PUmhMPPidcMxhZBPb
BSGJoSphmCI+h6ru8fG8guAlcPMVlhs+ThTjw2LHABvciwtpj51ebJ4EqhlySPyT
hqSfXI6Jp5dPGJNDguxfocohaz98wvT+WAF86DEglZ8dEsfoumojFUy5sTOBdHEu
g94B4BbrJvjmBa1YIx9Azse4HFlWhzZoYPgyQpArhokeHOHIN2QFzJqeriANO+wV
aUMta2AhRVZHbfyJ36XPhGO6A5FYQWgjzkI65cxZs5LaNFmRx6pjnhjIeVKKgF99
4OoYCzhuR9QmWkPl7tL4Kd68qa/xHLz0Psnuhm0CStWOYUu3J7ZpzRK8GoEXRcr8
tQIDAQAB
-----END PUBLIC KEY-----`;

function getPrivateKey() {
    if (process.env.FINIK_PRIVATE_KEY) {
        return process.env.FINIK_PRIVATE_KEY.replace(/\\n/g, '\n');
    }
    const certPath = path.join(process.cwd(), 'certs', 'finik_private_key.pem');
    if (fs.existsSync(certPath)) {
        return fs.readFileSync(certPath, 'utf8');
    }
    return null;
}

function signFinikRequest({ method, path: reqPath, host, apiKey, timestamp, body }) {
    const httpMethod = method.toLowerCase();
    const cleanPath = decodeURI(reqPath);
    
    const xApiHeaders = {
        'x-api-key': apiKey,
        'x-api-timestamp': timestamp.toString()
    };
    const sortedKeys = Object.keys(xApiHeaders).sort();
    const headerParts = ['host:' + host];
    for (const k of sortedKeys) {
        headerParts.push(k + ':' + xApiHeaders[k]);
    }
    const headersData = headerParts.join('&');
    
    const sortedBody = {};
    Object.keys(body || {}).sort().forEach(k => {
        sortedBody[k] = body[k];
    });
    const jsonBody = JSON.stringify(sortedBody);
    
    const canonicalString = [httpMethod, cleanPath, headersData, jsonBody].join('\n');
    
    const privateKey = getPrivateKey();
    if (!privateKey) {
        throw new Error('Finik private key not found');
    }
    
    const signer = crypto.createSign('SHA256');
    signer.update(canonicalString, 'utf8');
    const signature = signer.sign(privateKey, 'base64');
    
    return { signature, sortedBody, jsonBody };
}

async function createFinikPayment({ amount, orderId, templateTitle, accountId }) {
    const apiKey = FINIK_API_KEY;
    const host = FINIK_HOST;
    const timestamp = Date.now().toString();
    const reqPath = '/v1/payment';
    
    const targetAccountId = accountId || FINIK_ACCOUNT_ID;
    const body = {
        Amount: Math.round(Number(amount)),
        CardType: 'FINIK_QR',
        PaymentId: orderId,
        RedirectUrl: FINIK_REDIRECT_URL,
        Data: {
            accountId: targetAccountId,
            name_en: 'Trendum Kiosk',
            description: templateTitle || 'Photo',
            webhookUrl: 'https://kiosk394.vercel.app/api/payment/finik-callback'
        }
    };
    
    const { signature, jsonBody } = signFinikRequest({
        method: 'POST',
        path: reqPath,
        host,
        apiKey,
        timestamp,
        body
    });
    
    const url = 'https://' + host + reqPath;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Host': host,
            'x-api-key': apiKey,
            'x-api-timestamp': timestamp,
            'signature': signature
        },
        body: jsonBody,
        redirect: 'manual'
    });
    
    const location = response.headers.get('location');
    if (location) {
        return {
            success: true,
            orderId,
            paymentUrl: location,
            qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(location)
        };
    }
    
    const resText = await response.text();
    console.error('Finik payment creation failed:', response.status, resText);
    throw new Error('Finik error [' + response.status + ']: ' + resText);
}

module.exports = {
    FINIK_PUBLIC_KEY,
    signFinikRequest,
    createFinikPayment,
    getPrivateKey
};
