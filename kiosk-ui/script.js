// =============================================
// TRENDUM AI PHOTO KIOSK — INTERACTIVE ENGINE
// =============================================

let selectedStyle = 'ROBLOX HERO';
let selectedStylePhoto = 'images/photo1.jpg';
let selectedStylePrice = 290;
let selectedStyleModel = 'face-swap';
let selectedStylePrompt = 'Roblox blocky character hero style, bright game world colors, playful gaming atmosphere';
let selectedTemplateId = null;
let selectedTemplateHtml = '';
let isSelectingCard = false;
let isAttractClosing = false;
let currentCategory = 'ФОТО';
let activeTemplateIndex = 0;

// КОНФИГУРАЦИЯ ГЛАВНОГО ЭКРАНА (ШАПКА И КАРТОЧКИ РАЗДЕЛОВ)
function getStoredMainHeader() {
    try {
        const saved = localStorage.getItem('kiosk_main_header_v1');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
        badge: 'PREMIUM PHOTO KIOSK',
        title: 'TRENDUM',
        subtitle: 'ФОТОСТУДИЯ ПРЕМИУМ КЛАССА'
    };
}

function normalizeMainCards(cards) {
    if (!Array.isArray(cards) || cards.length === 0) {
        return [
            { id: 1, title: 'ФОТО', badge: 'ОБЛОЖКИ • ПОРТРЕТЫ • АРТ', subtitle: 'БОЛЕЕ 100 СТИЛЕЙ СТУДИЙНОЙ СЪЁМКИ', filter: 'PHOTO', category: 'ФОТО', img: 'images/photo1.jpg', categories: ['ОБЛОЖКИ', 'МУЛЬТИКИ', 'ИГРЫ', 'КИБЕРПАНК', 'АРТ'] },
            { id: 2, title: 'ВИДЕО', badge: 'КИНЕМАТОГРАФИЧНОЕ ВИДЕО', subtitle: 'ЖИВЫЕ ПОРТРЕТЫ И АНИМАЦИЯ', filter: 'VIDEO', category: 'ВИДЕО', img: 'images/photo3.jpg', categories: ['КИНЕМАТОГРАФ', 'НЕОН', 'АНИМАЦИЯ', 'РЕТРО VHS'] },
            { id: 3, title: 'ТРЕНДЫ', badge: 'ПОПУЛЯРНЫЕ ОБРАЗЫ', subtitle: 'СОВРЕМЕННЫЕ ЭСТЕТИЧЕСКИЕ ОБРАЗЫ', filter: 'TRENDS', category: 'ТРЕНДЫ', img: 'assets/hero_robot.jpg', categories: ['TIKTOK', 'REELS', 'INSTA VIBE'] },
            { id: 4, title: 'ПРИГЛАСИТЕЛЬНЫЕ', badge: 'СВАДЬБЫ • ТОЙ • ЮБИЛЕИ', subtitle: 'ИНТЕРАКТИВНЫЕ САЙТЫ С МУЗЫКОЙ И ТАЙМЕРОМ', filter: 'INVITES', category: 'ПРИГЛАСИТЕЛЬНЫЕ', img: 'assets/hero_portrait.jpg', categories: ['СВАДЬБА', 'КЫЗ УЗАТУУ', 'ЮБИЛЕЙ', 'СУННОТ ТОЙ'] }
        ];
    }
    return cards.map(c => {
        const titleUp = (c.title || '').toUpperCase();
        let cats = Array.isArray(c.categories) && c.categories.length > 0 ? c.categories : null;
        if (!cats) {
            if (c.id === 1 || titleUp === 'ФОТО') {
                cats = ['ОБЛОЖКИ', 'МУЛЬТИКИ', 'ИГРЫ', 'КИБЕРПАНК', 'АРТ'];
            } else if (c.id === 2 || titleUp === 'ВИДЕО') {
                cats = ['КИНЕМАТОГРАФ', 'НЕОН', 'АНИМАЦИЯ', 'РЕТРО VHS'];
            } else if (c.id === 3 || titleUp === 'ТРЕНДЫ') {
                cats = ['TIKTOK', 'REELS', 'INSTA VIBE'];
            } else if (c.id === 4 || titleUp.includes('ПРИГЛАС')) {
                cats = ['СВАДЬБА', 'КЫЗ УЗАТУУ', 'ЮБИЛЕЙ', 'СУННОТ ТОЙ', 'ТУШОО ТОЙ', 'ДЕНЬ РОЖДЕНИЯ', 'БЕШИК ТОЙ', 'СЫРҒА САЛУ'];
            } else {
                cats = [c.title || 'ОБЩЕЕ'];
            }
        }
        return {
            ...c,
            id: Number(c.id) || Date.now(),
            categories: cats
        };
    });
}

function getStoredMainCards() {
    try {
        const saved = localStorage.getItem('kiosk_main_cards_v1');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return normalizeMainCards(parsed);
        }
    } catch(e) {}
    return normalizeMainCards([]);
}

let mainHeaderConfig = getStoredMainHeader();
let mainCardsConfig = getStoredMainCards();

function renderMainCards() {
    const badgeEl = document.getElementById('main-brand-badge');
    const titleEl = document.getElementById('main-brand-title');
    const subEl = document.getElementById('main-brand-subtitle');
    const container = document.getElementById('main-cards-container');

    if (badgeEl && mainHeaderConfig.badge) badgeEl.textContent = mainHeaderConfig.badge;
    if (titleEl && mainHeaderConfig.title) {
        if (mainHeaderConfig.title.toUpperCase() === 'TRENDUM') {
            titleEl.innerHTML = 'TREN<span>DUM</span>';
        } else {
            titleEl.textContent = mainHeaderConfig.title;
        }
    }
    if (subEl && mainHeaderConfig.subtitle) subEl.textContent = mainHeaderConfig.subtitle;

    if (!container) return;
    container.innerHTML = '';

    mainCardsConfig.forEach((c, idx) => {
        const section = document.createElement('section');
        section.className = `card card-${idx + 1}`;
        section.onclick = function() {
            window.selectCard(this, c.id);
        };

        const bgImg = c.img ? `background-image: url('${c.img}');` : '';
        section.innerHTML = `
            <div class="card-image" style="${bgImg}"></div>
            <div class="point">${c.badge || ''}</div>
            <div class="title">${c.title || ''}</div>
            <div class="subtitle">${c.subtitle || ''}</div>
        `;
        container.appendChild(section);
    });
}

