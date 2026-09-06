// Temporary CDP-based smoke test for card clicks (delete after use)
const { spawn } = require('child_process');
const http = require('http');

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const URL = process.argv[2] || 'http://localhost:3000/';

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run',
  '--user-data-dir=' + require('os').tmpdir() + '\\cdp_profile_' + Date.now(),
  '--window-size=1080,1920', 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(path) {
  return new Promise((res, rej) => http.get(`http://127.0.0.1:${PORT}${path}`, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej));
}

(async () => {
  let targets;
  for (let i = 0; i < 40; i++) { try { targets = await getJson('/json'); break; } catch { await sleep(250); } }
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map(); const logs = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled') logs.push('[console] ' + m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Runtime.exceptionThrown') logs.push('[EXCEPTION] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL });
  await sleep(2500);

  const report = await evalJs(`(() => {
    const out = {};
    const card = document.querySelector('.card-1');
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    out.cardRect = { x: r.left, y: r.top, w: r.width, h: r.height };
    out.elementAtCardCenter = top ? (top.tagName + '#' + top.id + '.' + top.className) : null;
    out.isCardOrChild = !!(top && card.contains(top));
    out.attractHidden = document.getElementById('attract-overlay').classList.contains('hidden');
    out.templateHidden = document.getElementById('template-modal').classList.contains('hidden');
    return out;
  })()`);
  console.log('BEFORE CLICK:', JSON.stringify(report, null, 2));

  // Real mouse click via CDP at card center
  const { x, y, w, h } = report.cardRect;
  const cx = x + w / 2, cy = y + h / 2;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
  await sleep(600);

  const after = await evalJs(`(() => ({
    templateHidden: document.getElementById('template-modal').classList.contains('hidden'),
    tiles: document.querySelectorAll('#template-grid-2col .tile-card').length,
    attractHidden: document.getElementById('attract-overlay').classList.contains('hidden'),
  }))()`);
  console.log('AFTER CLICK:', JSON.stringify(after, null, 2));

  // Simulate the kiosk scenario: wait for attract mode, then tap
  await evalJs(`document.getElementById('template-back-btn').click()`);
  await sleep(6000);
  const attract = await evalJs(`(() => ({ attractHidden: document.getElementById('attract-overlay').classList.contains('hidden') }))()`);
  console.log('AFTER 6s IDLE:', JSON.stringify(attract));
  // touch tap on card while attract is showing
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(300);
  const t1 = await evalJs(`(() => ({ attractHidden: document.getElementById('attract-overlay').classList.contains('hidden'), templateHidden: document.getElementById('template-modal').classList.contains('hidden') }))()`);
  console.log('AFTER TAP 1 (on attract):', JSON.stringify(t1));
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(600);
  const t2 = await evalJs(`(() => ({ templateHidden: document.getElementById('template-modal').classList.contains('hidden') }))()`);
  console.log('AFTER TAP 2 (fast, 300ms later):', JSON.stringify(t2));

  console.log('LOGS:\n' + logs.join('\n'));
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
