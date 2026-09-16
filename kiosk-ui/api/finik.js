const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FINIK_HOST = process.env.FINIK_HOST || 'api.acquiring.averspay.kg';
const FINIK_API_KEY = process.env.FINIK_API_KEY || '8OKS0ggRVk7VjNl5FVCVy3wVokxcVHqG7RcHIYwd';
const FINIK_ACCOUNT_ID = process.env.FINIK_ACCOUNT_ID || 'cd47050e-1ea8-4bc8-86fd-acd1b1f0e746';
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

const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCxwMcxGhzAtLKf
ZGdnr0yD6Wwkvq89+8Y5ReoSn3roIilbPdu/exyAo9kgRCUhVSiDEfzavtsbe1bQ
kkkHylqWsXNG4L60wupYd+V8AJ0D0Fp6YzipsK3wosTtSAdcAKzxSUl1DlgtbY0M
URHYHJys35EBEaPefFIKg4UNOBGeIHEB/OY5xwMMtaEHZakJNa4mx5V6B0HePdF0
AHUazAz3sV+V2JOqrbMS01Ies1rk3B6Xo1yrBn8xrVZ4Q+ov1yI6PrZr2ygE7iXX
pL81kbiQTt/aENDh9qgvHlAW6eps0sYuQOEwQzZUT55Nqz6Zql0k7kshzdjFkIA4
MM8YxU8ZAgMBAAECggEAOmutLA60f4OEJ43kzHeZcstvjx4a04jh6+X2GhvPVecQ
Z5wLksHgKslvLcMn3u4xq+5oB+7tbXlanZ9OoGBZ6Kg2xodMNnXPdrclNd2vvVan
vgzJTUAz0uB0T7Y6MPtJ292l5nKJ+ZhFYNRuRHSW69xouIy3KoL6pdj3DFKuu6TK
CR5PVzbzfGrVk/NyUW80ZDjqtcQQwIUQPNYUIu1TCpz9yxhR8NUqFOC2DL7DF9J5
lS2gBcLq48FrUDlnOq8bnWdwHIgtC4jmdUT9VG0xmt9Bc8xDj1m+Iil8SgU9XVmT
V9zlV6XM+/i74g0D1MP+waoPl6Ij1YaE388n+E2hfwKBgQDrXVO5G3+IEzehv/wq
cS+BPFIpn8uDMgpa3VCK9Tw+Z8zIuVEYp4LGFJUZxnuWBiBXQ4JjuXUbQD6oSeP
mZYACySOfPmGbP8uNovV9D3yiXkhxaa80giZ1DKVD8Loca+nHkSkz6NUJAEIysqU
WrYHqhjOJvFUdAkKO+Aq2YSZ6wKBgQDBVmGWKjDLkbyt8g8EAwyvRFquN4jOz8mO
wJcldEYoA9jGg9yUNSIAfJbWOrTf6v0cE78CZ7lISTHjMs1S/D+rCQoUxk7a0WSQ
nmZmrhmKux9Ow0uznm9iafjREyZruNezrlD5dqz8P+RI+TaViGCAFIjltaCv/Quc
6tx/JemWCwKBgFvcyi+mXulSbtUv5JEAKkVrsLnUR49GOaprVONYCJvhIdTImulN
AFhePsv4jbNsKOxc0HzEjEmT3dz0h0dR76zGrJb8ijuAUTzNR1jTglYmd+PJjCGI
bJj1rGRniXBF5wP4GVymOh4+CzVOSTEMEp39Mr9Ljcejnl+jLQQsb8fPAoGBAKMe
vIsz4aN/vI+OUTjzUbp2k4O1+0lyav50Y5IIPkD4recfzfWFtsBuXd01/vGFlDQi
POBMnzjr+JlWfYHsrdMid0z73AAm9xBFdORhM8+m/U043SAZJqUEABh2bc4pUGSb
SFqR1HWnenZPPcyAGds2eCJHUeHqP+gPCCaG2EPtAoGBAND/fyNiotE3auf6wKXQ
80Hc/oY5zAywwhq2Pnca5IUc7uvw9ypAJwzmdS3FQ8H8Gd66maW31NUFk4DowRYk
Gm/DuzXDMnpuO3cKr3LMCtsesrdd0avwU2VusazrK4UPbqLaXWn4tJXOpDVJAVkt
yXfyqsSYYC2mB9GBfQdpn20J
-----END PRIVATE KEY-----`;

function getPrivateKey() {
    if (process.env.FINIK_PRIVATE_KEY) {
        return process.env.FINIK_PRIVATE_KEY.replace(/\\n/g, '\n');
    }
    const certPath = path.join(process.cwd(), 'certs', 'finik_private_key.pem');
    if (fs.existsSync(certPath)) {
        return fs.readFileSync(certPath, 'utf8');
    }
    return DEFAULT_PRIVATE_KEY;
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
    
    const sortedBody = Object.entries(body || {})
        .sort((a, b) => a[0].localeCompare(b[0]))
        .reduce((res, [k, v]) => { res[k] = v; return res; }, {});
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
        redirect: 'manual',
        signal: AbortSignal.timeout(4000)
    });
    
    const location = response.headers.get('location');
    if (location) {
        let qrImageUrl = '';
        try {
            const pageRes = await fetch(location, { signal: AbortSignal.timeout(3000) });
            const html = await pageRes.text();
            const start = html.indexOf('data:image');
            if (start !== -1) {
                const end = html.indexOf('"', start);
                qrImageUrl = html.slice(start, end);
            }
        } catch (e) {
            console.warn('Failed to extract base64 QR from Finik page:', e.message);
        }

        return {
            success: true,
            orderId,
            paymentUrl: location,
            qrImageUrl: qrImageUrl || ('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(location))
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