// ТРЕКОВЫЕ ШАБЛОНЫ ДЛЯ 3D COVERFLOW ГАЛЕРЕИ (STYLE DRIBBLE)
const templateCatalog = {
    'ФОТО': [
        { id: 1, title: 'ROBLOX HERO', desc: 'СТАНЬ ГЕРОЕМ ЛЮБИМОЙ ИГРЫ', img: 'images/photo1.jpg', model: 'face-swap', prompt: 'Roblox hero blocky style' },
        { id: 2, title: 'CYBER SAMURAI', desc: 'КИБЕРПАНК ВОИН 2077', img: 'images/photo3.jpg', model: 'face-swap', prompt: 'Cyberpunk samurai in neon armor' },
        { id: 3, title: 'ANIME WORLD', desc: 'АНИМЕ ГЕРОЙ В СОЧНЫХ ЦВЕТАХ', img: 'images/photo2.jpg', model: 'face-swap', prompt: 'Anime style hero' },
        { id: 4, title: 'FORBES COVER', desc: 'ТЫ НА ГЛАВНОЙ СТРАНИЦЕ FORBES', img: 'assets/hero_portrait.jpg', model: 'face-swap', prompt: 'Forbes magazine cover' },
        { id: 5, title: 'GIGACHAD SIGMA', desc: 'ХАРИЗМА И СТИЛЬ 100%', img: 'assets/hero_avatar.jpg', model: 'face-swap', prompt: 'Sigma male portrait' }
    ],
    'ВИДЕО': [
        { id: 1, title: 'NEON MOTION', desc: 'ОЖИВИ СВОЙ ПОРТРЕТ В НЕОНЕ', img: 'images/photo3.jpg', model: 'kling-video', prompt: 'Neon light streaks swirling around cyberpunk hero' },
        { id: 2, title: 'RETRO 90S VHS', desc: 'КИНЕМАТОГРАФИЧНЫЙ РЕТРО ЭФФЕКТ', img: 'images/photo1.jpg', model: 'kling-video', prompt: 'Vintage 90s VHS tape glitch effect' },
        { id: 3, title: 'CYBER ROBOT', desc: 'ФУТУРИСТИЧНАЯ АНИМАЦИЯ', img: 'assets/hero_robot.jpg', model: 'kling-video', prompt: 'Futuristic cyborg awakening' }
    ],
    'ТРЕНДЫ': [
        { id: 1, title: 'TIKTOK DANCE', desc: 'ВИРУСНЫЙ ТАНЦЕВАЛЬНЫЙ ЧЕЛЛЕНДЖ', img: 'assets/hero_robot.jpg', model: 'kling-video', prompt: 'TikTok dance animation' },
        { id: 2, title: 'REELS VIBE', desc: 'ПОПУЛЯРНЫЙ ТРЕНД ИЗ ИНСТАГРАМ', img: 'assets/hero_avatar.jpg', model: 'face-swap', prompt: 'Reels trending aesthetic' }
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
        { id: 1, category: 'МУЛЬТИКИ', title: 'KIDS FANTASY', img: 'assets/child.png', price: 290, model: 'face-swap', prompt: 'Cute Pixar 3D animated character portrait, soft Disney lighting, vibrant colors, retain facial likeness' },
        { id: 2, category: 'КИБЕРПАНК', title: 'CYBER MAN', img: 'assets/man.jpg', price: 350, model: 'face-swap', prompt: 'Cyberpunk male warrior in high-tech carbon neon suit, rainy Neo-Tokyo, volumetric lighting, photorealistic' },
        { id: 3, category: 'ТРЕНДЫ', title: 'TRENDING PHOTO', img: 'assets/1489.jpg', price: 290, model: 'face-swap', prompt: 'Trending Instagram aesthetic portrait, warm natural golden hour sunlight, 85mm lens depth of field' },
        { id: 4, category: 'ОБЛОЖКИ', title: 'FORBES COVER', img: 'assets/hero_portrait.jpg', price: 390, model: 'face-swap', prompt: 'Forbes magazine cover, elegant business suit, powerful charismatic gaze, studio magazine lighting' },
        { id: 5, category: 'ОБЛОЖКИ', title: 'GIGACHAD SIGMA', img: 'assets/hero_avatar.jpg', price: 350, model: 'face-swap', prompt: 'Sigma male portrait, chiseled jawline, dramatic black and white high contrast lighting, hypermasculine charisma' },
        { id: 6, category: 'ВИДЕО', title: 'NEON MOTION', img: 'assets/honor.jpg', price: 450, model: 'kling-video', prompt: 'Neon light streaks swirling around cyberpunk hero, subtle dynamic head turn and breathing animation, cinematic 4k' },
        { id: 7, category: 'ВИДЕО', title: 'RETRO 90S VHS', img: 'assets/ruiner.jpg', price: 450, model: 'kling-video', prompt: 'Vintage 90s VHS tape glitch effect, retro synthwave mood, neon glow animation' },
        { id: 8, category: 'ВИДЕО', title: 'CYBER ROBOT', img: 'assets/hero_robot.jpg', price: 490, model: 'kling-video', prompt: 'Futuristic cyborg awakening, mechanical parts glowing with blue energy, smooth cinematic camera motion' },
        { id: 9, category: 'ИГРЫ', title: 'ROBLOX HERO', img: 'images/photo1.jpg', price: 290, model: 'face-swap', prompt: 'Roblox blocky character hero style, bright game world colors, playful gaming atmosphere' },
        { id: 10, category: 'ТРЕНДЫ', title: 'ANIME VIBE', img: 'images/photo2.jpg', price: 290, model: 'face-swap', prompt: 'Makoto Shinkai anime style portrait, beautiful sky with fluffy clouds, vibrant pastel colors, expressive anime eyes' },
        { id: 11, sectionId: 4, sectionTitle: 'ПРИГЛАСИТЕЛЬНЫЕ', category: 'СВАДЬБА', title: 'ROYAL WEDDING', img: 'assets/hero_portrait.jpg', price: 490, model: 'invite-web', prompt: 'Свадебное интерактивное пригласительное с таймером и музыкой' },
        { id: 12, sectionId: 4, sectionTitle: 'ПРИГЛАСИТЕЛЬНЫЕ', category: 'КЫЗ УЗАТУУ', title: 'КЫЗ УЗАТУУ GOLD', img: 'assets/child.png', price: 490, model: 'invite-web', prompt: 'Интерактивное приглашение на Кыз Узатуу' },
        { id: 13, sectionId: 4, sectionTitle: 'ПРИГЛАСИТЕЛЬНЫЕ', category: 'ЮБИЛЕЙ', title: 'JUBILEE LUXURY', img: 'assets/man.jpg', price: 490, model: 'invite-web', prompt: 'Интерактивное приглашение на Юбилей' }
    ];
}

