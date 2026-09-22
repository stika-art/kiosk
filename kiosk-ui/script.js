// =============================================
// TRENDUM AI PHOTO KIOSK — INTERACTIVE ENGINE
// =============================================

let selectedStyle = 'ROBLOX HERO';
let selectedStylePhoto = 'images/photo1.jpg';
let selectedStylePrice = 290;
let selectedStyleLocation = '';
let isTryOnMode = false;
let selectedStyleModel = 'chatgpt-2.5';
let selectedStylePrompt = 'Roblox blocky character hero style, bright game world colors, playful gaming atmosphere';
let selectedStyleResolution = '2K';
let selectedTemplateId = null;
let selectedTemplateHtml = '';
let isSelectingCard = false;
let isAttractClosing = false;
let currentCategory = 'ФОТО';
let activeTemplateIndex = 0;

// УПРАВЛЕНИЕ РАЗРЕШЕНИЕМ ГЕНЕРАЦИИ (1K, 2K HD, 4K ULTRA)
let currentAiResolution = localStorage.getItem('kiosk_ai_resolution') || '2K';

function setAiResolution(res) {
    let cleanRes = (res || '2K').toUpperCase();
    if (!['1K', '2K', '4K'].includes(cleanRes)) cleanRes = '2K';
    currentAiResolution = cleanRes;
    localStorage.setItem('kiosk_ai_resolution', currentAiResolution);
    
    document.querySelectorAll('.ai-res-pill').forEach(btn => {
        if (btn.dataset.res === currentAiResolution) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const badge = document.getElementById('pay-res-indicator');
    if (badge) {
        badge.textContent = currentAiResolution + (currentAiResolution === '2K' ? ' HD' : currentAiResolution === '4K' ? ' Ultra' : '');
    }
}
window.setAiResolution = setAiResolution;

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
    let list = Array.isArray(cards) ? [...cards] : [];
    // Полностью удаляем любые карточки пригласительных
    list = list.filter(c => {
        const t = (c.title || '').toUpperCase();
        const f = (c.filter || '').toUpperCase();
        return !t.includes('ПРИГЛАС') && f !== 'INVITE' && f !== 'INVITES';
    });

    if (list.length === 0) {
        list = [
            { id: 1, title: 'ФОТО', badge: 'ОБЛОЖКИ • ПОРТРЕТЫ • АРТ', subtitle: 'БОЛЕЕ 100 СТИЛЕЙ СТУДИЙНОЙ СЪЁМКИ', filter: 'PHOTO', category: 'ФОТО', img: 'images/photo1.jpg', categories: ['ОБЛОЖКИ', 'МУЛЬТИКИ', 'ИГРЫ', 'КИБЕРПАНК', 'АРТ'] },
            { id: 2, title: 'ВИДЕО', badge: 'КИНЕМАТОГРАФИЧНОЕ ВИДЕО', subtitle: 'ЖИВЫЕ ПОРТРЕТЫ И АНИМАЦИЯ', filter: 'VIDEO', category: 'ВИДЕО', img: 'images/photo3.jpg', categories: ['КИНЕМАТОГРАФ', 'НЕОН', 'АНИМАЦИЯ', 'РЕТРО VHS'] },
            { id: 3, title: 'ТРЕНДЫ', badge: 'ПОПУЛЯРНЫЕ ОБРАЗЫ', subtitle: 'СОВРЕМЕННЫЕ ЭСТЕТИЧЕСКИЕ ОБРАЗЫ', filter: 'TRENDS', category: 'ТРЕНДЫ', img: 'assets/hero_robot.jpg', categories: ['TIKTOK', 'REELS', 'ПРОЖАРКА', 'INSTA VIBE'] },
            { id: 4, title: 'ПРИМЕРКА', badge: 'ОНЛАЙН ПРИМЕРКА • ОДЕЖДА • МЕРЧ', subtitle: 'ПРИМЕРЬТЕ ТОЛСТОВКИ, ХУДИ И ТОВАРЫ В 1 КЛИК', filter: 'TRYON', category: 'ПРИМЕРКА', img: 'assets/1489.jpg', categories: ['ТОЛСТОВКИ', 'ХУДИ', 'ФУТБОЛКИ', 'КУРТКИ', 'МЕРЧ'] }
        ];
    } else {
        let tryOnCard = list.find(c => c.id === 4 || c.id === 5 || (c.title && c.title.toUpperCase().includes('ПРИМЕР')));
        if (!tryOnCard) {
            list.push({
                id: 4,
                title: 'ПРИМЕРКА',
                badge: 'ОНЛАЙН ПРИМЕРКА • ОДЕЖДА • МЕРЧ',
                subtitle: 'ПРИМЕРЬТЕ ТОЛСТОВКИ, ХУДИ И ТОВАРЫ В 1 КЛИК',
                filter: 'TRYON',
                category: 'ПРИМЕРКА',
                img: 'assets/1489.jpg',
                categories: ['ТОЛСТОВКИ', 'ХУДИ', 'ФУТБОЛКИ', 'КУРТКИ', 'МЕРЧ']
            });
        } else {
            tryOnCard.id = 4;
            tryOnCard.title = 'ПРИМЕРКА';
            tryOnCard.filter = 'TRYON';
        }
    }

    return list.map(c => {
        const titleUp = (c.title || '').toUpperCase();
        let cats = Array.isArray(c.categories) && c.categories.length > 0 ? [...c.categories] : null;
        if (!cats) {
            if (c.id === 1 || titleUp === 'ФОТО') {
                cats = ['ОБЛОЖКИ', 'МУЛЬТИКИ', 'ИГРЫ', 'КИБЕРПАНК', 'АРТ'];
            } else if (c.id === 2 || titleUp === 'ВИДЕО') {
                cats = ['КИНЕМАТОГРАФ', 'НЕОН', 'АНИМАЦИЯ', 'РЕТРО VHS'];
            } else if (c.id === 3 || titleUp === 'ТРЕНДЫ') {
                cats = ['TIKTOK', 'REELS', 'ПРОЖАРКА', 'INSTA VIBE'];
            } else if (c.id === 4 || c.id === 5 || titleUp.includes('ПРИМЕР') || titleUp.includes('ОДЕЖД')) {
                cats = ['ТОЛСТОВКИ', 'ХУДИ', 'ФУТБОЛКИ', 'КУРТКИ', 'МЕРЧ'];
            } else {
                cats = [c.title || 'ОБЩЕЕ'];
            }
        } else if ((c.id === 3 || titleUp === 'ТРЕНДЫ') && !cats.some(ct => ct.toUpperCase() === 'ПРОЖАРКА')) {
            cats.splice(2, 0, 'ПРОЖАРКА');
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
        { id: 1, title: 'ROBLOX HERO', desc: 'СТАНЬ ГЕРОЕМ ЛЮБИМОЙ ИГРЫ', img: 'images/photo1.jpg', model: 'chatgpt-2.5', resolution: '2K', prompt: 'Roblox hero blocky style' },
        { id: 2, title: 'CYBER SAMURAI', desc: 'КИБЕРПАНК ВОИН 2077', img: 'images/photo3.jpg', model: 'chatgpt-2.5', resolution: '2K', prompt: 'Cyberpunk samurai in neon armor' },
        { id: 3, title: 'ANIME WORLD', desc: 'АНИМЕ ГЕРОЙ В СОЧНЫХ ЦВЕТАХ', img: 'images/photo2.jpg', model: 'chatgpt-2.5', resolution: '2K', prompt: 'Anime style hero' },
        { id: 4, title: 'FORBES COVER', desc: 'ТЫ НА ГЛАВНОЙ СТРАНИЦЕ FORBES', img: 'assets/hero_portrait.jpg', model: 'chatgpt-2.5', resolution: '2K', prompt: 'Forbes magazine cover' },
        { id: 5, title: 'GIGACHAD SIGMA', desc: 'ХАРИЗМА И СТИЛЬ 100%', img: 'assets/hero_avatar.jpg', model: 'chatgpt-2.5', resolution: '2K', prompt: 'Sigma male portrait' }
    ],
    'ВИДЕО': [
        { id: 1, title: 'NEON MOTION', desc: 'ОЖИВИ СВОЙ ПОРТРЕТ В НЕОНЕ', img: 'images/photo3.jpg', model: 'kling-video', resolution: '2K', prompt: 'Neon light streaks swirling around cyberpunk hero' },
        { id: 2, title: 'RETRO 90S VHS', desc: 'КИНЕМАТОГРАФИЧНЫЙ РЕТРО ЭФФЕКТ', img: 'images/photo1.jpg', model: 'kling-video', resolution: '2K', prompt: 'Vintage 90s VHS tape glitch effect' },
        { id: 3, title: 'CYBER ROBOT', desc: 'ФУТУРИСТИЧНАЯ АНИМАЦИЯ', img: 'assets/hero_robot.jpg', model: 'kling-video', resolution: '2K', prompt: 'Futuristic cyborg awakening' }
    ],
    'ТРЕНДЫ': [
        { id: 1, title: 'TIKTOK DANCE', desc: 'ВИРУСНЫЙ ТАНЦЕВАЛЬНЫЙ ЧЕЛЛЕНДЖ', img: 'assets/hero_robot.jpg', model: 'kling-video', resolution: '2K', prompt: 'TikTok dance animation' },
        { id: 2, title: 'REELS VIBE', desc: 'ПОПУЛЯРНЫЙ ТРЕНД ИЗ ИНСТАГРАМ', img: 'assets/hero_avatar.jpg', model: 'chatgpt-2.5', resolution: '2K', prompt: 'Reels trending aesthetic' }
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
        { id: 1, category: 'МУЛЬТИКИ', title: 'KIDS FANTASY', img: 'assets/child.png', price: 290, model: 'nano-banana-2', resolution: '2K', prompt: '3D animation style, cute soft studio lighting, vibrant colors' },
        { id: 2, category: 'КИБЕРПАНК', title: 'CYBER MAN', img: 'assets/man.jpg', price: 350, model: 'nano-banana-2', resolution: '2K', prompt: 'Cyberpunk style in high-tech carbon neon suit, rainy Neo-Tokyo background, volumetric lighting' },
        { id: 3, category: 'ТРЕНДЫ', title: 'TRENDING PHOTO', img: 'assets/1489.jpg', price: 290, model: 'nano-banana-2', resolution: '2K', prompt: 'Trending aesthetic style, warm natural golden hour sunlight, soft 85mm lens depth of field' },
        { id: 4, category: 'ОБЛОЖКИ', title: 'FORBES COVER', img: 'assets/hero_portrait.jpg', price: 390, model: 'nano-banana-2', resolution: '2K', prompt: 'Prestigious Forbes business magazine cover style, elegant business suit, studio lighting' },
        { id: 5, category: 'ОБЛОЖКИ', title: 'GIGACHAD SIGMA', img: 'assets/hero_avatar.jpg', price: 350, model: 'nano-banana-2', resolution: '2K', prompt: 'Dramatic black and white high contrast lighting, chiseled shadow aesthetic' },
        { id: 6, category: 'ВИДЕО', title: 'NEON MOTION', img: 'assets/honor.jpg', price: 450, model: 'kling-video', resolution: '2K', prompt: 'Neon light streaks swirling around cyberpunk hero, subtle dynamic head turn and breathing animation, cinematic 4k' },
        { id: 7, category: 'ВИДЕО', title: 'RETRO 90S VHS', img: 'assets/ruiner.jpg', price: 450, model: 'kling-video', resolution: '2K', prompt: 'Vintage 90s VHS tape glitch effect, retro synthwave mood, neon glow animation' },
        { id: 8, category: 'ВИДЕО', title: 'CYBER ROBOT', img: 'assets/hero_robot.jpg', price: 490, model: 'kling-video', resolution: '2K', prompt: 'Futuristic cyborg awakening, mechanical parts glowing with blue energy, smooth cinematic camera motion' },
        { id: 9, category: 'ИГРЫ', title: 'ROBLOX HERO', img: 'images/photo1.jpg', price: 290, model: 'nano-banana-2', resolution: '2K', prompt: 'Blocky voxel gaming character style, bright game world colors, playful gaming atmosphere' },
        { id: 10, category: 'ТРЕНДЫ', title: 'ANIME VIBE', img: 'images/photo2.jpg', price: 290, model: 'nano-banana-2', resolution: '2K', prompt: 'Makoto Shinkai anime style, beautiful sky with fluffy clouds, vibrant pastel colors' },
        { id: 99, sectionId: 3, sectionTitle: 'ТРЕНДЫ', category: 'ПРОЖАРКА', title: '🔥 ИИ-ПРОЖАРКА (СТЕНДАП)', img: 'assets/hero_portrait.jpg', price: 190, model: 'roast-standup', resolution: '2K', prompt: 'Standup roast caricature with dynamic vision analysis and ElevenLabs voice' },
        { id: 101, sectionId: 4, sectionTitle: 'ПРИМЕРКА', category: 'ТОЛСТОВКИ', title: 'Толстовка TRENDUM Black Oversize', img: 'assets/hero_avatar.jpg', price: 450, location: 'Рынок Дордой, ряд 5, контейнер 142', model: 'nano-banana-2', resolution: '2K', prompt: 'Black oversize streetwear hoodie with realistic folds and shadows' },
        { id: 102, sectionId: 4, sectionTitle: 'ПРИМЕРКА', category: 'ТОЛСТОВКИ', title: 'Толстовка ALTYN White Classic', img: 'assets/hero_portrait.jpg', price: 450, location: 'Рынок Дордой, проход 3, контейнер 88', model: 'nano-banana-2', resolution: '2K', prompt: 'Stylish premium white cotton hoodie with photorealistic drape' },
        { id: 103, sectionId: 4, sectionTitle: 'ПРИМЕРКА', category: 'ХУДИ', title: 'Худи Streetwear Cyberpunk', img: 'assets/hero_robot.jpg', price: 490, location: 'ТРЦ Bishkek Park, 2 этаж, бутик Trendum', model: 'nano-banana-2', resolution: '2K', prompt: 'Futuristic graphic streetwear hoodie with photorealistic texture' },
        { id: 104, sectionId: 4, sectionTitle: 'ПРИМЕРКА', category: 'ФУТБОЛКИ', title: 'Футболка Trendum Minimalist', img: 'assets/man.jpg', price: 350, location: 'Рынок Дордой, контейнер 205', model: 'nano-banana-2', resolution: '2K', prompt: 'Minimalist black cotton graphic t-shirt' }
    ];
}

let activeSectionCard = mainCardsConfig.length > 0 ? mainCardsConfig[0] : null;

function normalizeTemplates(tplList, cardsList) {
    if (!Array.isArray(tplList)) return [];
    const cards = cardsList || mainCardsConfig;

    // Полностью удаляем любые шаблоны пригласительных
    const cleanList = tplList.filter(t => {
        const m = (t.model || '').toLowerCase();
        const c = (t.category || '').toUpperCase();
        const title = (t.title || '').toUpperCase();
        const st = (t.sectionTitle || '').toUpperCase();
        if (m === 'invite-web') return false;
        if (st.includes('ПРИГЛАС')) return false;
        if (c.includes('ПРИГЛАС') || c === 'СВАДЬБА' || c === 'КЫЗ УЗАТУУ' || c === 'ЮБИЛЕЙ' || c === 'СУННОТ ТОЙ') return false;
        if (title.includes('WEDDING') || title.includes('КЫЗ УЗАТУУ') || title.includes('JUBILEE LUXURY')) return false;
        return true;
    });

    const normalized = cleanList.map(t => {
        let sid = Number(t.sectionId);
        let stitle = t.sectionTitle;
        let cat = t.category || 'ОБЩЕЕ';

        const catUp = (cat || '').toUpperCase();
        const modelUp = (t.model || '').toLowerCase();
        const titleUp = (t.title || '').toUpperCase();
        const stUp = (stitle || '').toUpperCase();

        if (sid === 5 || stUp.includes('ПРИМЕР') || catUp.includes('ПРИМЕР') || catUp.includes('ТОЛСТОВ') || catUp.includes('ХУДИ') || catUp.includes('ФУТБОЛ') || catUp.includes('КУРТК') || catUp.includes('МЕРЧ') || titleUp.includes('ТОЛСТОВ') || titleUp.includes('ХУДИ') || Boolean(t.location)) {
            sid = 4;
            stitle = 'ПРИМЕРКА';
        } else if (!sid) {
            if (catUp === 'ВИДЕО' || modelUp.includes('seedance') || modelUp.includes('omni') || modelUp.includes('kling') || modelUp.includes('video')) {
                sid = 2;
                stitle = 'ВИДЕО';
                if (catUp === 'ВИДЕО') cat = 'НЕОН';
            } else if (catUp === 'ТРЕНДЫ' || catUp.includes('ПРОЖАР') || modelUp.includes('roast') || titleUp.includes('TREND') || titleUp.includes('ПРОЖАР')) {
                sid = 3;
                stitle = 'ТРЕНДЫ';
                if (!cat || cat === 'ОБЩЕЕ' || catUp === 'ТРЕНДЫ') cat = modelUp.includes('roast') ? 'ПРОЖАРКА' : 'TIKTOK';
            } else {
                sid = 1;
                stitle = 'ФОТО';
            }
        }

        const matchedCard = cards.find(c => c.id === Number(sid));
        if (matchedCard) {
            stitle = matchedCard.title;
        }

        let modelNorm = (t.model || '').trim();
        if (sid === 4 || stUp.includes('ПРИМЕР') || catUp.includes('ПРИМЕР') || Boolean(t.location)) {
            modelNorm = 'nano-banana-2';
        } else if (modelNorm !== 'seedance-2.5' && modelNorm !== 'omni-flash' && modelNorm !== 'kling-video' && modelNorm !== 'roast-standup' && modelNorm !== 'chatgpt-2.5') {
            modelNorm = 'nano-banana-2';
        }

        let resNorm = (t.resolution || '2K').toUpperCase();
        if (!['1K', '2K', '4K'].includes(resNorm)) resNorm = '2K';

        return {
            ...t,
            id: Number(t.id) || Date.now(),
            sectionId: Number(sid),
            sectionTitle: stitle || 'ФОТО',
            category: cat,
            model: modelNorm,
            resolution: resNorm,
            location: t.location || '',
            htmlCode: t.htmlCode || ''
        };
    });

    if (!normalized.some(t => t.sectionId === 4 || (t.sectionTitle && t.sectionTitle.includes('ПРИМЕР')))) {
        normalized.push({
            id: 101,
            sectionId: 4,
            sectionTitle: 'ПРИМЕРКА',
            category: 'ТОЛСТОВКИ',
            title: 'Толстовка TRENDUM Black Oversize',
            img: 'assets/hero_avatar.jpg',
            price: 450,
            location: 'Рынок Дордой, ряд 5, контейнер 142',
            model: 'nano-banana-2',
            resolution: '2K',
            prompt: 'Virtual clothing try-on: Dress the person in this black oversize streetwear hoodie. Keep the person face, facial features, hair, identity, expression and background from the input photo completely intact. Realistic garment folds and shadows.',
            htmlCode: ''
        });
        normalized.push({
            id: 102,
            sectionId: 4,
            sectionTitle: 'ПРИМЕРКА',
            category: 'ТОЛСТОВКИ',
            title: 'Толстовка ALTYN White Classic',
            img: 'assets/hero_portrait.jpg',
            price: 450,
            location: 'Рынок Дордой, проход 3, контейнер 88',
            model: 'nano-banana-2',
            resolution: '2K',
            prompt: 'Virtual try-on: Dress the person in this stylish premium white cotton hoodie. Keep original face, hair, and pose with photorealistic garment drape and natural lighting.',
            htmlCode: ''
        });
        normalized.push({
            id: 103,
            sectionId: 4,
            sectionTitle: 'ПРИМЕРКА',
            category: 'ХУДИ',
            title: 'Худи Streetwear Cyberpunk',
            img: 'assets/hero_robot.jpg',
            price: 490,
            location: 'ТРЦ Bishkek Park, 2 этаж, бутик Trendum',
            model: 'nano-banana-2',
            resolution: '2K',
            prompt: 'Virtual try-on: Fit the futuristic graphic hoodie on the person in the photo. Photorealistic texture, preserve facial likeness.',
            htmlCode: ''
        });
        normalized.push({
            id: 104,
            sectionId: 4,
            sectionTitle: 'ПРИМЕРКА',
            category: 'ФУТБОЛКИ',
            title: 'Футболка Trendum Minimalist',
            img: 'assets/man.jpg',
            price: 350,
            location: 'Рынок Дордой, контейнер 205',
            model: 'nano-banana-2',
            resolution: '2K',
            prompt: 'Virtual try-on: Dress the person in the minimalist black cotton graphic t-shirt. Preserve exact facial likeness and natural body fit.',
            htmlCode: ''
        });
    }

    return normalized;
}

masterTemplates = normalizeTemplates(masterTemplates, mainCardsConfig);

if (!masterTemplates.some(t => (t.model || '').toLowerCase() === 'roast-standup')) {
    masterTemplates.push({
        id: 99,
        sectionId: 3,
        sectionTitle: 'ТРЕНДЫ',
        category: 'ПРОЖАРКА',
        title: '🔥 ИИ-ПРОЖАРКА (СТЕНДАП)',
        img: 'assets/hero_portrait.jpg',
        price: 190,
        model: 'roast-standup',
        resolution: '2K',
        prompt: 'Standup roast caricature with dynamic vision analysis and ElevenLabs voice'
    });
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
    return false;
}

function isTryOnTemplate(tpl) {
    if (!tpl) return false;
    const m = (tpl.model || '').toLowerCase();
    const c = (tpl.category || '').toUpperCase();
    const t = (tpl.title || '').toUpperCase();
    const st = (tpl.sectionTitle || '').toUpperCase();
    return tpl.sectionId === 4 || 
           tpl.sectionId === 5 ||
           st.includes('ПРИМЕР') || 
           st.includes('ОДЕЖД') ||
           c.includes('ТОЛСТОВ') || 
           c.includes('ХУДИ') || 
           c.includes('ФУТБОЛ') || 
           c.includes('КУРТК') || 
           c.includes('МЕРЧ') ||
           t.includes('ТОЛСТОВ') ||
           t.includes('ХУДИ') ||
           Boolean(tpl.location);
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

    if (!masterTemplates.some(t => (t.model || '').toLowerCase() === 'roast-standup')) {
        masterTemplates.push({
            id: 99,
            sectionId: 3,
            sectionTitle: 'ТРЕНДЫ',
            category: 'ПРОЖАРКА',
            title: '🔥 ИИ-ПРОЖАРКА (СТЕНДАП)',
            img: 'assets/hero_portrait.jpg',
            price: 190,
            model: 'roast-standup',
            prompt: 'Standup roast caricature with dynamic vision analysis and ElevenLabs voice'
        });
    }

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
        if (targetSecId === 4 || targetSecId === 5 || targetTitle.includes('ПРИМЕР') || targetTitle.includes('ОДЕЖД')) return isTryOnTemplate(t);
        return !isVideoTemplate(t) && !isTrendsTemplate(t) && !isTryOnTemplate(t);
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
            selectedStyleLocation = item.location || '';
            selectedStyleResolution = item.resolution || '2K';
            setAiResolution(selectedStyleResolution);
            isTryOnMode = isTryOnTemplate(item);
            selectedStyleModel = item.model || 'chatgpt-2.5';
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
    const stepRoastResult = document.getElementById('step-roast-result');

    // Roast Elements
    const roastCaricatureImg = document.getElementById('roast-caricature-img');
    const roastPunchTitle = document.getElementById('roast-punch-title');
    const roastSpeechBody = document.getElementById('roast-speech-body');
    const roastAudioEl = document.getElementById('roast-audio-el');
    const roastAudioTrigger = document.getElementById('roast-audio-trigger');
    const roastAudioIcon = document.getElementById('roast-audio-icon');
    const roastCharismaVal = document.getElementById('roast-charisma-val');
    const roastCharismaBar = document.getElementById('roast-charisma-bar');
    const roastFlawVal = document.getElementById('roast-flaw-val');
    const roastMallVal = document.getElementById('roast-mall-val');
    const roastQrImg = document.getElementById('roast-qr-img');
    const roastReplayBtn = document.getElementById('roast-replay-btn');
    const roastFinishBtn = document.getElementById('roast-finish-btn');

    // Camera & Confirm Elements
    const webcamEl = document.getElementById('webcam');
    const canvasEl = document.getElementById('photo-canvas');
    const snapBtn = document.getElementById('snap-btn');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const photoPreviewConfirm = document.getElementById('photo-preview-confirm');
    const retakeBtn = document.getElementById('retake-btn');
    const confirmPhotoBtn = document.getElementById('confirm-photo-btn');

    // ВЫБОР РАЗРЕШЕНИЯ CHATGPT (1K, 2K HD, 4K ULTRA)
    document.querySelectorAll('.ai-res-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const res = btn.dataset.res || '2K';
            setAiResolution(res);
        });
    });

    setAiResolution(currentAiResolution);

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

    // Try-On Location Info Card Elements & Voice Audio
    const tryonLocationInfoCard = document.getElementById('tryon-location-info-card');
    const tryonLocPriceVal = document.getElementById('tryon-loc-price-val');
    const tryonLocTitleVal = document.getElementById('tryon-loc-title-val');
    const tryonLocPlaceVal = document.getElementById('tryon-loc-place-val');
    const tryonVoiceReplayBtn = document.getElementById('tryon-voice-replay-btn');
    const tryonVoiceAnimIcon = document.getElementById('tryon-voice-anim-icon');
    const tryonVoiceBtnText = document.getElementById('tryon-voice-btn-text');
    const tryonAudioElement = document.getElementById('tryon-audio-element');
    let currentTryOnAudioUrl = null;
    let currentTryOnVoiceText = '';

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

    // МГНОВЕННАЯ И 100% НАДЕЖНАЯ ГЕНЕРАЦИЯ QR-КОДОВ (Векторный SVG + Canvas)
    function renderInstantQR(element, text, size = 260) {
        if (!element || !text) return;

        function buildSvgString(qrModel, sz) {
            const count = qrModel.getModuleCount();
            let path = '';
            for (let r = 0; r < count; r++) {
                for (let c = 0; c < count; c++) {
                    if (qrModel.isDark(r, c)) {
                        path += `M${c},${r}h1v1h-1z`;
                    }
                }
            }
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count} ${count}" width="${sz}" height="${sz}" shape-rendering="crispEdges" style="width:100%;height:100%;display:block;border-radius:12px;"><path fill="#ffffff" d="M0,0h${count}v${count}h-${count}z"/><path fill="#000000" d="${path}"/></svg>`;
        }

        try {
            if (typeof QRCode !== 'undefined') {
                const dummyDiv = document.createElement('div');
                const qrInstance = new QRCode(dummyDiv, {
                    text: text,
                    width: size,
                    height: size,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });

                // 1. Приоритет: генерация чистого векторного SVG прямо в DOM контейнера
                // Полностью исключает сетевые запросы, Canvas toDataURL и битые картинки
                if (qrInstance && qrInstance._oQRCode) {
                    const svgString = buildSvgString(qrInstance._oQRCode, size);

                    const targetContainer = (element.tagName === 'IMG' && element.parentElement) 
                        ? element.parentElement 
                        : element;

                    let svgHolder = targetContainer.querySelector('.qr-svg-holder');
                    if (!svgHolder) {
                        svgHolder = document.createElement('div');
                        svgHolder.className = 'qr-svg-holder';
                        svgHolder.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
                        targetContainer.appendChild(svgHolder);
                    }
                    svgHolder.innerHTML = svgString;

                    if (element.tagName === 'IMG') {
                        element.style.display = 'none';
                        try {
                            element.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
                        } catch(e) {}
                    }
                    return;
                }

                // 2. Резерв: использование растрового Canvas из QRCode.js
                const canvas = dummyDiv.querySelector('canvas');
                if (canvas) {
                    const pngDataUri = canvas.toDataURL('image/png');
                    if (pngDataUri && pngDataUri.length > 50) {
                        if (element.tagName === 'IMG') {
                            element.src = pngDataUri;
                            element.style.display = 'block';
                        } else {
                            element.innerHTML = '';
                            element.appendChild(canvas);
                        }
                        return;
                    }
                }
            }
        } catch (qrErr) {
            console.warn('Локальный QR рендер выдал исключение:', qrErr);
        }

        // Если библиотека не сработала, прячем img, чтобы не показывать значок битой картинки
        if (element.tagName === 'IMG') {
            element.style.display = 'none';
        }
    }


    // ШАГ 1: ОТКРЫТИЕ ПОТОКА — ЭКРАН ОПЛАТЫ
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
        // Удаляем файл телефонной сессии из Supabase при выходе
        if (phoneCamSessionId) {
            fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/phone-cam/${phoneCamSessionId}.jpg`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            }).catch(() => {});
        }
        phoneCamMode = false;
        phoneCamSessionId = null;
        if (photoPreviewConfirm) photoPreviewConfirm.src = '';
        if (resultVideo) {
            try {
                resultVideo.pause();
                resultVideo.src = '';
            } catch(e) {}
        }
        if (roastAudioEl) {
            try {
                roastAudioEl.pause();
                roastAudioEl.src = '';
            } catch(e) {}
        }
        if (tryonAudioElement) {
            try {
                tryonAudioElement.pause();
                tryonAudioElement.currentTime = 0;
                tryonAudioElement.src = '';
            } catch(e) {}
        }
        if ('speechSynthesis' in window) {
            try { window.speechSynthesis.cancel(); } catch(e) {}
        }
        if (tryonVoiceReplayBtn) tryonVoiceReplayBtn.classList.remove('speaking');
        if (tryonVoiceBtnText) tryonVoiceBtnText.textContent = 'Послушать где купить';
        if (tryonLocationInfoCard) tryonLocationInfoCard.style.display = 'none';
        modal.style.display = 'none';
        resetState();
    }

    function showStep(stepEl) {
        [stepCamera, stepConfirm, stepPayment, stepProcessing, stepResult, stepRoastResult].forEach(s => {
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

        // Мгновенный QR код для смартфона
        if (phoneQrImg) {
            renderInstantQR(phoneQrImg, phoneUrl, 200);
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
        if (camSubtitle) {
            if (isTryOnMode) {
                camSubtitle.textContent = 'Встаньте по центру в полный рост или по пояс, чтобы примерить вещь';
            } else {
                camSubtitle.textContent = 'Встаньте по центру и смотрите в камеру';
            }
        }
    }



    // ИНИЦИАЛИЗАЦИЯ ЗАКАЗА И QR-КОДА OBUSINESS ELQR
    async function initiatePaymentOrder() {
        if (payStyleTitle) payStyleTitle.textContent = selectedStyle;
        if (paySelectedThumb) paySelectedThumb.src = selectedStylePhoto;
        if (payAmountVal) payAmountVal.textContent = selectedStylePrice || 290;
        
        const paySubtext = document.querySelector('.pay-subtext');
        if (paySubtext) {
            const resLabel = currentAiResolution + (currentAiResolution === '2K' ? ' HD' : currentAiResolution === '4K' ? ' Ultra' : '');
            if (isTryOnMode) {
                paySubtext.innerHTML = `Виртуальная примерка в качестве <span id="pay-res-indicator" style="color: #d4a043; font-weight: 800;">${resLabel}</span> (ChatGPT)`;
            } else {
                paySubtext.innerHTML = `Финальное фото в качестве <span id="pay-res-indicator" style="color: #d4a043; font-weight: 800;">${resLabel}</span> (ChatGPT)`;
            }
        }

        // БРЕНДИРОВАННЫЙ ОФИЦИАЛЬНЫЙ FINIK ELQR (0мс):
        const amount = selectedStylePrice || 290;
        currentOrderId = 'TRD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        const DEFAULT_STATIC_QR = 'https://qr.finik.kg/#00020101021132750011qr.finik.kg0114averspay-items1032cd47050e1ea84bc886fdacd1b1f0e7461302125204799953034175908Finik-QR63040896';
        const configuredStaticQr = localStorage.getItem('kiosk_finik_static_qr') || DEFAULT_STATIC_QR;
        const configuredAccountId = localStorage.getItem('kiosk_finik_account_id') || 'cd47050e-1ea8-4bc8-86fd-acd1b1f0e746';
        const configuredQrImg = localStorage.getItem('kiosk_finik_qr_img') || 'images/finik_elqr_badge.png';

        if (elqrImg) {
            elqrImg.style.transition = 'opacity 0.25s ease, filter 0.25s ease';
            elqrImg.style.opacity = '0.35';
            elqrImg.style.filter = 'blur(2px)';
        }
        if (paymentStatusText) paymentStatusText.textContent = `Формирование счёта на ${amount} сом...`;

        // Сразу запускаем опрос статуса платежа
        startPaymentPolling(currentOrderId);

        // В фоне регистрируем заказ в платежной системе
        try {
            const resp = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: currentOrderId,
                    amount: amount,
                    templateTitle: selectedStyle,
                    accountId: configuredAccountId,
                    staticQr: configuredStaticQr
                })
            });
            const data = await resp.json();

            // Когда Finik вернул официальный динамический QR с зафиксированной суммой чека
            if (data.success && data.qrImageUrl) {
                if (elqrImg) {
                    elqrImg.src = data.qrImageUrl;
                    elqrImg.style.opacity = '1';
                    elqrImg.style.filter = 'none';
                }
                if (paymentStatusText) paymentStatusText.textContent = `Ожидание оплаты ${amount} сом...`;
            } else if (data.success && data.paymentUrl && !data.paymentUrl.includes('qr.finik.kg')) {
                if (elqrImg) {
                    renderInstantQR(elqrImg, data.paymentUrl, 260);
                    elqrImg.style.opacity = '1';
                    elqrImg.style.filter = 'none';
                }
                if (paymentStatusText) paymentStatusText.textContent = `Ожидание оплаты ${amount} сом...`;
            } else {
                if (elqrImg) {
                    elqrImg.src = configuredQrImg;
                    elqrImg.style.opacity = '1';
                    elqrImg.style.filter = 'none';
                }
                if (paymentStatusText) paymentStatusText.textContent = 'Ожидание оплаты...';
            }
        } catch (e) {
            console.warn('API error (автономный режим Finik ELQR активен):', e);
            if (elqrImg) {
                elqrImg.src = configuredQrImg;
                elqrImg.style.opacity = '1';
                elqrImg.style.filter = 'none';
            }
            if (paymentStatusText) paymentStatusText.textContent = 'Ожидание оплаты...';
        }
    }

    // ПОЛЛИНГ СТАТУСА ПЛАТЕЖА (ПРОВЕРКА ВЕБХУКА КАЖДЫЕ 1.8 СЕКУНДЫ)
    function startPaymentPolling(orderId) {
        stopPaymentPolling();
        paymentPollTimer = setInterval(async () => {
            try {
                const res = await fetch(`/api/payment/status?orderId=${encodeURIComponent(orderId)}&_t=${Date.now()}`);
                const info = await res.json();
                if (info.success && info.status === 'PAID') {
                    stopPaymentPolling();
                    handlePaymentSuccess();
                }
            } catch (err) {
                // Ignore network hiccups during polling
            }
        }, 1800);
    }

    function stopPaymentPolling() {
        if (paymentPollTimer) {
            clearInterval(paymentPollTimer);
            paymentPollTimer = null;
        }
    }

    // ОПЛАТА УСПЕШНО ПОЛУЧЕНА
    function handlePaymentSuccess() {
        if (paymentStatusText) {
            paymentStatusText.textContent = '✅ Оплата получена! Включаем камеру...';
        }
        setTimeout(() => {
            resetCameraStep();
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

    // 2. WEBCAM LOGIC (АДАПТИВНЫЙ FULL HD 1080p / 720p 30 FPS БЕЗ ЛАГОВ)
    let availableVideoDevices = [];
    let currentDeviceIndex = 0;
    let fpsCallbackId = null;
    let fpsFrameCount = 0;
    let fpsLastTime = performance.now();
    let lowFpsStreak = 0;
    let currentCamResolution = localStorage.getItem('kiosk_camera_res') || '1080p';
    let currentCameraFps = 30;
    let lastSingleFrameTime = performance.now();
    let recentFrameDeltas = [];

    const switchCamBtn = document.getElementById('switch-cam-btn');
    const switchCamLabel = document.getElementById('switch-cam-label');
    const camInfoBadge = document.getElementById('cam-info-badge');
    const camDeviceSelect = document.getElementById('cam-device-select');
    const btnRes1080 = document.getElementById('btn-res-1080');
    const btnRes720 = document.getElementById('btn-res-720');
    const camFpsWarning = document.getElementById('cam-fps-warning');
    const warnFpsVal = document.getElementById('warn-fps-val');
    const openDiagBtn = document.getElementById('open-diag-btn');

    // ЭЛЕМЕНТЫ МОДАЛЬНОГО ОКНА ДИАГНОСТИКИ
    const diagModal = document.getElementById('diag-modal');
    const closeDiagBtn = document.getElementById('close-diag-btn');
    const sendDiagBtn = document.getElementById('send-diag-btn');
    const copyDiagBtn = document.getElementById('copy-diag-btn');
    const diagSendStatus = document.getElementById('diag-send-status');
    const diagCamFps = document.getElementById('diag-cam-fps');
    const diagCamStatus = document.getElementById('diag-cam-status');
    const diagFrameDelta = document.getElementById('diag-frame-delta');
    const diagFrameDetail = document.getElementById('diag-frame-detail');
    const diagUiFps = document.getElementById('diag-ui-fps');
    const diagCamRes = document.getElementById('diag-cam-res');
    const diagResTarget = document.getElementById('diag-res-target');
    const diagVerdictText = document.getElementById('diag-verdict-text');
    const diagCamName = document.getElementById('diag-cam-name');
    const diagGpuInfo = document.getElementById('diag-gpu-info');
    const diagCpuRam = document.getElementById('diag-cpu-ram');
    const diagTrackSettings = document.getElementById('diag-track-settings');
    const diagRecentDeltas = document.getElementById('diag-recent-deltas');

    function updateResButtonsUI() {
        if (btnRes1080 && btnRes720) {
            if (currentCamResolution === '720p') {
                btnRes720.style.background = 'var(--primary)';
                btnRes720.style.color = '#000';
                btnRes1080.style.background = 'transparent';
                btnRes1080.style.color = '#aaa';
            } else {
                btnRes1080.style.background = 'var(--primary)';
                btnRes1080.style.color = '#000';
                btnRes720.style.background = 'transparent';
                btnRes720.style.color = '#aaa';
            }
        }
    }

    function setCamResolution(res) {
        currentCamResolution = res;
        localStorage.setItem('kiosk_camera_res', res);
        updateResButtonsUI();
        if (camFpsWarning) camFpsWarning.style.display = 'none';
        lowFpsStreak = 0;
        startWebcam();
    }

    if (btnRes1080) btnRes1080.addEventListener('click', () => setCamResolution('1080p'));
    if (btnRes720) btnRes720.addEventListener('click', () => setCamResolution('720p'));

    if (camDeviceSelect) {
        camDeviceSelect.addEventListener('change', (e) => {
            const newId = e.target.value;
            if (newId) {
                localStorage.setItem('kiosk_user_selected_cam_id', newId);
                localStorage.setItem('kiosk_camera_device_id', newId);
                startWebcam();
            }
        });
    }

    let uiFrameCount = 0;
    let uiLastTime = performance.now();
    let currentUiFps = 60;

    function trackUiFps() {
        const onUiFrame = (now) => {
            uiFrameCount++;
            const elapsed = now - uiLastTime;
            if (elapsed >= 1000) {
                currentUiFps = Math.round((uiFrameCount * 1000) / elapsed);
                uiFrameCount = 0;
                uiLastTime = now;
            }
            requestAnimationFrame(onUiFrame);
        };
        requestAnimationFrame(onUiFrame);
    }
    trackUiFps();

    function getWebGLInfo() {
        try {
            const c = document.createElement('canvas');
            const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
            if (!gl) return { vendor: 'N/A', renderer: 'WebGL недоступен' };
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (ext) {
                return {
                    vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || 'Unknown',
                    renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'Unknown'
                };
            }
            return {
                vendor: gl.getParameter(gl.VENDOR) || 'Unknown',
                renderer: gl.getParameter(gl.RENDERER) || 'Unknown'
            };
        } catch(e) {
            return { vendor: 'Error', renderer: e.message };
        }
    }

    function gatherDiagnosticData() {
        const track = mediaStream ? mediaStream.getVideoTracks()[0] : null;
        const settings = (track && track.getSettings) ? track.getSettings() : {};
        const capabilities = (track && track.getCapabilities) ? track.getCapabilities() : {};
        const gpu = getWebGLInfo();

        let avgDelta = 0;
        let minDelta = 0;
        let maxDelta = 0;
        if (recentFrameDeltas.length > 0) {
            avgDelta = Math.round(recentFrameDeltas.reduce((a, b) => a + b, 0) / recentFrameDeltas.length);
            minDelta = Math.min(...recentFrameDeltas);
            maxDelta = Math.max(...recentFrameDeltas);
        }

        const w = webcamEl ? webcamEl.videoWidth : 0;
        const h = webcamEl ? webcamEl.videoHeight : 0;

        let verdict = '';
        const isBasicGpu = gpu.renderer.includes('Basic Render') || gpu.renderer.includes('SwiftShader') || gpu.renderer.includes('Software');

        if (isBasicGpu || currentUiFps <= 12) {
            verdict = `🚨 КРИТИЧЕСКАЯ ПРИЧИНА ТОРМОЗОВ — ОТКЛЮЧЕН GPU (${currentUiFps} FPS ЭКРАНА):\n` +
                      `Видеочип: "${gpu.renderer}". Браузер рендерит интерфейс и Full HD видео чисто процессором через софтверную эмуляцию, из-за чего процессор перегружен на 100% и выдает 2 FPS!\n` +
                      `КАК ИСПРАВИТЬ:\n` +
                      `1. Откройте в Chrome chrome://settings/system и ВКЛЮЧИТЕ пункт "Использовать аппаратное ускорение (при наличии)", затем нажмите Перезапустить.\n` +
                      `2. Откройте chrome://flags/#ignore-gpu-blocklist, переключите в "Enabled" и нажмите Relaunch.\n` +
                      `3. Если в chrome://gpu всё еще Basic Render Driver — в Windows не установлен видеодрайвер (Диспетчер устройств -> Видеоадаптеры -> нужен Intel HD Graphics, а не Microsoft Basic Display).`;
        } else if (currentCameraFps <= 7 && avgDelta >= 170) {
            verdict = `⚠️ СЕНСОР КАМЕРЫ НА ДЛИННОЙ ВЫДЕРЖКЕ (~${avgDelta} мс на кадр):\n` +
                      `1. Сенсор UVC-камеры при недостатке света автоматически растянул затвор до ~1/4 сек (250 мс), из-за чего физически не может выдать более ${currentCameraFps} FPS.\n` +
                      `👉 ТЕСТ СВЕТА: Включите фонарик смартфона и посветите прямо в глазок камеры на 3 секунды. Если FPS сразу подскочит до 25-30 — добавьте свет на киоск!\n` +
                      `2. Если света достаточно: в Windows Chrome драйвер MediaFoundation часто багует на портах USB 2.0. Перейдите по ссылке chrome://flags/#enable-media-foundation-video-capture, выберите Disabled и нажмите Relaunch.`;
        } else if (currentUiFps < 25) {
            verdict = `⚠️ НИЗКИЙ FPS ИНТЕРФЕЙСА (${currentUiFps} FPS):\n` +
                      `Сам браузер медленно отрисовывает кадры. GPU: ${gpu.renderer}.\n` +
                      `Включите в настройках Chrome: Система -> 'Использовать аппаратное ускорение'.`;
        } else if (currentCameraFps >= 24) {
            verdict = `✅ ОТЛИЧНО: Поток плавный (${currentCameraFps} FPS), задержка кадра ~${avgDelta} мс, отрисовка интерфейса ${currentUiFps} FPS.`;
        } else {
            verdict = `ℹ️ УМЕРЕННАЯ ЧАСТОТА: ${currentCameraFps} FPS (интервал ~${avgDelta} мс). Рекомендуется включить режим 720p и проверить направленное освещение.`;
        }

        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            camera: {
                fps: currentCameraFps,
                label: track ? track.label : 'Не подключена',
                width: w,
                height: h,
                resolutionMode: currentCamResolution,
                avgDeltaMs: avgDelta,
                minDeltaMs: minDelta,
                maxDeltaMs: maxDelta,
                recentDeltas: recentFrameDeltas.slice(-10),
                settings: settings,
                capabilities: capabilities
            },
            ui: {
                fps: currentUiFps,
                windowSize: `${window.innerWidth}x${window.innerHeight}`,
                screenSize: `${screen.width}x${screen.height}`,
                dpr: window.devicePixelRatio
            },
            system: {
                userAgent: navigator.userAgent,
                cpuCores: navigator.hardwareConcurrency || 'N/A',
                deviceMemoryGb: navigator.deviceMemory || 'N/A',
                gpu: gpu
            },
            devices: availableVideoDevices.map(d => ({ label: d.label, id: d.deviceId })),
            verdict: verdict
        };
    }

    let diagUpdateTimer = null;
    function renderDiagnostics() {
        const data = gatherDiagnosticData();

        if (diagCamFps) {
            diagCamFps.textContent = `${data.camera.fps} FPS`;
            diagCamFps.style.color = data.camera.fps >= 24 ? '#4ade80' : (data.camera.fps >= 15 ? '#f59e0b' : '#ef4444');
        }
        if (diagCamStatus) {
            diagCamStatus.textContent = data.camera.fps <= 7 ? '⚠️ КРИТИЧЕСКИЙ ЛАГ' : (data.camera.fps >= 24 ? 'Нормальный поток' : 'Сниженная частота');
        }
        if (diagFrameDelta) {
            diagFrameDelta.textContent = data.camera.avgDeltaMs > 0 ? `${data.camera.avgDeltaMs} мс` : '-- мс';
            diagFrameDelta.style.color = data.camera.avgDeltaMs <= 40 ? '#4ade80' : (data.camera.avgDeltaMs <= 70 ? '#f59e0b' : '#ef4444');
        }
        if (diagFrameDetail) {
            diagFrameDetail.textContent = data.camera.avgDeltaMs >= 170 ? 'Затвор ~1/4 сек (свет/драйвер)' : 'Интервал кадра';
        }
        if (diagUiFps) {
            diagUiFps.textContent = `${data.ui.fps} FPS`;
            diagUiFps.style.color = data.ui.fps >= 40 ? '#4ade80' : '#ef4444';
        }
        if (diagCamRes) {
            diagCamRes.textContent = `${data.camera.width} × ${data.camera.height}`;
        }
        if (diagResTarget) {
            diagResTarget.textContent = `Целевой режим: ${data.camera.resolutionMode}`;
        }
        if (diagVerdictText) {
            diagVerdictText.innerHTML = data.verdict.replace(/\n/g, '<br>');
        }
        if (diagCamName) {
            diagCamName.textContent = data.camera.label;
        }
        if (diagGpuInfo) {
            diagGpuInfo.textContent = `${data.system.gpu.renderer} (${data.system.gpu.vendor})`;
        }
        if (diagCpuRam) {
            diagCpuRam.textContent = `${data.system.cpuCores} ядер CPU • ${data.system.deviceMemoryGb} GB RAM`;
        }
        if (diagTrackSettings) {
            const s = data.camera.settings;
            diagTrackSettings.textContent = `w:${s.width || '--'}, h:${s.height || '--'}, fps:${s.frameRate || '--'}, facing:${s.facingMode || 'user'}`;
        }
        if (diagRecentDeltas) {
            diagRecentDeltas.textContent = data.camera.recentDeltas.length > 0 ? `[${data.camera.recentDeltas.join(', ')}]` : 'накопление...';
        }

        return data;
    }

    function openDiagModal() {
        if (!diagModal) return;
        diagModal.style.display = 'flex';
        renderDiagnostics();
        if (diagUpdateTimer) clearInterval(diagUpdateTimer);
        diagUpdateTimer = setInterval(renderDiagnostics, 700);
    }

    function closeDiagModal() {
        if (!diagModal) return;
        diagModal.style.display = 'none';
        if (diagUpdateTimer) {
            clearInterval(diagUpdateTimer);
            diagUpdateTimer = null;
        }
    }

    async function sendDiagnosticsToServer() {
        const data = renderDiagnostics();
        if (sendDiagBtn) {
            sendDiagBtn.disabled = true;
            sendDiagBtn.textContent = '⏳ ОТПРАВКА...';
        }
        if (diagSendStatus) {
            diagSendStatus.style.display = 'block';
            diagSendStatus.style.color = '#38bdf8';
            diagSendStatus.textContent = 'Отправка отчета на сервер...';
        }

        try {
            let sent = false;
            try {
                const res = await fetch('/api/diag', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) sent = true;
            } catch(e) {
                console.warn('POST /api/diag err:', e);
            }

            if (!sent) {
                const SUPA_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
                const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
                const sRes = await fetch(`${SUPA_URL}/storage/v1/object/kiosk-media/diag/kiosk_report.json`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPA_KEY,
                        'Authorization': `Bearer ${SUPA_KEY}`,
                        'Content-Type': 'application/json',
                        'x-upsert': 'true'
                    },
                    body: JSON.stringify(data, null, 2)
                });
                if (sRes.ok) sent = true;
            }

            if (sent) {
                if (diagSendStatus) {
                    diagSendStatus.style.color = '#4ade80';
                    diagSendStatus.textContent = '✅ ЛОГ УСПЕШНО ОТПРАВЛЕН! Разработчик видит данные на сервере.';
                }
                if (sendDiagBtn) {
                    sendDiagBtn.textContent = '✅ ОТПРАВЛЕНО (ОБНОВИТЬ)';
                    sendDiagBtn.disabled = false;
                }
            } else {
                throw new Error('Сервер не ответил 200 OK');
            }
        } catch(err) {
            if (diagSendStatus) {
                diagSendStatus.style.color = '#ef4444';
                diagSendStatus.textContent = '❌ Ошибка отправки: ' + err.message + '. Скопируйте текст кнопкой ниже.';
            }
            if (sendDiagBtn) {
                sendDiagBtn.textContent = '🚀 ПОВТОРИТЬ ОТПРАВКУ';
                sendDiagBtn.disabled = false;
            }
        }
    }

    function copyDiagnosticsToClipboard() {
        const data = gatherDiagnosticData();
        const text = `=== ДИАГНОСТИКА КИОСКА (${new Date().toLocaleString('ru')}) ===\n` +
            `Камера: ${data.camera.label}\n` +
            `FPS Камеры: ${data.camera.fps} FPS\n` +
            `Интервал кадра: ~${data.camera.avgDeltaMs} мс (мин: ${data.camera.minDeltaMs}, макс: ${data.camera.maxDeltaMs})\n` +
            `Разрешение: ${data.camera.width}x${data.camera.height} (${data.camera.resolutionMode})\n` +
            `FPS Экрана: ${data.ui.fps} FPS\n` +
            `GPU: ${data.system.gpu.renderer} (${data.system.gpu.vendor})\n` +
            `CPU/RAM: ${data.system.cpuCores} cores, ${data.system.deviceMemoryGb} GB\n` +
            `Дельты 10 кадров: [${data.camera.recentDeltas.join(', ')}]\n` +
            `UserAgent: ${data.system.userAgent}\n` +
            `ВЕРДИКТ:\n${data.verdict}\n` +
            `==================================`;

        navigator.clipboard.writeText(text).then(() => {
            if (copyDiagBtn) {
                const orig = copyDiagBtn.textContent;
                copyDiagBtn.textContent = '✅ СКОПИРОВАНО В БУФЕР!';
                setTimeout(() => { copyDiagBtn.textContent = orig; }, 2500);
            }
        }).catch(() => {
            alert(text);
        });
    }

    if (openDiagBtn) openDiagBtn.addEventListener('click', openDiagModal);
    if (closeDiagBtn) closeDiagBtn.addEventListener('click', closeDiagModal);
    if (camFpsWarning) camFpsWarning.addEventListener('click', openDiagModal);
    if (sendDiagBtn) sendDiagBtn.addEventListener('click', sendDiagnosticsToServer);
    if (copyDiagBtn) copyDiagBtn.addEventListener('click', copyDiagnosticsToClipboard);
    if (diagModal) {
        diagModal.addEventListener('click', (e) => {
            if (e.target === diagModal) closeDiagModal();
        });
    }

    function updateCamBadge(track, camFps = 30) {
        if (!camInfoBadge) return;
        const w = webcamEl ? (webcamEl.videoWidth || (currentCamResolution === '720p' ? 1280 : 1920)) : 1920;
        const h = webcamEl ? (webcamEl.videoHeight || (currentCamResolution === '720p' ? 720 : 1080)) : 1080;
        const label = (track && track.label) ? track.label.replace(/\(.*?\)/g, '').trim() : 'Камера';
        const isFHD = (w >= 1920 && h >= 1080) || (w >= 1080 && h >= 1920);
        const resText = isFHD ? 'Full HD' : (w >= 1280 ? '720p HD' : `${w}×${h}`);
        const fpsColor = camFps >= 24 ? '#4ade80' : (camFps >= 15 ? '#f59e0b' : '#ef4444');

        camInfoBadge.innerHTML = `⚡ <b>${w}×${h}</b> ${resText} <span id="cam-fps-val" style="color:${fpsColor};margin-left:4px;font-weight:800;">• ${camFps} FPS</span> <span style="color:#94a3b8;font-size:11px;margin-left:4px;">(Экран: ${currentUiFps})</span> • ${label}`;
    }

    function startFpsCounter() {
        if (!webcamEl || !('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return;
        if (fpsCallbackId && 'cancelVideoFrameCallback' in webcamEl) {
            webcamEl.cancelVideoFrameCallback(fpsCallbackId);
            fpsCallbackId = null;
        }
        fpsFrameCount = 0;
        fpsLastTime = performance.now();
        lastSingleFrameTime = performance.now();
        lowFpsStreak = 0;

        const onFrame = (now) => {
            const singleDelta = Math.round(now - lastSingleFrameTime);
            lastSingleFrameTime = now;
            if (singleDelta > 0 && singleDelta < 3000) {
                recentFrameDeltas.push(singleDelta);
                if (recentFrameDeltas.length > 25) {
                    recentFrameDeltas.shift();
                }
            }

            fpsFrameCount++;
            const elapsed = now - fpsLastTime;
            if (elapsed >= 900) {
                const fps = Math.round((fpsFrameCount * 1000) / elapsed);
                currentCameraFps = fps;
                const track = mediaStream ? mediaStream.getVideoTracks()[0] : null;
                updateCamBadge(track, fps);

                // Детектор узкого горла (когда камера выдает <= 7 FPS)
                if (fps <= 7) {
                    lowFpsStreak++;
                    if (lowFpsStreak >= 2 && camFpsWarning) {
                        if (warnFpsVal) warnFpsVal.textContent = fps;
                        camFpsWarning.style.display = 'block';
                    }
                } else {
                    if (fps >= 15 && camFpsWarning) {
                        camFpsWarning.style.display = 'none';
                    }
                    lowFpsStreak = 0;
                }

                fpsFrameCount = 0;
                fpsLastTime = now;
            }
            if (mediaStream && webcamEl && webcamEl.srcObject) {
                fpsCallbackId = webcamEl.requestVideoFrameCallback(onFrame);
            }
        };

        fpsCallbackId = webcamEl.requestVideoFrameCallback(onFrame);
    }

    async function startWebcam() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Браузер не поддерживает камеру или страница открыта без HTTPS.');
            return;
        }

        try {
            stopWebcam();
            updateResButtonsUI();

            // 1. Предварительно опрашиваем список устройств
            try {
                const devs = await navigator.mediaDevices.enumerateDevices();
                availableVideoDevices = devs.filter(d => d.kind === 'videoinput');
            } catch(e) {
                console.warn('Ошибка опроса устройств:', e);
            }

            // 2. Выбор камеры с приоритетом Logitech BRIO
            const userManualId = localStorage.getItem('kiosk_user_selected_cam_id');
            const brioDev = availableVideoDevices.find(d => 
                d.label && (d.label.toLowerCase().includes('brio') || d.label.toLowerCase().includes('logitech'))
            );

            let chosenDeviceId = null;
            if (userManualId && availableVideoDevices.some(d => d.deviceId === userManualId)) {
                chosenDeviceId = userManualId;
            } else if (brioDev) {
                chosenDeviceId = brioDev.deviceId;
            } else {
                const savedId = localStorage.getItem('kiosk_camera_device_id');
                const isSavedBad = availableVideoDevices.find(d => d.deviceId === savedId && (
                    d.label.toLowerCase().includes('pc camera') || 
                    d.label.toLowerCase().includes('usb2.0')
                ));
                if (savedId && !isSavedBad && availableVideoDevices.some(d => d.deviceId === savedId)) {
                    chosenDeviceId = savedId;
                } else if (availableVideoDevices.length > 0) {
                    chosenDeviceId = availableVideoDevices[0].deviceId;
                }
            }

            // 3. Формируем constraints в зависимости от выбранного разрешения (без жестких min рамок)
            const is720 = currentCamResolution === '720p';
            const targetConstraints = {
                audio: false,
                video: is720 ? {
                    width: { ideal: 1280, max: 1280 },
                    height: { ideal: 720, max: 720 },
                    frameRate: { ideal: 30 }
                } : {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                }
            };

            if (chosenDeviceId) {
                targetConstraints.video.deviceId = { exact: chosenDeviceId };
            }

            let openedStream = null;
            try {
                openedStream = await navigator.mediaDevices.getUserMedia(targetConstraints);
            } catch (errExact) {
                console.warn('Запрос с exact deviceId не удался, пробуем ideal:', errExact);
                try {
                    openedStream = await navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: {
                            deviceId: chosenDeviceId ? { ideal: chosenDeviceId } : undefined,
                            width: is720 ? { ideal: 1280 } : { ideal: 1920 },
                            height: is720 ? { ideal: 720 } : { ideal: 1080 },
                            frameRate: { ideal: 30 }
                        }
                    });
                } catch(errIdeal) {
                    console.warn('Fallback на базовый режим:', errIdeal);
                    openedStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
                }
            }

            mediaStream = openedStream;

            // 4. Обновляем список устройств с полученными названиями
            try {
                const refreshed = await navigator.mediaDevices.enumerateDevices();
                availableVideoDevices = refreshed.filter(d => d.kind === 'videoinput');
            } catch(e) {}

            // Если открылась случайная медленная камера, но есть BRIO:
            const activeTrack = mediaStream.getVideoTracks()[0];
            const activeLabel = (activeTrack && activeTrack.label) ? activeTrack.label.toLowerCase() : '';
            const detectedBrio = availableVideoDevices.find(d => 
                d.label && (d.label.toLowerCase().includes('brio') || d.label.toLowerCase().includes('logitech'))
            );

            if (!userManualId && detectedBrio && !activeLabel.includes('brio') && !activeLabel.includes('logitech')) {
                console.log('⚡ Автоматическое переключение на обнаруженный Logitech BRIO...');
                mediaStream.getTracks().forEach(t => t.stop());
                mediaStream = null;
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: {
                            deviceId: { exact: detectedBrio.deviceId },
                            width: is720 ? { ideal: 1280 } : { ideal: 1920 },
                            height: is720 ? { ideal: 720 } : { ideal: 1080 },
                            frameRate: { ideal: 30 }
                        }
                    });
                    chosenDeviceId = detectedBrio.deviceId;
                    localStorage.setItem('kiosk_camera_device_id', chosenDeviceId);
                } catch(brioErr) {
                    console.warn('Ошибка подключения к BRIO:', brioErr);
                }
            }

            const currentTrack = mediaStream.getVideoTracks()[0];

            // Применяем аппаратные настройки для плавной частоты кадров
            if (currentTrack && currentTrack.applyConstraints) {
                try {
                    await currentTrack.applyConstraints({
                        frameRate: { ideal: 30 }
                    });
                } catch(e) {}
            }

            // Заполняем выпадающий список доступных камер прямо на экране киоска
            if (camDeviceSelect && availableVideoDevices.length > 0) {
                camDeviceSelect.innerHTML = '';
                availableVideoDevices.forEach((dev, idx) => {
                    const opt = document.createElement('option');
                    opt.value = dev.deviceId;
                    const cleanName = (dev.label || `Камера ${idx + 1}`).replace(/\(.*?\)/g, '').trim();
                    opt.textContent = `📷 ${cleanName}`;
                    if (currentTrack && (dev.label === currentTrack.label || dev.deviceId === chosenDeviceId)) {
                        opt.selected = true;
                    }
                    camDeviceSelect.appendChild(opt);
                });
            }

            if (switchCamBtn) {
                switchCamBtn.style.display = (availableVideoDevices.length > 1) ? 'inline-flex' : 'none';
            }

            if (currentTrack) {
                currentDeviceIndex = availableVideoDevices.findIndex(d => 
                    (currentTrack.label && d.label === currentTrack.label) || 
                    (chosenDeviceId && d.deviceId === chosenDeviceId)
                );
                if (currentDeviceIndex === -1) currentDeviceIndex = 0;
            }

            if (switchCamLabel && availableVideoDevices[currentDeviceIndex]) {
                const rawName = availableVideoDevices[currentDeviceIndex].label || 'Камера';
                const cleanName = rawName.replace(/\(.*?\)/g, '').trim();
                const shortName = cleanName.length > 18 ? cleanName.slice(0, 16) + '…' : cleanName;
                switchCamLabel.textContent = `📷 ${shortName}`;
            }

            if (webcamEl) {
                webcamEl.srcObject = mediaStream;
                webcamEl.muted = true;
                await webcamEl.play().catch(e => console.warn('Webcam play error:', e));

                updateCamBadge(currentTrack);
                startFpsCounter();
            }
        } catch (err) {
            console.error('Ошибка доступа к камере:', err);
            alert('Не удалось подключиться к камере. Проверьте подключение кабеля камеры.');
        }
    }

    // Переключение между камерами киоска
    async function switchCamera() {
        if (availableVideoDevices.length <= 1) return;
        currentDeviceIndex = (currentDeviceIndex + 1) % availableVideoDevices.length;
        const nextDev = availableVideoDevices[currentDeviceIndex];
        if (nextDev) {
            localStorage.setItem('kiosk_user_selected_cam_id', nextDev.deviceId);
            localStorage.setItem('kiosk_camera_device_id', nextDev.deviceId);
            if (camDeviceSelect) camDeviceSelect.value = nextDev.deviceId;
            await startWebcam();
        }
    }

    if (switchCamBtn) {
        switchCamBtn.addEventListener('click', switchCamera);
    }

    function stopWebcam() {
        if (fpsCallbackId && webcamEl && 'cancelVideoFrameCallback' in webcamEl) {
            webcamEl.cancelVideoFrameCallback(fpsCallbackId);
            fpsCallbackId = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        if (webcamEl) {
            webcamEl.srcObject = null;
        }
        if (camFpsWarning) {
            camFpsWarning.style.display = 'none';
        }
    }

    if (webcamEl) {
        webcamEl.addEventListener('loadedmetadata', () => {
            const track = mediaStream ? mediaStream.getVideoTracks()[0] : null;
            updateCamBadge(track);
        });
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
        const rawW = webcamEl.videoWidth || 1920;
        const rawH = webcamEl.videoHeight || 1080;

        // Ограничиваем максимальный размер до 1280px для мгновенной передачи в ИИ и четкого захвата лица
        let targetW = rawW;
        let targetH = rawH;
        const maxDim = 1280;
        if (targetW > maxDim || targetH > maxDim) {
            if (targetW > targetH) {
                targetH = Math.round((targetH * maxDim) / targetW);
                targetW = maxDim;
            } else {
                targetW = Math.round((targetW * maxDim) / targetH);
                targetH = maxDim;
            }
        }

        canvasEl.width = targetW;
        canvasEl.height = targetH;
        const ctx = canvasEl.getContext('2d', { alpha: false });

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Отрисовываем с зеркальным отражением (как в превью камеры)
        ctx.save();
        ctx.translate(targetW, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(webcamEl, 0, 0, targetW, targetH);
        ctx.restore();

        // 0.88 обеспечивает высокую четкость черт лица при размере файла всего ~200-300 КБ
        capturedPhotoData = canvasEl.toDataURL('image/jpeg', 0.88);
    }

    // 4. СТУДИЙНАЯ ОБРАБОТКА И СОЗДАНИЕ ПОРТРЕТА / ПРОЖАРКА
    async function runAIGeneration() {
        // Проверка: режим Стендап-Прожарки
        const isRoast = selectedStyleModel === 'roast-standup' || (selectedStyle && selectedStyle.toUpperCase().includes('ПРОЖАР'));

        if (isRoast) {
            const roastStatuses = [
                `Анализ лука и позы перед камерой...`,
                `Сканирование брендов с Дордоя и ЦУМа...`,
                `Сверка харизмы с базами MBank и Kaspi...`,
                `Генерация карикатуры в GPT Image 2.5...`,
                `Стендапер разминает связки в ElevenLabs...`
            ];
            let rIdx = 0;
            if (aiStatusText) aiStatusText.textContent = roastStatuses[0];
            const rInterval = setInterval(() => {
                rIdx++;
                if (rIdx < roastStatuses.length && aiStatusText) {
                    aiStatusText.textContent = roastStatuses[rIdx];
                }
            }, 1400);

            try {
                const aggregatorKey = localStorage.getItem('kiosk_aggregator_key') || '';
                const elevenlabsKey = localStorage.getItem('kiosk_elevenlabs_key') || '';
                const elevenlabsVoiceId = localStorage.getItem('kiosk_elevenlabs_voice_id') || 'XNrB7jz2HCkpU5yK08kP';
                const openaiKey = localStorage.getItem('kiosk_openai_key') || '';

                const resp = await fetch('/api/ai/roast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        photoData: capturedPhotoData,
                        orderId: currentOrderId,
                        aggregatorKey,
                        elevenlabsKey,
                        elevenlabsVoiceId,
                        openaiKey
                    })
                });

                clearInterval(rInterval);

                if (resp.ok) {
                    const data = await resp.json();
                    if (data.success) {
                        if (roastCaricatureImg) roastCaricatureImg.src = data.imageUrl || data.originalPhotoUrl || selectedStylePhoto;
                        if (roastPunchTitle) roastPunchTitle.textContent = data.title || 'ПРОЖАРКА В ТЦ';
                        const cleanSpeech = (data.text || '').replace(/\[\w+\]/g, '').replace(/\.\.\./g, '…');
                        if (roastSpeechBody) roastSpeechBody.textContent = `«${cleanSpeech}»`;

                        const charisma = Number(data.charisma) || 16;
                        if (roastCharismaVal) roastCharismaVal.textContent = charisma + '%';
                        if (roastCharismaBar) roastCharismaBar.style.width = charisma + '%';

                        if (roastFlawVal) roastFlawVal.textContent = data.flaw || 'Аура рассрочки MBank';
                        if (roastMallVal) roastMallVal.textContent = data.mallStatus || 'Эксперт по фудкорту';

                        // QR код на скачивание
                        if (roastQrImg) {
                            const dlUrl = data.imageUrl || data.originalPhotoUrl || window.location.href;
                            renderInstantQR(roastQrImg, dlUrl, 220);
                        }

                        // Запуск озвучки ElevenLabs
                        if (data.audioUrl && roastAudioEl) {
                            roastAudioEl.src = data.audioUrl;
                            roastAudioEl.play().catch(() => {});
                        }

                        showStep(stepRoastResult);
                        return;
                    }
                }
            } catch(err) {
                console.warn('[Roast Pipeline Error]', err);
                clearInterval(rInterval);
            }
        }

        const statuses = isTryOnMode ? [
            `Анализ силуэта и позы гостя...`,
            `Подбор размера и примерка одежды...`,
            `Сохранение черт лица и индивидуальности...`,
            `Генерация реалистичных складок и текстуры...`,
            `Финальный рендеринг примерки...`
        ] : [
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
        let tryonAudioUrl = null;
        let tryonSpeechText = null;

        try {
            const aggregatorUrl = localStorage.getItem('kiosk_aggregator_url') || '';
            const aggregatorKey = localStorage.getItem('kiosk_aggregator_key') || '';
            const elevenlabsKey = localStorage.getItem('kiosk_elevenlabs_key') || '';
            const elevenlabsVoiceId = localStorage.getItem('kiosk_elevenlabs_voice_id') || 'XNrB7jz2HCkpU5yK08kP';

            const resp = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    photoData: capturedPhotoData,
                    templateImg: selectedStylePhoto,
                    prompt: selectedStylePrompt,
                    model: selectedStyleModel || 'chatgpt-2.5',
                    title: selectedStyle,
                    price: selectedStylePrice,
                    orderId: currentOrderId,
                    location: selectedStyleLocation,
                    isTryOn: isTryOnMode,
                    resolution: currentAiResolution || '2K',
                    aggregatorUrl,
                    aggregatorKey,
                    elevenlabsKey,
                    elevenlabsVoiceId
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                if (data.success) {
                    if (data.audioUrl) tryonAudioUrl = data.audioUrl;
                    if (data.speechText) tryonSpeechText = data.speechText;

                    if (data.pending && data.taskId) {
                        clearInterval(interval);
                        console.log(`[AI Polling] Задача ${data.taskId} в процессе генерации, запускаем поллинг...`);
                        const chatGptStatuses = [
                            `Нейросеть ChatGPT генерирует портрет в качестве ${currentAiResolution}...`,
                            `OpenAI прорисовывает фотореалистичные черты лица...`,
                            `Художественная стилизация и сохранение сходства...`,
                            `Шлифовка реалистичной текстуры и студийного света...`,
                            `Финальный рендеринг высокого разрешения...`
                        ];
                        const nanoBananaStatuses = [
                            `🍌 ИИ Nano Banana выполняет примерку одежды...`,
                            `👗 Точная посадка кроя по вашей фигуре и позе...`,
                            `👤 Сохранение вашего пола, лица и индивидуальности...`,
                            `✨ Прорисовка реалистичной ткани и теней...`,
                            `🎉 Финальный рендеринг готового образа...`
                        ];
                        const activePollStatuses = (isTryOnMode || selectedStyleModel === 'nano-banana-2') ? nanoBananaStatuses : chatGptStatuses;
                        let pollIdx = 0;
                        let pollAttempts = 0;
                        const maxPollAttempts = 45; // ~110 секунд

                        while (pollAttempts < maxPollAttempts) {
                            if (aiStatusText) {
                                aiStatusText.textContent = activePollStatuses[pollIdx % activePollStatuses.length];
                                pollIdx++;
                            }

                            await new Promise(r => setTimeout(r, 2500));
                            pollAttempts++;

                            try {
                                const sRes = await fetch(`/api/ai/status?taskId=${encodeURIComponent(data.taskId)}&_t=${Date.now()}`);
                                if (sRes.ok) {
                                    const sData = await sRes.json();
                                    if (sData.state === 'success' && sData.resultUrl) {
                                        console.log(`[AI Polling] Успех! Результат получен:`, sData.resultUrl);
                                        finalResultUrl = sData.resultUrl;
                                        break;
                                    } else if (sData.state === 'fail') {
                                        console.warn('[AI Polling] Ошибка генерации:', sData.error);
                                        break;
                                    }
                                }
                            } catch (pollErr) {
                                console.warn('[AI Polling] Ошибка запроса статуса:', pollErr);
                            }
                        }
                    } else if (data.resultUrl) {
                        finalResultUrl = data.resultUrl;
                    }
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

        // Формирование QR-кода для скачивания результата на смартфон
        const resultQrEl = document.getElementById('result-qr-img');
        const targetResultUrl = finalResultUrl || selectedStylePhoto || window.location.href;
        if (resultQrEl) {
            const absoluteDownloadUrl = targetResultUrl.startsWith('http') 
                ? targetResultUrl 
                : (window.location.origin + (targetResultUrl.startsWith('/') ? '' : '/') + targetResultUrl);
            console.log('📱 Формирование QR-кода результата для загрузки:', absoluteDownloadUrl);
            renderInstantQR(resultQrEl, absoluteDownloadUrl, 260);
        }

        // Отображение карточки локации примерки одежды (где купить вещь)
        if (tryonLocationInfoCard) {
            if (isTryOnMode || selectedStyleLocation) {
                if (tryonLocPriceVal) tryonLocPriceVal.textContent = `${selectedStylePrice || 450} СОМ`;
                if (tryonLocTitleVal) tryonLocTitleVal.textContent = selectedStyle || 'Товар из каталога';
                if (tryonLocPlaceVal) tryonLocPlaceVal.textContent = selectedStyleLocation || 'Уточняйте у продавца';
                tryonLocationInfoCard.style.display = 'flex';
            } else {
                tryonLocationInfoCard.style.display = 'none';
            }
        }

        showStep(stepResult);

        // КОГДА ИИ НАДЕЛ ОДЕЖДУ И ВЫДАЛ РЕЗУЛЬТАТ — ГОЛОСОМ ГОВОРИМ В КАКОМ БУТИКЕ ПРОДАЕТСЯ!
        if (isTryOnMode && selectedStyleLocation) {
            const phrase = tryonSpeechText || `Вам очень идёт ${selectedStyle || 'эта одежда'}! Её можно приобрести: ${selectedStyleLocation}. Стоимость — ${selectedStylePrice || 450} сом. Покажите это фото продавцу!`;
            setTimeout(() => {
                playTryOnVoice(tryonAudioUrl, phrase);
            }, 350);
        }
    }

    // ГОЛОСОВОЕ ОЗВУЧИВАНИЕ МЕСТА ПРОДАЖИ (ELEVENLABS + ВСТРОЕННЫЙ WEB SPEECH API FALLBACK)
    function playTryOnVoice(audioUrl, text) {
        currentTryOnAudioUrl = audioUrl;
        currentTryOnVoiceText = text;

        if (tryonAudioElement) {
            tryonAudioElement.pause();
            tryonAudioElement.currentTime = 0;
        }
        if ('speechSynthesis' in window) {
            try { window.speechSynthesis.cancel(); } catch(e) {}
        }

        if (audioUrl) {
            tryonAudioElement.src = audioUrl;
            if (tryonVoiceReplayBtn) tryonVoiceReplayBtn.classList.add('speaking');
            if (tryonVoiceBtnText) tryonVoiceBtnText.textContent = 'Озвучивание адреса...';

            const playPromise = tryonAudioElement.play();
            if (playPromise) {
                playPromise.catch(() => {
                    // Если автоплей заблокирован политикой браузера — произносим через SpeechSynthesis
                    speakWithBrowserTts(text);
                });
            }

            tryonAudioElement.onended = () => {
                if (tryonVoiceReplayBtn) tryonVoiceReplayBtn.classList.remove('speaking');
                if (tryonVoiceBtnText) tryonVoiceBtnText.textContent = 'Послушать где купить';
            };
            tryonAudioElement.onerror = () => {
                speakWithBrowserTts(text);
            };
        } else {
            speakWithBrowserTts(text);
        }
    }

    function speakWithBrowserTts(text) {
        if (!('speechSynthesis' in window) || !text) return;
        try { window.speechSynthesis.cancel(); } catch(e) {}

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const ruVoice = voices.find(v => v.lang && (v.lang.includes('ru') || v.lang.includes('RU')));
        if (ruVoice) utterance.voice = ruVoice;

        if (tryonVoiceReplayBtn) tryonVoiceReplayBtn.classList.add('speaking');
        if (tryonVoiceBtnText) tryonVoiceBtnText.textContent = 'Озвучивание адреса...';

        utterance.onend = () => {
            if (tryonVoiceReplayBtn) tryonVoiceReplayBtn.classList.remove('speaking');
            if (tryonVoiceBtnText) tryonVoiceBtnText.textContent = 'Послушать где купить';
        };
        utterance.onerror = () => {
            if (tryonVoiceReplayBtn) tryonVoiceReplayBtn.classList.remove('speaking');
            if (tryonVoiceBtnText) tryonVoiceBtnText.textContent = 'Послушать где купить';
        };
        window.speechSynthesis.speak(utterance);
    }

    if (tryonVoiceReplayBtn) {
        tryonVoiceReplayBtn.addEventListener('click', () => {
            playTryOnVoice(currentTryOnAudioUrl, currentTryOnVoiceText);
        });
    }

    // 5. FINISH & TEMPLATE SELECTION
    finishBtn.addEventListener('click', closeKioskFlow);

    if (roastFinishBtn) {
        roastFinishBtn.addEventListener('click', closeKioskFlow);
    }
    if (roastReplayBtn && roastAudioEl) {
        roastReplayBtn.addEventListener('click', () => {
            roastAudioEl.currentTime = 0;
            roastAudioEl.play().catch(() => {});
        });
    }
    if (roastAudioTrigger && roastAudioEl) {
        roastAudioTrigger.addEventListener('click', () => {
            if (roastAudioEl.paused) {
                roastAudioEl.play().catch(() => {});
            } else {
                roastAudioEl.pause();
            }
        });
        roastAudioEl.addEventListener('play', () => {
            if (roastAudioIcon) roastAudioIcon.textContent = '🔊';
            document.querySelectorAll('.wave-col').forEach(w => w.style.animationPlayState = 'running');
        });
        roastAudioEl.addEventListener('pause', () => {
            if (roastAudioIcon) roastAudioIcon.textContent = '🔈';
            document.querySelectorAll('.wave-col').forEach(w => w.style.animationPlayState = 'paused');
        });
    }

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
                selectedStyleLocation = cur.location || '';
                selectedStyleResolution = cur.resolution || '2K';
                setAiResolution(selectedStyleResolution);
                isTryOnMode = isTryOnTemplate(cur);
                selectedStyleModel = cur.model || 'chatgpt-2.5';
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
                if (data.finik_account_id) {
                    localStorage.setItem('kiosk_finik_account_id', data.finik_account_id);
                }
                if (data.finik_pos_id) {
                    localStorage.setItem('kiosk_finik_pos_id', data.finik_pos_id);
                }
                if (data.finik_merchant_name) {
                    localStorage.setItem('kiosk_finik_merchant_name', data.finik_merchant_name);
                }
                if (data.finik_static_qr) {
                    localStorage.setItem('kiosk_finik_static_qr', data.finik_static_qr);
                }
                if (data.finik_qr_img) {
                    localStorage.setItem('kiosk_finik_qr_img', data.finik_qr_img);
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
