// =============================================
// TRENDUM AI PHOTO KIOSK — INTERACTIVE ENGINE
// =============================================

let selectedStyle = 'ROBLOX HERO';
let selectedStylePhoto = 'images/photo1.jpg';
let selectedStylePrice = 290;
let isSelectingCard = false;
let isAttractClosing = false;
let currentCategory = 'ФОТО';
let activeTemplateIndex = 0;

// ТРЕКОВЫЕ ШАБЛОНЫ ДЛЯ 3D COVERFLOW ГАЛЕРЕИ (STYLE DRIBBLE)
const templateCatalog = {
    'ФОТО': [
        { id: 1, title: 'ROBLOX HERO', desc: 'СТАНЬ ГЕРОЕМ ЛЮБИМОЙ ИГРЫ', img: 'images/photo1.jpg' },
        { id: 2, title: 'CYBER SAMURAI', desc: 'КИБЕРПАНК ВОИН 2077', img: 'images/photo3.jpg' },
        { id: 3, title: 'ANIME WORLD', desc: 'АНИМЕ ГЕРОЙ В СОЧНЫХ ЦВЕТАХ', img: 'images/photo2.jpg' },
        { id: 4, title: 'FORBES COVER', desc: 'ТЫ НА ГЛАВНОЙ СТРАНИЦЕ FORBES', img: 'assets/hero_portrait.jpg' },
        { id: 5, title: 'GIGACHAD SIGMA', desc: 'ХАРИЗМА И СТИЛЬ 100%', img: 'assets/hero_avatar.jpg' }
    ],
    'ВИДЕО': [
        { id: 1, title: 'NEON MOTION', desc: 'ОЖИВИ СВОЙ ПОРТРЕТ В НЕОНЕ', img: 'images/photo3.jpg' },
        { id: 2, title: 'RETRO 90S VHS', desc: 'КИНЕМАТОГРАФИЧНЫЙ РЕТРО ЭФФЕКТ', img: 'images/photo1.jpg' },
        { id: 3, title: 'CYBER ROBOT', desc: 'ФУТУРИСТИЧНАЯ АНИМАЦИЯ', img: 'assets/hero_robot.jpg' }
    ],
    'ТРЕНДЫ': [
        { id: 1, title: 'TIKTOK DANCE', desc: 'ВИРУСНЫЙ ТАНЦЕВАЛЬНЫЙ ЧЕЛЛЕНДЖ', img: 'assets/hero_robot.jpg' },
        { id: 2, title: 'REELS VIBE', desc: 'ПОПУЛЯРНЫЙ ТРЕНД ИЗ ИНСТАГРАМ', img: 'assets/hero_avatar.jpg' }
    ]
};

// DYNAMIC CATEGORIES & TEMPLATES ENGINE WITH LOCALSTORAGE
let kioskCategories = [];
try {
    const savedCats = localStorage.getItem('kiosk_categories_v2');
    if (savedCats) kioskCategories = JSON.parse(savedCats);
} catch(e) {}

if (!kioskCategories || kioskCategories.length === 0) {
    kioskCategories = ['ВСЕ', 'ОБЛОЖКИ', 'МУЛЬТИКИ', 'ИГРЫ', 'КИБЕРПАНК', 'ВИДЕО', 'ТРЕНДЫ'];
}

let masterTemplates = [];
try {
    const savedTpls = localStorage.getItem('kiosk_templates_v2');
    if (savedTpls !== null) {
        masterTemplates = JSON.parse(savedTpls);
    }
} catch(e) {}