let activeSectionCard = mainCardsConfig.length > 0 ? mainCardsConfig[0] : null;

function normalizeTemplates(tplList, cardsList) {
    if (!Array.isArray(tplList)) return [];
    const cards = cardsList || mainCardsConfig;
    return tplList.map(t => {
        let sid = t.sectionId;
        let stitle = t.sectionTitle;
        let cat = t.category || 'ОБЩЕЕ';

        if (!sid) {
            const catUp = (cat || '').toUpperCase();
            const modelUp = (t.model || '').toLowerCase();
            const titleUp = (t.title || '').toUpperCase();
            if (catUp === 'ВИДЕО' || modelUp.includes('seedance') || modelUp.includes('omni') || modelUp.includes('kling') || modelUp.includes('video')) {
                sid = 2;
                stitle = 'ВИДЕО';
                if (catUp === 'ВИДЕО') cat = 'НЕОН';
            } else if (catUp === 'ТРЕНДЫ' || titleUp.includes('TREND')) {
                sid = 3;
                stitle = 'ТРЕНДЫ';
                if (catUp === 'ТРЕНДЫ') cat = 'TIKTOK';
            } else if (catUp.includes('ПРИГЛАС') || modelUp.includes('invite') || titleUp.includes('WEDDING') || titleUp.includes('ТОЙ') || titleUp.includes('УЗАТУУ')) {
                sid = 4;
                stitle = 'ПРИГЛАСИТЕЛЬНЫЕ';
                if (!cat || cat === 'ОБЩЕЕ') cat = 'СВАДЬБА';
            } else {
                sid = 1;
                stitle = 'ФОТО';
            }
        }

        const matchedCard = cards.find(c => c.id === Number(sid));
        if (matchedCard) {
            stitle = matchedCard.title;
        }

        return {
            ...t,
            id: Number(t.id) || Date.now(),
            sectionId: Number(sid),
            sectionTitle: stitle || 'ФОТО',
            category: cat
        };
    });
}

masterTemplates = normalizeTemplates(masterTemplates, mainCardsConfig);

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

// ПРОВЕРКА ТИПОВ ШАБЛОНОВ (ФОТО, ВИДЕО, ТРЕНДЫ)
function isVideoTemplate(tpl) {
    if (!tpl) return false;
    const m = (tpl.model || '').toLowerCase();
    const c = (tpl.category || '').toUpperCase();
    return c === 'ВИДЕО' || 
           m.includes('seedance') || 
           m.includes('omni') || 
           m.includes('kling') || 
           m.includes('video');
}

function isTrendsTemplate(tpl) {
    if (!tpl) return false;
    const c = (tpl.category || '').toUpperCase();
    const t = (tpl.title || '').toUpperCase();
    return c === 'ТРЕНДЫ' || t.includes('TREND');
}

function isInviteTemplate(tpl) {
    if (!tpl) return false;
    const m = (tpl.model || '').toLowerCase();
    const c = (tpl.category || '').toUpperCase();
    const t = (tpl.title || '').toUpperCase();
    const st = (tpl.sectionTitle || '').toUpperCase();
    return tpl.sectionId === 4 || 
           st.includes('ПРИГЛАС') || 
           m.includes('invite') || 
           c.includes('СВАДЬБА') || 
           c.includes('УЗАТУУ') || 
           c.includes('ЮБИЛЕЙ') || 
           c.includes('ТОЙ') ||
           t.includes('WEDDING');
}

let activeGridTab = 'ВСЕ';

// 1. ВЫБОР КАРТОЧКИ — МГНОВЕННОЕ ОТКРЫТИЕ 2-КОЛОНОЧНОЙ СЕТКИ ШАБЛОНОВ
window.selectCard = function(cardEl, cardIdOrMode) {
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

    // 3. Открываем галерею для конкретной кнопки
    openTemplateGallery(cardIdOrMode);

    setTimeout(() => {
        allCards.forEach(c => c.classList.remove('fly-left', 'fly-right', 'card-selected'));
        isSelectingCard = false;
    }, 400);
};

