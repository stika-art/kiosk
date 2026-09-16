// =============================================
// TRENDUM AI PHOTO KIOSK — INTERACTIVE ENGINE
// =============================================

let selectedStyle = 'ROBLOX HERO';
let selectedStylePhoto = 'images/photo1.jpg';
let selectedStylePrice = 290;
let selectedStyleLocation = '';
let isTryOnMode = false;
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
        { id: 99, sectionId: 3, sectionTitle: 'ТРЕНДЫ', category: 'ПРОЖАРКА', title: '🔥 ИИ-ПРОЖАРКА (СТЕНДАП)', img: 'assets/hero_portrait.jpg', price: 190, model: 'roast-standup', prompt: 'Standup roast caricature with dynamic vision analysis and ElevenLabs voice' },
        { id: 101, sectionId: 4, sectionTitle: 'ПРИМЕРКА', category: 'ТОЛСТОВКИ', title: 'Толстовка TRENDUM Black Oversize', img: 'assets/hero_avatar.jpg', price: 450, location: 'Рынок Дордой, ряд 5, контейнер 142', model: 'chatgpt-2.5', prompt: 'Virtual clothing try-on: Dress the person in this black oversize streetwear hoodie. Keep the person face, facial features, hair, identity, expression and background from the input photo completely intact. Realistic garment folds and shadows.' },
        { id: 102, sectionId: 4, sectionTitle: 'ПРИМЕРКА', category: 'ТОЛСТОВКИ', title: 'Толстовка ALTYN White Classic', img: 'assets/hero_portrait.jpg', price: 450, location: 'Рынок Дордой, проход 3, контейнер 88', model: 'nano-banana-2', prompt: 'Virtual try-on: Dress the person in this stylish premium white cotton hoodie. Keep original face, hair, and pose with photorealistic garment drape and natural lighting.' },
        { id: 103, sectionId: 4, sectionTitle: 'ПРИМЕРКА', category: 'ХУДИ', title: 'Худи Streetwear Cyberpunk', img: 'assets/hero_robot.jpg', price: 490, location: 'ТРЦ Bishkek Park, 2 этаж, бутик Trendum', model: 'nano-banana-2', prompt: 'Virtual try-on: Fit the futuristic graphic hoodie on the person in the photo. Photorealistic texture, preserve facial likeness.' },
        { id: 104, sectionId: 4, sectionTitle: 'ПРИМЕРКА', category: 'ФУТБОЛКИ', title: 'Футболка Trendum Minimalist', img: 'assets/man.jpg', price: 350, location: 'Рынок Дордой, контейнер 205', model: 'chatgpt-2.5', prompt: 'Virtual try-on: Dress the person in the minimalist black cotton graphic t-shirt. Preserve exact facial likeness and natural body fit.' }
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

        return {
            ...t,
            id: Number(t.id) || Date.now(),
            sectionId: Number(sid),
            sectionTitle: stitle || 'ФОТО',
            category: cat,
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
            model: 'chatgpt-2.5',
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
            model: 'chatgpt-2.5',
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
            isTryOnMode = isTryOnTemplate(item);
            selectedStyleModel = item.model || (isTryOnMode ? 'nano-banana-2' : 'face-swap');
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

    // МГНОВЕННАЯ ГЕНЕРАЦИЯ QR-КОДОВ (0ms, локально через QRCode.js, с fallback на qrserver)
    function renderInstantQR(element, text, size = 260) {
        if (!element || !text) return;
        try {
            if (typeof QRCode !== 'undefined') {
                const tempDiv = document.createElement('div');
                new QRCode(tempDiv, {
                    text: text,
                    width: size,
                    height: size,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
                const canvas = tempDiv.querySelector('canvas');
                if (canvas) {
                    const dataUrl = canvas.toDataURL('image/png');
                    if (element.tagName === 'IMG') {
                        element.src = dataUrl;
                    } else {
                        element.innerHTML = '';
                        element.appendChild(canvas);
                    }
                    return;
                }
            }
        } catch (qrErr) {
            console.warn('Локальный QR рендер не сработал, переключаемся на fallback:', qrErr);
        }
        // Fallback через api.qrserver.com, если библиотеки нет
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
        if (element.tagName === 'IMG') {
            element.src = fallbackUrl;
        } else {
            element.innerHTML = `<img src="${fallbackUrl}" alt="QR" style="width:100%;height:100%;object-fit:contain;">`;
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
            if (isTryOnMode) {
                paySubtext.textContent = 'Виртуальная примерка одежды в студийном качестве';
            } else {
                paySubtext.textContent = 'Финальное фото в студийном качестве';
            }
        }

        // МГНОВЕННЫЙ QR-КОД (0мс): формируем заказ и рендерим QR сразу без ожидания сети!
        const amount = selectedStylePrice || 290;
        currentOrderId = 'TRD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        const configuredStaticQr = localStorage.getItem('kiosk_finik_static_qr') || '';
        const configuredAccountId = localStorage.getItem('kiosk_finik_account_id') || '';

        let instantPayload = configuredStaticQr;
        if (!instantPayload) {
            instantPayload = `https://qr.finik.kg/#orderId=${currentOrderId}&amount=${amount}&title=${encodeURIComponent(selectedStyle || 'Photo')}`;
        }
        
        if (elqrImg) {
            renderInstantQR(elqrImg, instantPayload, 260);
        }
        if (paymentStatusText) paymentStatusText.textContent = 'Ожидание оплаты...';

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
                    accountId: configuredAccountId
                })
            });
            const data = await resp.json();

            if (data.success && data.paymentUrl && data.paymentUrl !== instantPayload) {
                // Если Finik вернул специфический URL платежного шлюза, обновляем QR
                if (elqrImg) renderInstantQR(elqrImg, data.paymentUrl, 260);
            }
        } catch (e) {
            console.warn('API error (автономный режим ELQR активен):', e);
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
                    model: selectedStyleModel,
                    title: selectedStyle,
                    price: selectedStylePrice,
                    orderId: currentOrderId,
                    location: selectedStyleLocation,
                    isTryOn: isTryOnMode,
                    aggregatorUrl,
                    aggregatorKey,
                    elevenlabsKey,
                    elevenlabsVoiceId
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                if (data.success) {
                    if (data.resultUrl) finalResultUrl = data.resultUrl;
                    if (data.audioUrl) tryonAudioUrl = data.audioUrl;
                    if (data.speechText) tryonSpeechText = data.speechText;
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
        if (resultQrEl && finalResultUrl) {
            const absoluteDownloadUrl = finalResultUrl.startsWith('http') 
                ? finalResultUrl 
                : (window.location.origin + (finalResultUrl.startsWith('/') ? '' : '/') + finalResultUrl);
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
                isTryOnMode = isTryOnTemplate(cur);
                selectedStyleModel = cur.model || (isTryOnMode ? 'nano-banana-2' : 'face-swap');
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