if (masterTemplates === null || (masterTemplates.length === 0 && localStorage.getItem('kiosk_templates_v2') === null)) {
    masterTemplates = [
        { id: 1, category: 'МУЛЬТИКИ', title: 'KIDS FANTASY', img: 'assets/child.png', price: 290 },
        { id: 2, category: 'КИБЕРПАНК', title: 'CYBER MAN', img: 'assets/man.jpg', price: 350 },
        { id: 3, category: 'ТРЕНДЫ', title: 'TRENDING PHOTO', img: 'assets/1489.jpg', price: 290 },
        { id: 4, category: 'ОБЛОЖКИ', title: 'FORBES COVER', img: 'assets/hero_portrait.jpg', price: 390 },
        { id: 5, category: 'ОБЛОЖКИ', title: 'GIGACHAD SIGMA', img: 'assets/hero_avatar.jpg', price: 350 },
        { id: 6, category: 'ВИДЕО', title: 'NEON MOTION', img: 'assets/honor.jpg', price: 450 },
        { id: 7, category: 'ВИДЕО', title: 'RETRO 90S VHS', img: 'assets/ruiner.jpg', price: 450 },
        { id: 8, category: 'ВИДЕО', title: 'CYBER ROBOT', img: 'assets/hero_robot.jpg', price: 490 },
        { id: 9, category: 'ИГРЫ', title: 'ROBLOX HERO', img: 'images/photo1.jpg', price: 290 },
        { id: 10, category: 'ТРЕНДЫ', title: 'ANIME VIBE', img: 'images/photo2.jpg', price: 290 }
    ];
}

// Preload all template images into memory for instant rendering
function preloadMasterImages() {
    masterTemplates.forEach(item => {
        if (item.img) {
            const img = new Image();
            img.src = item.img;
        }
    });
}
preloadMasterImages();

let activeGridTab = 'ВСЕ';

// 1. ВЫБОР КАРТОЧКИ — МГНОВЕННОЕ ОТКРЫТИЕ 2-КОЛОНОЧНОЙ СЕТКИ ШАБЛОНОВ
window.selectCard = function(cardEl, styleName) {
    if (isSelectingCard || isAttractClosing) return;
    isSelectingCard = true;

    // 1. Увеличиваем выбранную карточку
    if (cardEl) cardEl.classList.add('card-selected');

    // 2. Разлетаются невыбранные карточки
    const allCards = document.querySelectorAll('.card');
    allCards.forEach((otherCard, otherIdx) => {
        if (otherCard !== cardEl) {
            if (otherIdx % 2 === 0) {
                otherCard.classList.add('fly-left');
            } else {
                otherCard.classList.add('fly-right');
            }
        }
    });

    // 3. Мгновенно открываем галерею шаблонов
    openTemplateGallery();

    setTimeout(() => {
        allCards.forEach(c => c.classList.remove('fly-left', 'fly-right', 'card-selected'));
        isSelectingCard = false;
    }, 400);
};

// 2. GRID ROUTER & RENDERER (МГНОВЕННЫЙ РЕНДЕР КАРТИНОК)
function openTemplateGallery() {
    try {
        const saved = localStorage.getItem('kiosk_templates_v2');
        if (saved !== null) {
            masterTemplates = JSON.parse(saved);
        }
        const savedCats = localStorage.getItem('kiosk_categories_v2');
        if (savedCats !== null) {
            kioskCategories = JSON.parse(savedCats);
        }
    } catch(e) {}
    const modal = document.getElementById('template-modal');
    renderCategoryPillsBar();
    switchGridCategory(activeGridTab || 'ВСЕ');
    if (modal) modal.classList.remove('hidden');
}

function closeTemplateGallery() {
    const modal = document.getElementById('template-modal');
    if (modal) modal.classList.add('hidden');
}

// РЕНДЕРИНГ ДИНАМИЧЕСКИХ ПЛАШЕК КАТЕГОРИЙ В ШАПКЕ
function renderCategoryPillsBar() {
    const bar = document.getElementById('category-pills-bar');
    if (!bar) return;
    bar.innerHTML = '';

    kioskCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `cat-pill ${cat.toUpperCase() === activeGridTab.toUpperCase() ? 'active' : ''}`;
        btn.textContent = cat.toUpperCase();
        btn.onclick = () => switchGridCategory(cat);
        bar.appendChild(btn);
    });
}

// ПЕРЕКЛЮЧЕНИЕ КАТЕГОРИИ + ДИНАМИЧЕСКИЙ ЗАГОЛОВОК
window.switchGridCategory = function(catName) {
    activeGridTab = catName;

    // 1. Динамическое изменение заголовка под выбранную категорию!
    const titleEl = document.getElementById('grid-modal-title');
    if (titleEl) {
        titleEl.textContent = catName.toUpperCase() === 'ВСЕ' ? 'ВСЕ ШАБЛОНЫ' : catName.toUpperCase();
    }

    // 2. Обновление подсветки плашки
    document.querySelectorAll('.cat-pill').forEach(pill => {
        if (pill.textContent.trim().toUpperCase() === catName.toUpperCase()) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });

    renderGridTemplates();
};