// 2. GRID ROUTER & RENDERER (ДЛЯ КАЖДОЙ КНОПКИ — СВОИ КАТЕГОРИИ И СВОИ ШАБЛОНЫ)
function openTemplateGallery(cardIdOrMode) {
    // Находим активную кнопку главного экрана
    let activeCard = null;
    if (typeof cardIdOrMode === 'number' || (!isNaN(Number(cardIdOrMode)) && String(Number(cardIdOrMode)) === String(cardIdOrMode).trim())) {
        activeCard = mainCardsConfig.find(c => c.id === Number(cardIdOrMode));
    }
    if (!activeCard && cardIdOrMode) {
        const modeStr = String(cardIdOrMode).trim().toUpperCase();
        activeCard = mainCardsConfig.find(c => 
            (c.filter && c.filter.toUpperCase() === modeStr) || 
            (c.title && c.title.toUpperCase() === modeStr) ||
            (c.category && c.category.toUpperCase() === modeStr)
        );
    }
    if (!activeCard) {
        activeCard = mainCardsConfig[0];
    }
    activeSectionCard = activeCard;

    try {
        const saved = localStorage.getItem('kiosk_templates_v2');
        if (saved !== null) {
            masterTemplates = normalizeTemplates(JSON.parse(saved), mainCardsConfig);
        }
    } catch(e) {}

    const modal = document.getElementById('template-modal');
    activeGridTab = 'ВСЕ';
    renderCategoryPillsBar();
    switchGridCategory('ВСЕ');
    if (modal) modal.classList.remove('hidden');
}

function closeTemplateGallery() {
    const modal = document.getElementById('template-modal');
    if (modal) modal.classList.add('hidden');
}

// РЕНДЕРИНГ ДИНАМИЧЕСКИХ ПЛАШЕК КАТЕГОРИЙ ДЛЯ ТЕКУЩЕЙ ВЫБРАННОЙ КНОПКИ
function renderCategoryPillsBar() {
    const bar = document.getElementById('category-pills-bar');
    if (!bar) return;
    bar.innerHTML = '';

    const card = activeSectionCard || mainCardsConfig[0];
    const cats = (card && Array.isArray(card.categories) && card.categories.length > 0) 
        ? card.categories 
        : ['ОБЩЕЕ'];

    const visibleCategories = ['ВСЕ', ...cats];

    visibleCategories.forEach(cat => {
        const btn = document.createElement('button');
        const isActive = (cat.toUpperCase() === activeGridTab.toUpperCase());

        btn.className = `cat-pill ${isActive ? 'active' : ''}`;
        btn.textContent = cat.toUpperCase();
        btn.onclick = () => switchGridCategory(cat);
        bar.appendChild(btn);
    });
}

// ПЕРЕКЛЮЧЕНИЕ КАТЕГОРИИ ВНУТРИ ВЫБРАННОЙ КНОПКИ
window.switchGridCategory = function(catName) {
    activeGridTab = catName;

    const card = activeSectionCard || mainCardsConfig[0];
    const cardTitle = card ? (card.title || 'ШАБЛОНЫ') : 'ШАБЛОНЫ';
    const titleEl = document.getElementById('grid-modal-title');
    if (titleEl) {
        if (catName.toUpperCase() === 'ВСЕ') {
            titleEl.textContent = cardTitle;
        } else {
            titleEl.textContent = `${cardTitle} • ${catName.toUpperCase()}`;
        }
    }

    document.querySelectorAll('.cat-pill').forEach(pill => {
        const pText = pill.textContent.trim().toUpperCase();
        if (pText === catName.toUpperCase()) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });

    renderGridTemplates();
};