function renderGridTemplates() {
    const list = activeGridTab === 'ВСЕ' ? masterTemplates : masterTemplates.filter(item => item.category.toUpperCase() === activeGridTab.toUpperCase());
    const container = document.getElementById('template-grid-2col');

    if (!container) return;
    container.innerHTML = '';

    list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'tile-card';

        const img = document.createElement('img');
        img.src = item.img;
        img.alt = item.title;
        img.loading = 'eager';

        // Плашка с ценой в сомах
        const itemPrice = item.price || 290;
        const priceBadge = document.createElement('div');
        priceBadge.className = 'tile-price-badge';
        priceBadge.innerHTML = `${itemPrice} <span>СОМ</span>`;

        card.appendChild(img);
        card.appendChild(priceBadge);

        // При клике на карточку — сразу переходим к экрану оплаты oBusiness!
        card.addEventListener('click', () => {
            if (isAttractClosing) return; // поглощаем клик закрытия заставки
            selectedStyle = item.title;
            selectedStylePhoto = item.img;
            selectedStylePrice = itemPrice;
            closeTemplateGallery();
            openKioskFlow();
        });

        container.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial pre-render of template tiles grid so opening is instantaneous
    renderGridTemplates();

    // DOM Elements
    const modal = document.getElementById('kiosk-modal');
    const modalClose = document.getElementById('modal-close');
    
    // Steps
    const stepCamera = document.getElementById('step-camera');
    const stepPayment = document.getElementById('step-payment');
    const stepProcessing = document.getElementById('step-processing');
    const stepResult = document.getElementById('step-result');

    // Camera Elements
    const webcamEl = document.getElementById('webcam');
    const canvasEl = document.getElementById('photo-canvas');
    const snapBtn = document.getElementById('snap-btn');
    const countdownOverlay = document.getElementById('countdown-overlay');

    // Payment Elements
    const qrPaymentZone = document.getElementById('qr-payment-zone');
    const simPayBtn = document.getElementById('sim-pay-btn');
    const cancelPayBtn = document.getElementById('cancel-pay-btn');
    const payStyleTitle = document.getElementById('pay-style-title');
    const paySelectedThumb = document.getElementById('pay-selected-thumb');
    const payAmountVal = document.getElementById('pay-amount-val');
    const elqrImg = document.getElementById('elqr-img');
    const paymentStatusText = document.getElementById('payment-status-text');

    // Result Elements
    const resultImg = document.getElementById('result-img');
    const finishBtn = document.getElementById('finish-btn');
    const aiStatusText = document.getElementById('ai-status-text');

    let mediaStream = null;
    let capturedPhotoData = null;
    let currentOrderId = null;
    let paymentPollTimer = null;

    // ШАГ 1: ОТКРЫТИЕ ПОТОКА — СРАЗУ ЭКРАН ОПЛАТЫ OBUSINESS
    window.openKioskFlow = function() {
        if (modal) modal.style.display = 'flex';
        showStep(stepPayment);
        initiatePaymentOrder();
    };

    modalClose.addEventListener('click', closeKioskFlow);
    if (cancelPayBtn) {
        cancelPayBtn.addEventListener('click', () => {
            closeKioskFlow();
            openTemplateGallery();
        });
    }

    function closeKioskFlow() {
        stopPaymentPolling();
        stopWebcam();
        modal.style.display = 'none';
        resetState();
    }

    function showStep(stepEl) {
        [stepCamera, stepPayment, stepProcessing, stepResult].forEach(s => s.style.display = 'none');
        stepEl.style.display = 'block';
    }

    function resetState() {
        countdownOverlay.textContent = '';
        currentOrderId = null;
    }

    // ИНИЦИАЛИЗАЦИЯ ЗАКАЗА И QR-КОДА OBUSINESS ELQR
    async function initiatePaymentOrder() {
        if (payStyleTitle) payStyleTitle.textContent = selectedStyle;
        if (paySelectedThumb) paySelectedThumb.src = selectedStylePhoto;
        if (payAmountVal) payAmountVal.textContent = selectedStylePrice || 290;
        if (paymentStatusText) paymentStatusText.textContent = 'Генерация Finik ELQR...';

        try {
            const resp = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: selectedStylePrice || 290,
                    templateTitle: selectedStyle
                })
            });
            const data = await resp.json();

            if (data.success) {
                currentOrderId = data.orderId;
                if (elqrImg) elqrImg.src = data.qrImageUrl;
                if (paymentStatusText) paymentStatusText.textContent = `Ожидание оплаты заказа #${currentOrderId}...`;
                startPaymentPolling(currentOrderId);
            } else {
                if (paymentStatusText) paymentStatusText.textContent = 'Ошибка создания заказа Finik';
            }
        } catch (e) {
            console.warn('API error, using offline mock QR:', e);
            // Fallback для локального оффлайн запуска (file:///)
            currentOrderId = 'TRD-' + Date.now();
            const mockQr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=https%3A%2F%2Fqr.finik.kg%2F%23orderId%3D${currentOrderId}%26amount%3D${selectedStylePrice || 290}`;
            if (elqrImg) elqrImg.src = mockQr;
            if (paymentStatusText) paymentStatusText.textContent = `Ожидание оплаты Finik ELQR (${selectedStylePrice || 290} сом)...`;
        }
    }

    // ПОЛЛИНГ СТАТУСА ПЛАТЕЖА (ПРОВЕРКА ВЕБХУКА КАЖДЫЕ 2.5 СЕКУНДЫ)
    function startPaymentPolling(orderId) {
        stopPaymentPolling();
        paymentPollTimer = setInterval(async () => {
            try {
                const res = await fetch(`/api/payment/status?orderId=${encodeURIComponent(orderId)}`);
                const info = await res.json();
                if (info.success && info.status === 'PAID') {
                    stopPaymentPolling();
                    handlePaymentSuccess();
                }
            } catch (err) {
                // Ignore network hiccups during polling
            }
        }, 2500);
    }

    function stopPaymentPolling() {
        if (paymentPollTimer) {
            clearInterval(paymentPollTimer);
            paymentPollTimer = null;
        }
    }

    // ОПЛАТА УСПЕШНО ПОЛУЧЕНА — ПЕРЕХОД К КАМЕРЕ ДЛЯ СЪЕМКИ!
    function handlePaymentSuccess() {
        if (paymentStatusText) {
            paymentStatusText.textContent = '✅ Оплата получена! Включаем камеру...';
        }
        setTimeout(() => {
            showStep(stepCamera);
            startWebcam();
        }, 1000);
    }

    // ТЕСТОВАЯ КНОПКА СИМУЛЯЦИИ ОПЛАТЫ
    if (simPayBtn) {
        simPayBtn.addEventListener('click', async () => {
            if (currentOrderId) {
                try {
                    await fetch('/api/payment/simulate-success', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: currentOrderId })
                    });
                } catch(e) {}
            }
            handlePaymentSuccess();
        });
    }

    // 2. WEBCAM LOGIC (ОПРЕДЕЛЕНИЕ LOGITECH BRIO 500 И НАДЕЖНЫЙ ЗАХВАТ ПОТОКА)
    async function startWebcam() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Браузер не поддерживает камеру или страница открыта без HTTPS.');
            return;
        }

        try {
            // 1. Поиск подключенных камер (ищем Logitech / Brio)
            let chosenDeviceId = null;
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === 'videoinput');
                console.log('Подключенные камеры:', videoDevices);

                // Ищем целевую камеру Logitech Brio 500
                const brio = videoDevices.find(d => 
                    d.label.toLowerCase().includes('brio') || 
                    d.label.toLowerCase().includes('logitech')
                );

                if (brio) {
                    chosenDeviceId = brio.deviceId;
                    console.log('Найдена камера Logitech Brio:', brio.label);
                } else if (videoDevices.length > 0) {
                    // Если Brio не названа в label (до первого разрешения), берем последнюю внешнюю камеру
                    chosenDeviceId = videoDevices[videoDevices.length - 1].deviceId;
                }
            } catch(e) {
                console.warn('Не удалось получить список устройств:', e);
            }

            // 2. Настройка видеопотока для Logitech Brio 500 в полном качестве (1080p / 720p 30 FPS)
            const videoConstraints = {
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 30 }
            };

            if (chosenDeviceId) {
                videoConstraints.deviceId = { exact: chosenDeviceId };
            } else {
                videoConstraints.facingMode = 'user';
            }

            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: videoConstraints
                });
            } catch (errHighRes) {
                console.warn('FullHD 1080p отклонено, пробуем стандартное HD 720p 30fps:', errHighRes);
                const fallbackConstraints = {
                    audio: false,
                    video: chosenDeviceId
                        ? { deviceId: { exact: chosenDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
                        : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
                };
                mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            }

            webcamEl.srcObject = mediaStream;
            await webcamEl.play().catch(() => {});
        } catch (err) {
            console.error('Ошибка доступа к камере:', err);
            alert('Не удалось подключиться к камере Logitech Brio 500. Убедитесь, что камера не занята другим приложением (Skype, Zoom, OBS) и разрешен доступ в браузере.');
        }
    }

    function stopWebcam() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        if (webcamEl) {
            webcamEl.srcObject = null;
        }
    }

    // ВЫБОР ДЛИТЕЛЬНОСТИ ТАЙМЕРА СЪЁМКИ (3, 5, 8, 10 СЕКУНД)
    let selectedCaptureDuration = 3;
    const timerButtons = document.querySelectorAll('.timer-btn');
    timerButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            timerButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCaptureDuration = parseInt(btn.getAttribute('data-timer'), 10) || 3;
        });
    });

    // 3. SNAP PHOTO & COUNTDOWN
    snapBtn.addEventListener('click', () => {
        snapBtn.disabled = true;
        let count = selectedCaptureDuration;
        countdownOverlay.textContent = count;

        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                countdownOverlay.textContent = count;
            } else {
                clearInterval(timer);
                countdownOverlay.textContent = '📸';
                takeSnapshot();
                setTimeout(() => {
                    stopWebcam();
                    snapBtn.disabled = false;
                    countdownOverlay.textContent = '';
                    showStep(stepProcessing);
                    runAIGeneration();
                }, 800);
            }
        }, 1000);
    });

    function takeSnapshot() {
        const ctx = canvasEl.getContext('2d');
        const w = webcamEl.videoWidth || 1920;
        const h = webcamEl.videoHeight || 1080;
        canvasEl.width = w;
        canvasEl.height = h;

        // Отрисовываем с зеркальным отражением (как в превью камеры)
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(webcamEl, 0, 0, w, h);
        ctx.restore();

        capturedPhotoData = canvasEl.toDataURL('image/jpeg', 0.95);
    }

    // 4. ОБРАБОТКА И СОЗДАНИЕ ПОРТРЕТА (БЕЗ УПОМИНАНИЯ ИИ / НЕЙРОСЕТЕЙ)
    function runAIGeneration() {
        const statuses = [
            `Анализ ракурса и стиля ${selectedStyle}...`,
            `Стилизация вашего портрета...`,
            `Применение кинематографичного освещения...`,
            `Создание финального фото в высоком разрешении...`
        ];

        let idx = 0;
        const interval = setInterval(() => {
            idx++;
            if (idx < statuses.length) {
                aiStatusText.textContent = statuses[idx];
            } else {
                clearInterval(interval);
                // Show result image
                resultImg.src = selectedStylePhoto;
                showStep(stepResult);
            }
        }, 1200);
    }

    // 5. FINISH & TEMPLATE SELECTION
    finishBtn.addEventListener('click', closeKioskFlow);

    // 3D Cover Flow Gallery Controls & Touch Swiping
    const templateBackBtn = document.getElementById('template-back-btn');
    const selectTemplateBtn = document.getElementById('select-template-btn');

    if (templateBackBtn) {
        templateBackBtn.addEventListener('click', closeTemplateGallery);
    }

    if (selectTemplateBtn) {
        selectTemplateBtn.addEventListener('click', () => {
            const list = templateCatalog[currentCategory] || templateCatalog['ФОТО'];
            if (list[activeTemplateIndex]) {
                selectedStyle = list[activeTemplateIndex].title;
                selectedStylePhoto = list[activeTemplateIndex].img;
            }
            closeTemplateGallery();
            openKioskFlow();
        });
    }

    // Touch Swipe for 3D Cover Flow Carousel
    let touchStartX = 0;
    const trackEl = document.getElementById('coverflow-track');
    if (trackEl) {
        trackEl.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        trackEl.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchEndX - touchStartX;
            const list = templateCatalog[currentCategory] || templateCatalog['ФОТО'];

            if (diff > 40 && activeTemplateIndex > 0) {
                activeTemplateIndex--;
                renderCoverFlow();
            } else if (diff < -40 && activeTemplateIndex < list.length - 1) {
                activeTemplateIndex++;
                renderCoverFlow();
            }
        }, { passive: true });
    }

    // =============================================
    // 7. INACTIVITY ATTRACT MODE (PLAYLIST ENGINE FOR VIDEO & PHOTO)
    // =============================================
    // Настройка таймера заставки (берется из админки kiosk_attract_timeout, по умолчанию 5 сек)
    function getInactivityTimeout() {
        try {
            const val = parseInt(localStorage.getItem('kiosk_attract_timeout'), 10);
            if (!isNaN(val) && val >= 3) {
                return val * 1000;
            }
        } catch(e) {}
        return 5000; // по умолчанию 5 секунд
    }

    let inactivityTimer = null;
    let lastX = 0;
    let lastY = 0;

    // ДЕФОЛТНЫЕ ПЛЕЙЛИСТЫ ЗАСТАВКИ
    const defaultTopPlaylist = [
        { id: 1, type: 'video', title: 'Промо Видео', src: 'assets/card_loop.mp4', fallbackDuration: 8000 },
        { id: 2, type: 'image', title: 'Рекламный баннер', src: 'assets/promo_ad.jpg', duration: 5000 },
        { id: 3, type: 'image', title: 'Пример фото 1', src: 'images/photo1.jpg', duration: 5000 },
        { id: 4, type: 'image', title: 'Пример фото 2', src: 'assets/child.png', duration: 5000 },
        { id: 5, type: 'image', title: 'Пример фото 3', src: 'images/photo3.jpg', duration: 5000 }
    ];

    const defaultBottomPlaylist = [
        { id: 1, type: 'video', title: 'Нижний цикл видео', src: 'assets/card_loop.mp4', fallbackDuration: 8000 },
        { id: 2, type: 'image', title: 'Нижний баннер 1', src: 'images/photo2.jpg', duration: 5000 },
        { id: 3, type: 'image', title: 'Нижний баннер 2', src: 'assets/hero_avatar.jpg', duration: 5000 }
    ];

    // ОБЛАЧНАЯ КОНФИГУРАЦИЯ БАННЕРОВ И НАСТРОЕК (SUPABASE STORAGE)
    const CLOUD_CONFIG_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/config/settings.json';

    async function syncCloudConfig() {
        try {
            const res = await fetch(CLOUD_CONFIG_URL + '?_t=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.ads_top) && data.ads_top.length > 0) {
                    topPlaylist = data.ads_top;
                    localStorage.setItem('kiosk_ads_top', JSON.stringify(data.ads_top));
                }
                if (Array.isArray(data.ads_bottom) && data.ads_bottom.length > 0) {
                    bottomPlaylist = data.ads_bottom;
                    localStorage.setItem('kiosk_ads_bottom', JSON.stringify(data.ads_bottom));
                }
                if (data.attract_timeout) {
                    localStorage.setItem('kiosk_attract_timeout', data.attract_timeout);
                }
                if (Array.isArray(data.templates)) {
                    masterTemplates = data.templates;
                    localStorage.setItem('kiosk_templates_v2', JSON.stringify(data.templates));
                    renderGridTemplates();
                }
                if (Array.isArray(data.categories)) {
                    kioskCategories = data.categories;
                    localStorage.setItem('kiosk_categories_v2', JSON.stringify(data.categories));
                    renderCategoryPillsBar();
                }
            }
        } catch(e) {
            console.warn('Cloud config fetch skipped/offline:', e);
        }
    }

    function getTopPlaylist() {
        try {
            const data = localStorage.getItem('kiosk_ads_top');
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}
        return defaultTopPlaylist;
    }

    function getBottomPlaylist() {
        try {
            const data = localStorage.getItem('kiosk_ads_bottom');
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}
        return defaultBottomPlaylist;
    }

    let topPlaylist = getTopPlaylist();
    let bottomPlaylist = getBottomPlaylist();

    let topIndex = 0;
    let bottomIndex = 0;
    let topPlaylistTimer = null;
    let bottomPlaylistTimer = null;

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        // Заставка НЕ работает на экранах оплаты, камеры, генерации, результата
        const modal = document.getElementById('kiosk-modal');
        if (modal && modal.style.display === 'flex') return;
        inactivityTimer = setTimeout(showAttractScreen, getInactivityTimeout());
    }

    function playTopPlaylistNext() {
        clearTimeout(topPlaylistTimer);
        if (!topPlaylist || topPlaylist.length === 0) return;
        if (topIndex >= topPlaylist.length) topIndex = 0;
        const item = topPlaylist[topIndex];
        const vEl = document.getElementById('attract-promo-video');
        const imgEl = document.getElementById('attract-promo-img');
        const fallback = document.getElementById('attract-top-fallback');

        if (!item) return;

        // Нормализация длительности (секунды в мс)
        const durMs = (item.duration ? (item.duration > 100 ? item.duration : item.duration * 1000) : 5000);
        const fallbackMs = (item.fallbackDuration ? (item.fallbackDuration > 100 ? item.fallbackDuration : item.fallbackDuration * 1000) : 8000);

        if (item.type === 'video') {
            const blurTop = document.getElementById('attract-top-blur');
            if (blurTop) { blurTop.style.opacity = '0'; blurTop.style.backgroundImage = 'none'; }
            if (imgEl) imgEl.classList.remove('active');
            if (vEl) {
                vEl.src = item.src;
                vEl.muted = true;
                vEl.classList.add('active');

                vEl.onended = () => {
                    topIndex = (topIndex + 1) % topPlaylist.length;
                    playTopPlaylistNext();
                };

                vEl.onerror = () => {
                    if (fallback) fallback.style.display = 'flex';
                    topPlaylistTimer = setTimeout(() => {
                        topIndex = (topIndex + 1) % topPlaylist.length;
                        playTopPlaylistNext();
                    }, 5000);
                };

                vEl.play().then(() => {
                    if (fallback) fallback.style.display = 'none';
                }).catch(e => {
                    topPlaylistTimer = setTimeout(() => {
                        topIndex = (topIndex + 1) % topPlaylist.length;
                        playTopPlaylistNext();
                    }, fallbackMs);
                });
            }
        } else if (item.type === 'image') {
            const blurTop = document.getElementById('attract-top-blur');
            if (blurTop) {
                blurTop.style.backgroundImage = `url("${item.src}")`;
                blurTop.style.opacity = '0.85';
            }
            if (vEl) vEl.classList.remove('active');
            if (imgEl) {
                imgEl.src = item.src;
                imgEl.classList.add('active');
            }
            if (fallback) fallback.style.display = 'none';

            topPlaylistTimer = setTimeout(() => {
                topIndex = (topIndex + 1) % topPlaylist.length;
                playTopPlaylistNext();
            }, durMs);
        }
    }

    function playBottomPlaylistNext() {
        clearTimeout(bottomPlaylistTimer);
        if (!bottomPlaylist || bottomPlaylist.length === 0) return;
        if (bottomIndex >= bottomPlaylist.length) bottomIndex = 0;
        const item = bottomPlaylist[bottomIndex];
        const vEl = document.getElementById('attract-card-video');
        const imgEl = document.getElementById('attract-card-img');

        if (!item) return;

        // Нормализация длительности (секунды в мс)
        const durMs = (item.duration ? (item.duration > 100 ? item.duration : item.duration * 1000) : 5000);
        const fallbackMs = (item.fallbackDuration ? (item.fallbackDuration > 100 ? item.fallbackDuration : item.fallbackDuration * 1000) : 8000);

        if (item.type === 'video') {
            const blurBottom = document.getElementById('attract-bottom-blur');
            if (blurBottom) { blurBottom.style.opacity = '0'; blurBottom.style.backgroundImage = 'none'; }
            if (imgEl) imgEl.classList.remove('active');
            if (vEl) {
                vEl.src = item.src;
                vEl.muted = true;
                vEl.classList.add('active');

                vEl.onended = () => {
                    bottomIndex = (bottomIndex + 1) % bottomPlaylist.length;
                    playBottomPlaylistNext();
                };

                vEl.play().catch(e => {
                    bottomPlaylistTimer = setTimeout(() => {
                        bottomIndex = (bottomIndex + 1) % bottomPlaylist.length;
                        playBottomPlaylistNext();
                    }, fallbackMs);
                });
            }
        } else if (item.type === 'image') {
            const blurBottom = document.getElementById('attract-bottom-blur');
            if (blurBottom) {
                blurBottom.style.backgroundImage = `url("${item.src}")`;
                blurBottom.style.opacity = '0.85';
            }
            if (vEl) vEl.classList.remove('active');
            if (imgEl) {
                imgEl.src = item.src;
                imgEl.classList.add('active');
            }

            bottomPlaylistTimer = setTimeout(() => {
                bottomIndex = (bottomIndex + 1) % bottomPlaylist.length;
                playBottomPlaylistNext();
            }, durMs);
        }
    }

    function showAttractScreen() {
        // Фоново проверяем обновления в облаке Supabase
        syncCloudConfig().then(() => {
            topPlaylist = getTopPlaylist();
            bottomPlaylist = getBottomPlaylist();
        });

        // Подгружаем актуальные рекламные плейлисты
        topPlaylist = getTopPlaylist();
        bottomPlaylist = getBottomPlaylist();

        const attractOverlay = document.getElementById('attract-overlay');
        if (attractOverlay) {
            attractOverlay.classList.remove('hidden');
            attractOverlay.style.display = 'flex';
        }
        
        topIndex = 0;
        bottomIndex = 0;
        playTopPlaylistNext();
        playBottomPlaylistNext();
    }

    function stopAttractPlaylists() {
        clearTimeout(topPlaylistTimer);
        clearTimeout(bottomPlaylistTimer);
        const v1 = document.getElementById('attract-promo-video');
        const v2 = document.getElementById('attract-card-video');
        if (v1) v1.pause();
        if (v2) v2.pause();
    }

    window.hideAttractScreen = function() {
        const attractOverlay = document.getElementById('attract-overlay');
        if (attractOverlay && (attractOverlay.style.display === 'flex' || !attractOverlay.classList.contains('hidden'))) {
            isAttractClosing = true;
            attractOverlay.classList.add('hidden');
            attractOverlay.style.display = 'none';
            stopAttractPlaylists();

            setTimeout(() => {
                isAttractClosing = false;
            }, 450);
        }
        resetInactivityTimer();
    };

    // Сброс таймера и закрытие заставки при касании
    ['touchstart', 'pointerdown', 'click', 'keydown'].forEach(evt => {
        window.addEventListener(evt, () => {
            window.hideAttractScreen();
        }, { passive: true });
    });

    // Безопасное отслеживание реального перемещения мыши (> 10px)
    window.addEventListener('mousemove', (e) => {
        if (Math.abs(e.clientX - lastX) > 10 || Math.abs(e.clientY - lastY) > 10) {
            lastX = e.clientX;
            lastY = e.clientY;
            const attractOverlay = document.getElementById('attract-overlay');
            if (attractOverlay && !attractOverlay.classList.contains('hidden')) {
                window.hideAttractScreen();
            } else {
                resetInactivityTimer();
            }
        }
    }, { passive: true });

    // Синхронизация с облаком и запуск таймера простоя при загрузке
    syncCloudConfig();
    resetInactivityTimer();
});