function renderGridTemplates() {
    const card = activeSectionCard || mainCardsConfig[0];
    const targetSecId = card ? card.id : 1;
    const targetTitle = card ? (card.title || '').toUpperCase() : '';

    // 1. Фильтруем пул шаблонов СТРОГО по выбранной кнопке
    let scoped = masterTemplates.filter(t => {
        if (t.sectionId !== undefined && t.sectionId !== null) {
            return Number(t.sectionId) === targetSecId;
        }
        if (t.sectionTitle && targetTitle && t.sectionTitle.toUpperCase() === targetTitle) {
            return true;
        }
        // Обратная совместимость для старых шаблонов без sectionId
        if (targetSecId === 2 || targetTitle.includes('ВИДЕО')) return isVideoTemplate(t);
        if (targetSecId === 3 || targetTitle.includes('ТРЕНД')) return isTrendsTemplate(t);
        if (targetSecId === 4 || targetTitle.includes('ПРИГЛАС')) return isInviteTemplate(t);
        return !isVideoTemplate(t) && !isTrendsTemplate(t) && !isInviteTemplate(t);
    });

    // 2. Внутри раздела фильтруем по выбранной подкатегории кнопки
    let list = scoped;
    if (activeGridTab.toUpperCase() !== 'ВСЕ') {
        list = scoped.filter(item => (item.category || '').toUpperCase() === activeGridTab.toUpperCase());
    }

    const container = document.getElementById('template-grid-2col');
    if (!container) return;
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 70px 20px; color: var(--text-dim);">
                <div style="margin-bottom: 14px; display: flex; justify-content: center; opacity: 0.9;">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#D4A043" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
                <div style="font-size: 17px; font-weight: 700; color: #ffffff;">В этом разделе пока нет шаблонов</div>
                <div style="font-size: 13px; margin-top: 6px; color: var(--text-muted);">Добавьте шаблоны через панель администратора /admin</div>
            </div>
        `;
        return;
    }

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

        // При клике на карточку — сразу переходим к экрану оплаты Finik ELQR!
        card.addEventListener('click', () => {
            if (isAttractClosing) return; // поглощаем клик закрытия заставки
            selectedStyle = item.title;
            selectedStylePhoto = item.img;
            selectedStylePrice = itemPrice;
            selectedStyleModel = item.model || 'face-swap';
            selectedStylePrompt = item.prompt || '';
            selectedTemplateId = item.id;
            selectedTemplateHtml = item.htmlCode || '';
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
    const stepConfirm = document.getElementById('step-confirm');
    const stepPayment = document.getElementById('step-payment');
    const stepProcessing = document.getElementById('step-processing');
    const stepResult = document.getElementById('step-result');
    const stepInviteSetup = document.getElementById('step-invite-setup');
    const stepInviteReady = document.getElementById('step-invite-ready');
    const stepInviteDemo = document.getElementById('step-invite-demo');

    // Invite Elements
    const inviteDemoFrame = document.getElementById('invite-demo-frame');
    const inviteDemoTitle = document.getElementById('invite-demo-title');
    const inviteDemoName = document.getElementById('invite-demo-name');
    const inviteDemoPrice = document.getElementById('invite-demo-price');
    const inviteDemoChooseBtn = document.getElementById('invite-demo-choose-btn');
    const inviteDemoBackBtn = document.getElementById('invite-demo-back-btn');

    const inviteEditQr = document.getElementById('invite-edit-qr');
    const inviteSetupStatus = document.getElementById('invite-setup-status');
    const skipToViewInviteBtn = document.getElementById('skip-to-view-invite-btn');
    const invitePreviewFrame = document.getElementById('invite-preview-frame');
    const inviteFinalShareQr = document.getElementById('invite-final-share-qr');
    const inviteFinishBtn = document.getElementById('invite-finish-btn');
    const inviteReEditBtn = document.getElementById('invite-re-edit-btn');
    const inviteRefreshBtn = document.getElementById('invite-refresh-btn');
    let currentInviteId = null;
    let invitePollingTimer = null;
    let lastKnownInviteTime = null;

    // Camera & Confirm Elements
    const webcamEl = document.getElementById('webcam');
    const canvasEl = document.getElementById('photo-canvas');
    const snapBtn = document.getElementById('snap-btn');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const photoPreviewConfirm = document.getElementById('photo-preview-confirm');
    const retakeBtn = document.getElementById('retake-btn');
    const confirmPhotoBtn = document.getElementById('confirm-photo-btn');

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
    const resultVideo = document.getElementById('result-video');
    const finishBtn = document.getElementById('finish-btn');
    const aiStatusText = document.getElementById('ai-status-text');

    let mediaStream = null;
    let capturedPhotoData = null;
    let currentOrderId = null;
    let paymentPollTimer = null;
    let phoneCamPollTimer = null;       // полинг загруженного фото с телефона
    let phoneCamSessionId = null;       // уникальный ID сессии телефонной камеры
    let phoneCamMode = false;           // true = гость использует телефонную камеру

    // Supabase для мгновенного получения фото с телефона (без backend)
    const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
    const SUPABASE_BUCKET = 'kiosk-media';


    // ШАГ 1: ОТКРЫТИЕ ПОТОКА — ДЛЯ ПРИГЛАСИТЕЛЬНЫХ СНАЧАЛА ДЕМО, ДЛЯ ОСТАЛЬНЫХ ОПЛАТА
    window.openKioskFlow = function() {
        const isInvite = isInviteTemplate({ 
            sectionTitle: activeSectionCard ? activeSectionCard.title : '',
            category: currentCategory,
            title: selectedStyle,
            model: selectedStyleModel
        });

        if (modal) modal.style.display = 'flex';

        if (isInvite) {
            showInviteDemoStep();
        } else {
            showStep(stepPayment);
            initiatePaymentOrder();
        }
    };

    function showInviteDemoStep() {
        if (!stepInviteDemo) {
            showStep(stepPayment);
            initiatePaymentOrder();
            return;
        }

        if (inviteDemoName) inviteDemoName.textContent = selectedStyle;
        if (inviteDemoPrice) inviteDemoPrice.textContent = selectedStylePrice || 490;

        // Загрузка демо шаблона во фрейм
        if (inviteDemoFrame) {
            if (selectedTemplateHtml) {
                inviteDemoFrame.srcdoc = selectedTemplateHtml;
            } else {
                const origin = window.location.origin || 'https://kiosk394.vercel.app';
                inviteDemoFrame.src = `${origin}/kiosk-ui/invite.html?preview=1${selectedTemplateId ? '&templateId=' + selectedTemplateId : ''}`;
            }
        }

        showStep(stepInviteDemo);
    }

    if (inviteDemoChooseBtn) {
        inviteDemoChooseBtn.addEventListener('click', () => {
            showStep(stepPayment);
            initiatePaymentOrder();
        });
    }

    if (inviteDemoBackBtn) {
        inviteDemoBackBtn.addEventListener('click', () => {
            closeKioskFlow();
            openTemplateGallery();
        });
    }

    modalClose.addEventListener('click', closeKioskFlow);
    if (cancelPayBtn) {
        cancelPayBtn.addEventListener('click', () => {
            closeKioskFlow();
            openTemplateGallery();
        });
    }

    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            showStep(stepCamera);
            // Если был режим телефона — восстановим его UI
            if (phoneCamMode) {
                switchToPhoneCam();
            } else {
                startWebcam();
            }
        });
    }

    if (confirmPhotoBtn) {
        confirmPhotoBtn.addEventListener('click', () => {
            showStep(stepProcessing);
            runAIGeneration();
        });
    }

    function closeKioskFlow() {
        stopPaymentPolling();
        stopWebcam();
        stopPhoneCamPolling();
        stopInvitePolling();
        // Удаляем файл телефонной сессии из Supabase при выходе
        if (phoneCamSessionId) {
            fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/phone-cam/${phoneCamSessionId}.jpg`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            }).catch(() => {});
        }
        phoneCamMode = false;
        phoneCamSessionId = null;
        currentInviteId = null;
        if (photoPreviewConfirm) photoPreviewConfirm.src = '';
        if (resultVideo) {
            try {
                resultVideo.pause();
                resultVideo.src = '';
            } catch(e) {}
        }
        modal.style.display = 'none';
        resetState();
    }

    function showStep(stepEl) {
        [stepCamera, stepConfirm, stepPayment, stepProcessing, stepResult, stepInviteSetup, stepInviteReady, stepInviteDemo].forEach(s => {
            if (s) s.style.display = 'none';
        });
        if (stepEl) stepEl.style.display = 'block';
    }

    function resetState() {
        countdownOverlay.textContent = '';
        currentOrderId = null;
    }

    // ============================================================
    //  ПЕРЕКЛЮЧЕНИЕ ИСТОЧНИКА КАМЕРЫ: КИОСК / ТЕЛЕФОН
    // ============================================================
    const tabKioskCam  = document.getElementById('tab-kiosk-cam');
    const tabPhoneCam  = document.getElementById('tab-phone-cam');
    const webcamLiveBox    = document.getElementById('webcam-live-box');
    const phoneCamPanel    = document.getElementById('phone-cam-panel');
    const phoneQrImg       = document.getElementById('phone-qr-img');
    const timerSelectWrap  = document.getElementById('timer-select-wrapper');
    const snapBtnEl        = document.getElementById('snap-btn');
    const camSubtitle      = document.getElementById('cam-subtitle');

    if (tabKioskCam) {
        tabKioskCam.addEventListener('click', () => {
            phoneCamMode = false;
            stopPhoneCamPolling();
            tabKioskCam.classList.add('active');
            tabPhoneCam.classList.remove('active');
            // Показываем камеру, скрываем QR
            if (webcamLiveBox) webcamLiveBox.style.display = '';
            if (phoneCamPanel) phoneCamPanel.classList.remove('visible');
            if (timerSelectWrap) timerSelectWrap.style.display = '';
            if (snapBtnEl) snapBtnEl.style.display = '';
            if (camSubtitle) camSubtitle.textContent = 'Встаньте по центру и смотрите в камеру';
            startWebcam();
        });
    }

    if (tabPhoneCam) {
        tabPhoneCam.addEventListener('click', () => {
            switchToPhoneCam();
        });
    }

    function switchToPhoneCam() {
        phoneCamMode = true;
        stopWebcam();
        tabPhoneCam.classList.add('active');
        if (tabKioskCam) tabKioskCam.classList.remove('active');
        // Скрываем живую камеру, показываем QR-панель
        if (webcamLiveBox) webcamLiveBox.style.display = 'none';
        if (timerSelectWrap) timerSelectWrap.style.display = 'none';
        if (snapBtnEl) snapBtnEl.style.display = 'none';
        if (camSubtitle) camSubtitle.textContent = 'Откройте ссылку на телефоне и сделайте снимок';
        if (phoneCamPanel) phoneCamPanel.classList.add('visible');

        // Удаляем старый файл предыдущей сессии из Supabase (не засоряем базу)
        if (phoneCamSessionId) {
            const oldPath = `phone-cam/${phoneCamSessionId}.jpg`;
            fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${oldPath}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            }).catch(() => {}); // Игнорируем ошибки удаления
        }

        // Генерируем уникальный session ID
        phoneCamSessionId = 'cam-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

        // Формируем URL мобильной страницы
        const origin = location.origin || 'https://kiosk394.vercel.app';
        const phoneUrl = `${origin}/kiosk-ui/phone-cam.html?session=${phoneCamSessionId}`;

        // QR через бесплатный API
        if (phoneQrImg) {
            phoneQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=000000&bgcolor=ffffff&data=${encodeURIComponent(phoneUrl)}`;
        }

        // Запускаем полинг появления фото в Supabase
        startPhoneCamPolling(phoneCamSessionId);
    }

    // Полинг фото с телефона каждые 2 секунды
    function startPhoneCamPolling(sessionId) {
        stopPhoneCamPolling();
        phoneCamPollTimer = setInterval(async () => {
            if (sessionId !== phoneCamSessionId) { clearInterval(phoneCamPollTimer); return; }
            try {
                const url = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/phone-cam/${sessionId}.jpg?_t=${Date.now()}`;
                const res = await fetch(url, { method: 'HEAD' });
                if (res.ok) {
                    stopPhoneCamPolling();
                    // Фото готово — загружаем его как capturedPhotoData
                    const imgRes = await fetch(url);
                    const blob = await imgRes.blob();
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        capturedPhotoData = e.target.result;
                        if (photoPreviewConfirm) photoPreviewConfirm.src = capturedPhotoData;
                        showStep(stepConfirm);
                    };
                    reader.readAsDataURL(blob);
                }
            } catch(e) { /* игнорируем сетевые ошибки */ }
        }, 2000);
    }

    function stopPhoneCamPolling() {
        if (phoneCamPollTimer) {
            clearInterval(phoneCamPollTimer);
            phoneCamPollTimer = null;
        }
    }

    // Сбрасываем UI камеры при открытии шага camera (по умолчанию — киоск)
    function resetCameraStep() {
        phoneCamMode = false;
        if (tabKioskCam) tabKioskCam.classList.add('active');
        if (tabPhoneCam) tabPhoneCam.classList.remove('active');
        if (webcamLiveBox) webcamLiveBox.style.display = '';
        if (phoneCamPanel) phoneCamPanel.classList.remove('visible');
        if (timerSelectWrap) timerSelectWrap.style.display = '';
        if (snapBtnEl) snapBtnEl.style.display = '';
        if (camSubtitle) camSubtitle.textContent = 'Встаньте по центру и смотрите в камеру';
    }



    // ИНИЦИАЛИЗАЦИЯ ЗАКАЗА И QR-КОДА OBUSINESS ELQR
    async function initiatePaymentOrder() {
        if (payStyleTitle) payStyleTitle.textContent = selectedStyle;
        if (paySelectedThumb) paySelectedThumb.src = selectedStylePhoto;
        if (payAmountVal) payAmountVal.textContent = selectedStylePrice || 290;
        
        const paySubtext = document.querySelector('.pay-subtext');
        if (paySubtext) {
            if (isInviteTemplate({ title: selectedStyle, model: selectedStyleModel, category: currentCategory })) {
                paySubtext.textContent = 'Интерактивный сайт-приглашение с музыкой';
            } else {
                paySubtext.textContent = 'Финальное фото в студийном качестве';
            }
        }

        if (paymentStatusText) paymentStatusText.textContent = 'Подготовка QR-кода оплаты...';

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
                if (paymentStatusText) paymentStatusText.textContent = 'Ожидание оплаты...';
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
            if (paymentStatusText) paymentStatusText.textContent = 'Ожидание оплаты...';
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

    // ОПЛАТА УСПЕШНО ПОЛУЧЕНА
    function handlePaymentSuccess() {
        const isInvite = isInviteTemplate({ 
            sectionTitle: activeSectionCard ? activeSectionCard.title : '',
            category: currentCategory,
            title: selectedStyle,
            model: selectedStyleModel
        });

        if (isInvite) {
            if (paymentStatusText) {
                paymentStatusText.textContent = '✅ Оплата получена! Переходим к настройке...';
            }
            setTimeout(() => {
                startInviteFlow();
            }, 1000);
            return;
        }

        if (paymentStatusText) {
            paymentStatusText.textContent = '✅ Оплата получена! Включаем камеру...';
        }
        setTimeout(() => {
            resetCameraStep();
            showStep(stepCamera);
            startWebcam();
        }, 1000);
    }

    // ============================================================
    //  ЛОГИКА ПРИГЛАСИТЕЛЬНЫХ (INVITE FLOW)
    // ============================================================
    function startInviteFlow() {
        currentInviteId = 'inv-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const origin = window.location.origin || 'https://kiosk394.vercel.app';
        let editUrl = `${origin}/kiosk-ui/invite-edit.html?id=${currentInviteId}`;
        if (selectedTemplateId) {
            editUrl += `&templateId=${encodeURIComponent(selectedTemplateId)}`;
        }

        if (inviteEditQr) {
            inviteEditQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(editUrl)}`;
        }
        if (inviteSetupStatus) {
            inviteSetupStatus.textContent = 'Ожидание заполнения и публикации со смартфона...';
        }

        showStep(stepInviteSetup);
        startInvitePolling(currentInviteId, false);
    }

    function startInvitePolling(invId, isEdit = false) {
        stopInvitePolling();
        invitePollingTimer = setInterval(async () => {
            if (!invId || invId !== currentInviteId) return;
            try {
                const checkUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/invites/${invId}.json?t=${Date.now()}`;
                const res = await fetch(checkUrl);
                if (res.ok) {
                    const data = await res.json();
                    if (!isEdit) {
                        // Первичное появление файла
                        stopInvitePolling();
                        lastKnownInviteTime = data.updatedAt || new Date().toISOString();
                        handleInviteReady(invId);
                    } else {
                        // Режим редактирования: ждем обновления updatedAt
                        if (data.updatedAt && data.updatedAt !== lastKnownInviteTime) {
                            stopInvitePolling();
                            lastKnownInviteTime = data.updatedAt;
                            handleInviteReady(invId);
                        }
                    }
                }
            } catch (e) {}
        }, 2000);
    }

    function stopInvitePolling() {
        if (invitePollingTimer) {
            clearInterval(invitePollingTimer);
            invitePollingTimer = null;
        }
    }

    function handleInviteReady(invId) {
        const origin = window.location.origin || 'https://kiosk394.vercel.app';
        const finalUrl = `${origin}/kiosk-ui/invite.html?id=${invId}`;

        if (invitePreviewFrame) {
            invitePreviewFrame.src = `${finalUrl}&preview_t=${Date.now()}`;
        }
        if (inviteFinalShareQr) {
            inviteFinalShareQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(finalUrl)}`;
        }

        showStep(stepInviteReady);
    }

    if (skipToViewInviteBtn) {
        skipToViewInviteBtn.addEventListener('click', () => {
            stopInvitePolling();
            handleInviteReady(currentInviteId || 'demo');
        });
    }

    if (inviteFinishBtn) {
        inviteFinishBtn.addEventListener('click', closeKioskFlow);
    }

    if (inviteReEditBtn) {
        inviteReEditBtn.addEventListener('click', () => {
            if (currentInviteId) {
                const origin = window.location.origin || 'https://kiosk394.vercel.app';
                let editUrl = `${origin}/kiosk-ui/invite-edit.html?id=${currentInviteId}`;
                if (selectedTemplateId) {
                    editUrl += `&templateId=${encodeURIComponent(selectedTemplateId)}`;
                }
                if (inviteEditQr) {
                    inviteEditQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(editUrl)}`;
                }
                if (inviteSetupStatus) {
                    inviteSetupStatus.textContent = 'Ожидание сохранения правок со смартфона...';
                }
                showStep(stepInviteSetup);
                startInvitePolling(currentInviteId, true);
            }
        });
    }

    if (inviteRefreshBtn) {
        inviteRefreshBtn.addEventListener('click', () => {
            if (invitePreviewFrame && currentInviteId) {
                const origin = window.location.origin || 'https://kiosk394.vercel.app';
                invitePreviewFrame.src = `${origin}/kiosk-ui/invite.html?id=${currentInviteId}&preview_t=${Date.now()}`;
            }
        });
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

    // 2. WEBCAM LOGIC (ОПТИМИЗИРОВАННЫЙ ПОТОК БЕЗ ЛАГОВ И ЗАВИСАНИЙ)
    async function startWebcam() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Браузер не поддерживает камеру или страница открыта без HTTPS.');
            return;
        }

        try {
            // 1. Поиск подключенных камер (Logitech / Brio или внешняя камера)
            let chosenDeviceId = null;
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === 'videoinput');

                const brio = videoDevices.find(d => 
                    d.label.toLowerCase().includes('brio') || 
                    d.label.toLowerCase().includes('logitech')
                );

                if (brio) {
                    chosenDeviceId = brio.deviceId;
                } else if (videoDevices.length > 0) {
                    chosenDeviceId = videoDevices[videoDevices.length - 1].deviceId;
                }
            } catch(e) {
                console.warn('Не удалось получить список устройств:', e);
            }

            // 2. Строгий профиль 1280×720 без авторесайзинга — устраняет лаги низкого FPS
            const videoConstraints = {
                width:  { exact: 1280 },
                height: { exact: 720 },
                frameRate: { ideal: 60, min: 30 },
                resizeMode: 'none'
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
            } catch (errExact) {
                console.warn('exact 1280x720 отклонён, fallback ideal:', errExact);
                // Fallback: ideal-режим без exact — браузер подберёт ближайшее
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 },
                        ...(chosenDeviceId ? { deviceId: { ideal: chosenDeviceId } } : { facingMode: 'user' })
                    }
                });
            }

            webcamEl.srcObject = mediaStream;
            // play() сразу — не ждём loadedmetadata во избежание задержки отображения
            webcamEl.play().catch(e => console.warn('Webcam play error:', e));
        } catch (err) {
            console.error('Ошибка доступа к камере:', err);
            alert('Не удалось подключиться к камере. Убедитесь, что камера не занята другим приложением и разрешен доступ в браузере.');
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

    // 3. SNAP PHOTO, COUNTDOWN И ПОДТВЕРЖДЕНИЕ ГОСТЕМ
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
                countdownOverlay.innerHTML = '<span style="font-size: 72px; color: var(--primary);">✦</span>';
                takeSnapshot();
                setTimeout(() => {
                    stopWebcam();
                    snapBtn.disabled = false;
                    countdownOverlay.textContent = '';
                    if (photoPreviewConfirm) {
                        photoPreviewConfirm.src = capturedPhotoData;
                    }
                    showStep(stepConfirm);
                }, 400);
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

    // 4. СТУДИЙНАЯ ОБРАБОТКА И СОЗДАНИЕ ПОРТРЕТА (БЕЗ УПОМИНАНИЙ ИИ И МОДЕЛЕЙ)
    async function runAIGeneration() {
        const statuses = [
            `Анализ кадра и ракурса...`,
            `Стилизация портрета...`,
            `Применение художественного освещения...`,
            `Цветокоррекция и ретушь...`,
            `Подготовка финального фото...`
        ];

        let idx = 0;
        if (aiStatusText) aiStatusText.textContent = statuses[0];

        const interval = setInterval(() => {
            idx++;
            if (idx < statuses.length && aiStatusText) {
                aiStatusText.textContent = statuses[idx];
            }
        }, 1300);

        let finalResultUrl = selectedStylePhoto;

        try {
            const aggregatorUrl = localStorage.getItem('kiosk_aggregator_url') || '';
            const aggregatorKey = localStorage.getItem('kiosk_aggregator_key') || '';

            const resp = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    photoData: capturedPhotoData,
                    templateImg: selectedStylePhoto,
                    prompt: selectedStylePrompt,
                    model: selectedStyleModel,
                    title: selectedStyle,
                    orderId: currentOrderId,
                    aggregatorUrl,
                    aggregatorKey
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                if (data.success && data.resultUrl) {
                    finalResultUrl = data.resultUrl;
                }
            }
        } catch (err) {
            console.warn('[AI Pipeline] Ошибка генерации, переключаем на превью стиля:', err);
        }

        clearInterval(interval);
        const isVideo = finalResultUrl.endsWith('.mp4') || finalResultUrl.endsWith('.webm') || finalResultUrl.includes('/video/') || selectedStyleModel === 'seedance-2.5' || selectedStyleModel === 'omni-flash' || selectedStyleModel === 'kling-video' || selectedStyleModel.includes('omni') || selectedStyleModel.includes('video');
        if (isVideo && resultVideo) {
            resultVideo.src = finalResultUrl;
            resultVideo.style.display = 'block';
            resultVideo.play().catch(() => {});
            if (resultImg) resultImg.style.display = 'none';
        } else if (resultImg) {
            resultImg.src = finalResultUrl;
            resultImg.style.display = 'block';
            if (resultVideo) {
                resultVideo.pause();
                resultVideo.style.display = 'none';
            }
        }
        showStep(stepResult);
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
                const cur = list[activeTemplateIndex];
                selectedStyle = cur.title;
                selectedStylePhoto = cur.img;
                selectedStylePrice = cur.price || 290;
                selectedStyleModel = cur.model || 'face-swap';
                selectedStylePrompt = cur.prompt || '';
                selectedTemplateId = cur.id;
                selectedTemplateHtml = cur.htmlCode || '';
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
                if (data.main_header) {
                    mainHeaderConfig = data.main_header;
                    localStorage.setItem('kiosk_main_header_v1', JSON.stringify(data.main_header));
                }
                if (Array.isArray(data.main_cards) && data.main_cards.length > 0) {
                    mainCardsConfig = normalizeMainCards(data.main_cards);
                    localStorage.setItem('kiosk_main_cards_v1', JSON.stringify(mainCardsConfig));
                }
                renderMainCards();

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
                    masterTemplates = normalizeTemplates(data.templates, mainCardsConfig);
                    localStorage.setItem('kiosk_templates_v2', JSON.stringify(masterTemplates));
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

    // Инициализация главного экрана, синхронизация с облаком и запуск таймера
    // Скрываем карточки до получения актуальных данных — убираем мигание старого фото
    const cardsContainer = document.getElementById('main-cards-container');
    if (cardsContainer) {
        cardsContainer.style.opacity = '0';
        cardsContainer.style.transition = 'opacity 0.35s ease';
    }

    renderMainCards(); // рендер из localStorage (пока скрыт)

    // Показываем карточки только после получения облачных данных
    syncCloudConfig().finally(() => {
        if (cardsContainer) cardsContainer.style.opacity = '1';
    });

    // Fallback: если облако не ответило за 1.5 сек — всё равно показываем
    setTimeout(() => {
        if (cardsContainer && cardsContainer.style.opacity === '0') {
            cardsContainer.style.opacity = '1';
        }
    }, 1500);

    resetInactivityTimer();
});
