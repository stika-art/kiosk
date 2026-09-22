// =============================================
// TRENDUM AI PHOTO KIOSK — INTERACTIVE ENGINE
// =============================================

let selectedStyle = '';
let selectedStylePhoto = 'images/photo1.jpg';
let selectedStylePrice = 290;
let selectedStyleLocation = '';
let isTryOnMode = false;
let selectedStyleModel = 'chatgpt-2';
let selectedStylePrompt = '';
let selectedStyleResolution = '2K';
let selectedTemplateId = null;
let selectedTemplateHtml = '';
let isSelectingCard = false;
let isAttractClosing = false;
let currentCategory = 'ФОТО';
let activeTemplateIndex = 0;

// УПРАВЛЕНИЕ РАЗРЕШЕНИЕМ ГЕНЕРАЦИИ (1K, 2K HD, 4K ULTRA)
let currentAiResolution = localStorage.getItem('kiosk_ai_resolution') || '1K';

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
    'ФОТО': [],
    'ВИДЕО': [],
    'ТРЕНДЫ': []
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

const LEGACY_STANDARD_TITLES = [
    'KIDS FANTASY',
    'CYBER MAN',
    'TRENDING PHOTO',
    'FORBES COVER',
    'GIGACHAD SIGMA',
    'NEON MOTION',
    'RETRO 90S VHS',
    'RETRO VHS',
    'CYBER ROBOT',
    'ROBLOX HERO',
    'ANIME VIBE',
    'CYBER SAMURAI',
    'ANIME WORLD',
    'TIKTOK DANCE',
    'REELS VIBE'
];
const LEGACY_STANDARD_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function isLegacyStandardTemplate(t) {
    if (!t) return false;
    const id = Number(t.id);
    if (LEGACY_STANDARD_IDS.includes(id)) return true;
    const titleUp = (t.title || '').trim().toUpperCase();
    if (LEGACY_STANDARD_TITLES.includes(titleUp)) return true;
    return false;
}

const DEFAULT_KIOSK_TEMPLATES = [
    {
        "id": 1789208643545,
        "category": "ОБЛОЖКИ",
        "title": "Portrait",
        "price": 1,
        "model": "chatgpt-2.5",
        "prompt": "Создай портрет, не меняя черты лица. Черно-белое художественное фото мужчины, стоящей на фоне стены, на которую спроецировано крупное число «34». Свет от проектора ярко освещает цифры и часть фигуры, создавая глубокие тени и драматичный контраст. Мужчина одет в объемную белую рубашку, и стильные солнцезащитные очки. В руке он держит виски. Атмосфера элегантной вечеринки по случаю дня рождения, эстетика минимализма, высокая контрастность, пленочное зерно.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789208643545.jpg",
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 1789210227800,
        "category": "ОБЛОЖКИ",
        "title": "2",
        "price": 2,
        "model": "chatgpt-2.5",
        "prompt": "Use the uploaded photo as the ABSOLUTE IDENTITY REFERENCE for FACIAL GEOMETRY ONLY — not for lighting, not for exposure, not for colour.  IDENTITY LOCK — HIGHEST PRIORITY: reproduce this exact face. Same skull and jaw geometry, same eye shape and spacing, same eyelid crease, same nose bridge width and tip shape, same lip shape and philtrum, same cheekbone height, same ear shape, same hairline, same age. Keep the natural asymmetry of the real face — one eye slightly different from the other, the mouth not perfectly level. Do NOT beautify, slim, symmetrise, de-age or \"improve\" anything. Do not create a lookalike. A viewer who knows this person must recognise them instantly.  LIGHT INTEGRATION — THIS IS THE MOST IMPORTANT INSTRUCTION AFTER IDENTITY. The face must be lit BY THIS SCENE, not carried over from the reference photo. Ignore the lighting of the source image completely and RE-LIGHT the head from scratch to match the environment: — the same hard low sun that carves the architecture also strikes the face, from the same direction and at the same angle; — a crisp nose shadow falls across the cheek on the shadow side, with the same hard edge as the architectural shadows on the ground; — the collar of the garment casts a real shadow across the jaw and neck; — warm ochre bounce from the sunlit concrete lifts the underside of the chin and the lower lip; — cool blue skylight fills the shadow side of the face; — specular highlights sit on the forehead, nose bridge and one cheekbone, with the same intensity as the highlights on the stone; — the catchlight in the eyes comes from the same direction as the sun; — exposure, contrast, colour temperature, black level and grain on the face MATCH the rest of the frame exactly. If the face reads as evenly lit while the scene is hard-lit, the image has FAILED. The head must look photographed in this place, at this hour, in this light — one exposure, one camera, one moment.  PROPORTION — the second failure to avoid. The head must sit at natural human scale relative to the body: roughly one seventh of the standing figure, shoulders no wider than about three head-widths at the actual shoulder line. Oversized tailoring may extend far beyond the body, but it must read as fabric hanging off a normally proportioned person, not as a garment with a small head placed on top. Neck, shoulder slope and the way the coat sits on the trapezius must be anatomically believable. The face should occupy a confident share of the frame — clearly readable, not a distant detail lost in the architecture.  SKIN, EYES, HAIR — photographic realism, not rendering: visible pores across nose and cheeks, fine vellus hair along the jaw catching the sun, real micro-texture, natural unevenness, freckles and moles exactly as on the reference, subsurface scattering glowing through the earlobes against the light. Sharp iris with radial fibre detail and a defined limbal ring, sclera faintly warm with fine visible capillaries, wet reflective eye surface, individual eyelashes of uneven length. Individual hair strands with a backlit flyaway halo, visible scalp at the parting, real strand separation at the silhouette.  CAMERA AND POSE: extreme low worm's-eye angle, camera almost at ground level, 20mm wide lens close to the figure, tilted into a hard 12-degree Dutch angle. The figure towers over the lens; the architecture converges steeply overhead and closes into an impossible vault above the head. Strong vertical convergence, curving horizon, deliberate barrel distortion in the architecture — but the FACE stays geometrically undistorted and correctly proportioned, as if shot on a longer lens and composited by physics rather than by software. Chin slightly lowered, eyes looking down the barrel of the lens, calm and completely unbothered by the impossible space. One shoulder dropped, weight on the back foot, the coat swinging open along a diagonal that follows the Dutch tilt.  SCENE: full-frame experimental editorial fashion photograph. The person stands inside a brutalist architecture that physically bends, stretches and reorganises around the body. Concrete walls fold like fabric, columns repeat into impossible perspective, platforms cantilever overhead. The clothing is an extension of the architecture: sharp geometric tailoring, elongated coat, exaggerated structured shoulders, rigid sculptural folds that rhyme with the concrete planes. The distortion is physical and photographic, never a digital glitch. The person stays stable and real while the SPACE becomes impossible.  PALETTE: restrained architectural range — concrete, graphite, black, cream, muted grey — with exactly ONE saturated accent colour used sparingly and deliberately.  LIGHT AND COMPOSITION: hard directional low sun, long architectural shadows raking across the ground, sharp highlights, deep dimensional contrast. Large areas of negative space balanced against massive geometric mass.  TEXTURE: subtle vintage film grain, analog print texture, slight colour fringing, fine surface imperfections, tactile photographic depth. The grain must lie over the face at the same strength as over the concrete.  FORMAT: vertical portrait, 3:4 aspect ratio.  FORBIDDEN: beauty retouching, skin smoothing, airbrushing, waxy plastic skin, blurred pores, symmetrical doll face, evenly lit face, flat frontal fill light on the face, a face whose lighting disagrees with the scene, a face pasted or composited in, mismatched colour temperature between head and body, an undersized head, 3D render, architectural visualisation, video game scene, CGI character, cyberpunk, cartoon, generic AI fashion image, typography, text, letters, numbers, logos, watermark.  The result must read as one photograph: the same person from the source, standing in a physically impossible but convincingly photographed brutalist universe, lit by its light.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789210227800.jpg",
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 1789558483328,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "ОБЛОЖКИ",
        "title": "Flowers",
        "price": 1,
        "location": "",
        "model": "chatgpt-2.5",
        "prompt": "FORMAT: vertical portrait, 3:4 aspect ratio.\n\nMEDIUM — read this first. A hand-painted gouache illustration on cream cotton paper, in the language of character design rather than portraiture. Flat opaque colour areas with only two or three tones per surface, minimal internal modelling, a confident economical contour that carries the form, visible paper tooth, slight pigment granulation. Bold readable shapes before detail. This is an illustrated character, not a painted photograph: no photographic skin, no pores, no lens blur, no 3D shading, no rendered realism.\n\nCHARACTER DESIGN — the core of this style and the thing that must not be softened. Redraw the person with stylised proportions: the head noticeably larger relative to the body than in life, roughly one sixth of the standing figure; the eyes enlarged and set as clean graphic shapes; the nose and mouth reduced to simple confident marks; hands simplified into clear anatomically believable forms; the torso and clothing built from a few large masses with a strong, instantly readable silhouette. Every surface is a shape first and a texture second.\n\nIDENTITY THROUGH EXAGGERATION — how recognition survives this stylisation. Work like a caricaturist, not like a copyist: find the two or three traits that make THIS face unmistakable — the shape of the glasses, the mass and line of the hair, the jaw, the brow, the nose profile, the set of the eyes, facial hair, the way the head sits on the neck — and push them slightly BEYOND life while everything else is simplified. Preserve the true relationships: eye spacing, the proportion of forehead to nose to chin, the width of the jaw against the cheekbones, the hairline, the age, the build, the natural asymmetry of the real face. Do NOT smooth the distinctive traits away, do NOT beautify, slim, symmetrise or de-age, do NOT replace the head with a generic illustrated face or an anime face. Smoothing kills recognition faster than exaggeration does. Someone who knows this person must name them instantly, even though nothing here is photographic.\n\nPALETTE — narrow in RANGE but full in STRENGTH. Three families only: fresh sage-to-olive green, clean rose pink, warm cream paper. Clear, luminous, confident colour — real pink that reads as pink, real green with life in it, opaque and slightly chalky like true gouache. GREEN AND PINK MUST CARRY ROUGHLY EQUAL WEIGHT in the frame: if one of them dominates and the other survives only as an accent, the image has FAILED. Push value contrast — deep greens against pale pinks against bare cream — so it reads from across a room. Do NOT desaturate, grey down, fade or wash out. Forbidden outside the three families: saturated primaries, black, brown, blue sky, rainbow.\n\nCHARACTER CONCEPT — the person is not posing, they ARE somebody. Read the uploaded photo — their energy, attitude, age, what they seem to be like — and invent a persona that takes that trait and pushes it until it is funny, sharp or slightly absurd. Give them something to DO and something to HOLD: a prop, a costume detail, a gesture that tells a whole story in one frame. The register is punk irreverence delivered in a sweet, pretty medium; the clash between the tender painting and the rude or deadpan content IS the style. Attitude in the eyes, never a polite smile. The concept must fit THIS person and be impossible to transplant onto anyone else.\n\nPOSE: waist-up, the figure large and graphic in the frame. The pose carries the attitude — arms crossed, a hand raised, leaning in, brandishing the prop. Never a passive shoulders-square photo pose.\n\nWARDROBE: take the clothing from the uploaded photo — same garments, same cut, same layers, same collar and neckline — and REBUILD it in this flat painted language, repainted in the palette above. Simplify the folds into a few decisive shapes. Do not restyle or invent new outfits; the person must recognise their own clothes.\n\nWORLD: a background and a few oversized objects belonging to the invented persona, pushing its joke further. Big simple shapes, flat colour, no clutter, generous empty cream paper. Everything quieter in value than the head — the world sets up the character, the face lands the punchline.\n\nCRAFT: subtle paper grain across the whole image, slightly uneven edges of the flat washes, one or two places where pigment pooled, a soft border of untouched paper.\n\nFORBIDDEN: realistic portrait proportions; a painted photograph; softened or averaged features; a polite neutral subject with no idea behind it; a passive pose; decorative houseplants as filler; desaturated, dusty or washed-out colour; one colour dominating the frame; any text, letters, numbers, logos or watermark; photographic skin, pores, photoreal rendering; 3D render, CGI, plastic shading; generic anime or manga face; doll-like symmetrical beauty; a face that no longer resembles the source; crowded busy composition.\n\nThe result must read as a character from a coherent illustrated series — clearly this exact person, and clearly a drawing.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789558483328.jpg",
        "htmlCode": ""
    },
    {
        "id": 1789214435565,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "МУЛЬТИКИ",
        "title": "Anime",
        "price": 3,
        "model": "chatgpt-2.5",
        "prompt": "Сделай из загруженного изображения картинку в актуальном аниме-стиле. Используй выразительную линию с легкой вариативностью и минимальный сел-шейдинг с плоскими теневыми формами. Используй яркие, насыщенные цвета и чистое, графичное освещение. Стиль строится на преувеличенных, мультяшных пропорциях персонажей, с простыми, но очень выразительными чертами лица, позволяющими передавать широкий спектр эмоций, и с заметно искаженной, растянутой анатомией. Сделай пространство слегка искаженным, с заметно нарушенной перспективой и упрощенными формами объектов. Композиция и общее настроение должны быть энергичными, живыми и комедийными, в полностью стилизованном и нереалистичном мире.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789214435565.jpg",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 1789214494635,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "ОБЛОЖКИ",
        "title": "Slimes",
        "price": 2,
        "model": "chatgpt-2.5",
        "prompt": "Use the uploaded photo as the PRIMARY IDENTITY REFERENCE. Preserve the person’s identity and facial appearance with maximum accuracy. Use the provided reference image as the PRIMARY VISUAL STYLE REFERENCE. Create a full-frame editorial fashion image in the exact visual language of the reference: surreal hip-hop fashion photography, extreme horizontal motion-drag distortion, stretched fabric and elongated clothing trails, bold saturated red studio background, dramatic low-angle fashion composition, oversized contemporary streetwear, strong graphic silhouette, expressive visual weirdness, cool confident attitude, retro analog print aesthetic, subtle vintage film grain, tactile photographic texture, slightly imperfect printed-surface feel. IDENTITY PRESERVATION IS THE HIGHEST PRIORITY. The person must remain immediately recognizable as the person from the source photo. Preserve the exact facial identity, facial proportions, bone structure, eye shape, eyebrows, nose, lips, jawline, cheekbones, skin tone, hairline, hairstyle, age, and all distinctive facial characteristics from the source image. Do NOT redesign, beautify, idealize, masculinize, feminize, age, de-age, or otherwise alter the person’s face. Do not turn the person into a generic fashion model. Do not create a lookalike. It must clearly be the SAME PERSON from the uploaded photo. Preserve natural facial anatomy and realistic skin texture while translating the person into the visual style of the reference. STYLE MATCH: Match the reference image as closely as possible in: - overall visual language - composition - camera perspective - low-angle fashion photography - full-body framing - subject scale - bold red background - horizontal motion streaks - stretched and smeared clothing - elongated fabric trails - distorted garment silhouettes - dynamic horizontal movement - surreal fashion editorial feeling - hip-hop / contemporary streetwear attitude - retro film grain - analog photographic texture - slightly rough printed texture - strong contrast - saturated red environment - unusual proportions created by motion distortion - clean but deliberately strange fashion-art direction The motion distortion should primarily affect the CLOTHING and parts of the silhouette, creating long horizontal streaks that extend dramatically across the frame, while the face and essential facial features remain sharp, stable, recognizable, and anatomically correct. Create the illusion that the clothing is being pulled sideways through extreme motion, producing long flowing fabric trails and repeated stretched silhouettes. The distortion should feel physical, intentional, and fashion-editorial rather than like a digital glitch. The person should stand confidently with a strong, slightly confrontational fashion pose. Preserve the recognizable physical characteristics of the source person while adapting the pose and framing to the reference style. Use a dramatic low camera angle, making the figure feel powerful and imposing. The clothing should be transformed into a bold contemporary hip-hop fashion look while remaining believable and coherent. Use oversized silhouettes, layered fabrics, exaggerated proportions, premium streetwear details and fashion-editorial styling. The composition should be visually rich but controlled. The red background should occupy most of the frame and create a strong monochromatic visual field behind the subject. Add subtle retro photographic grain, analog imperfections, fine surface texture, slight print wear and cinematic photographic depth. Keep the face crisp and highly detailed even while the clothing and body silhouette contain extreme horizontal motion distortion. No typography. No text. No letters. No numbers. No logos. No barcode. No symbols that resemble writing. No magazine captions. No graphic labels. No watermark. The final image should look like a high-budget experimental fashion campaign photographed in a studio and then transformed through sophisticated analog motion-drag techniques. It should NOT look like a generic AI image, 3D render, cartoon, illustration, digital glitch art, or random motion blur. The result should feel like the same person from the source photograph photographed in the exact same artistic universe as the reference image. Ultra-detailed, high-end fashion photography, realistic face, realistic skin, tactile fabric, dramatic perspective, sophisticated motion distortion, retro analog texture, editorial art direction, 4K detail. --ar 4:5 --raw",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789214494635.jpg",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 1789214593489,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "ОБЛОЖКИ",
        "title": "Water",
        "price": 1,
        "model": "chatgpt-2.5",
        "prompt": "Создай подводный портрет сверхкрупным планом в момент сразу после того, как человек нырнул в бассейн или прозрачную неглубокую воду. Создай спокойную, невесомую, почти эфемерную атмосферу с акцентом на световые отражения. Без напряжения и без ощущения срочности.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789214593489.jpg",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 1789214671647,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "ОБЛОЖКИ",
        "title": "Red",
        "price": 1,
        "model": "chatgpt-2.5",
        "prompt": "РОЛЬ И ЭСТЕТИКА Ты — фотограф мирового уровня, специализирующийся на редакционных портретах с драматичным, насыщенным студийным светом. Задача — создать мощный, динамичный портрет с героическим ощущением. ЯКОРЬ ИДЕНТИЧНОСТИ (КРИТИЧЕСКОЕ СТРОГОЕ ОГРАНИЧЕНИЕ) Источник: используй человека с ПРИКРЕПЛЁННОГО РЕФЕРЕНСНОГО ФОТО. Сохранение: необходимо идеально сохранить его точные черты лица, тон кожи, причёску и естественное сходство без каких-либо изменений. Универсальность: свет и ракурс должны применяться к модели независимо от пола. ОДЕЖДА И СТИЛЬ Одежда: использовать ОДЕЖДУ ТОЧНО КАК НА РЕФЕРЕНСНОМ ФОТО. Сохранение: фасон, цвет, материал и посадка одежды должны полностью соответствовать оригиналу без каких-либо изменений или стилизации. Выражение лица: серьёзное, напряжённое, сосредоточенное. Взгляд направлен не в камеру, а в пространство выше, за пределы кадра. СЦЕНА И КОМПОЗИЦИЯ Фон: насыщенный однотонный оранжево-красный задник с плавными, интенсивными цветовыми градиентами без каких-либо узоров. Атмосфера должна ощущаться «горячей». Ракурс камеры (КРИТИЧЕСКИ ВАЖНО): съёмка снизу вверх. Этот угол должен делать персонажа мощным и доминирующим. Кадрирование: средний крупный план, акцент на лице и плечах. СВЕТ (ДРАМАТИЧНЫЙ И ЦВЕТНОЙ) Цветовая палитра: доминируют яркие оранжевые и глубокие красные оттенки Основной свет: сильный направленный источник, создающий глубокие драматичные тени на лице (эффект кьяроскуро), подчёркивающий структуру лица Контровой свет: мощный, выразительный обводящий свет или цветовой ореол, отделяющий голову и плечи от яркого фона Настроение: загадочная, напряжённая, высококонтрастная студийная эстетика ТЕХНИЧЕСКОЕ КАЧЕСТВО Стиль: фотореализм, высокая детализация Текстуры: резкий фокус на лице, в контрасте с гладкими градиентами фона Кожа: сохранить естественные поры и натуральную текстуру кожи",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789214671647.jpg",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 1789214790740,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "МУЛЬТИКИ",
        "title": "Carricature",
        "price": 2,
        "model": "chatgpt-2.5",
        "prompt": "Вертикальный причудливый плоский карикатурный портрет [люди с прикрепленной фотографии] с высокой геометрической формой головы, длинной узкой шеей, огромными круглыми глазами, крошечным ртом и невозмутимым смехом, одетого в [ОДЕЖДУ с фотографии]. Чистый черный контур, плавная цветовая гамма, простые формы лица, редкие рисунки на меху или коже животных, игривый сюрреалистический дизайн персонажей, смелая графическая палитра [синий]. Фоновые декорации: [Уличные декорации Нью-Йорка выполнены с использованием упрощенных форм, четкой глубины, небольшого количества пейзажей из окружающей среды и четкой мультяшной перспективы. Четкая цифровая иллюстрация, вертикальное обрамление в виде плаката, никакого реализма, никакого 3D-рендеринга, никакой живописной растушевки, соотношение сторон 4:5.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789214790740.jpg",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 1789215941940,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "ОБЛОЖКИ",
        "title": "Red Gradient",
        "price": 1,
        "model": "chatgpt-2.5",
        "prompt": "red gradient background, confidently. The lighting is dramatic and cinematic, emphasizing his facial structure and diving a luxury fashion magazine vibe. Ultra-realistic, high-detail, editorial photography style. 4K resolution, symmetrical composition, minimal background element. 4:3 ratio.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789215941940.jpg",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 1789216584056,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "ОБЛОЖКИ",
        "title": "FullXR",
        "price": 3,
        "model": "chatgpt-2.5",
        "prompt": "red gradient background, confidently. The lighting is dramatic and cinematic, emphasizing his facial structure and diving a luxury fashion magazine vibe full body. Ultra-realistic, high-detail, editorial photography style. 4K resolution, symmetrical composition, minimal background element. 4:3 ratio.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789216584056.jpg",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 99,
        "sectionId": 1789230034964,
        "sectionTitle": "РАЗВЛЕЧЕНИЕ",
        "category": "ПРОЖАРКА",
        "title": "🔥 ИИ-ПРОЖАРКА (СТЕНДАП)",
        "img": "assets/hero_portrait.jpg",
        "price": 190,
        "model": "roast-standup",
        "prompt": "Standup roast caricature with dynamic vision analysis and ElevenLabs voice",
        "location": "",
        "htmlCode": ""
    },
    {
        "id": 102,
        "sectionId": 4,
        "sectionTitle": "ПРИМЕРКА",
        "category": "ТОЛСТОВКИ",
        "title": "Толстовка ALTYN White Classic",
        "img": "assets/hero_portrait.jpg",
        "price": 450,
        "location": "Рынок Дордой, проход 3, контейнер 88",
        "model": "nano-banana-2",
        "prompt": "Virtual try-on: Dress the person in this stylish premium white cotton hoodie. Keep original face, hair, and pose with photorealistic garment drape and natural lighting.",
        "htmlCode": ""
    },
    {
        "id": 103,
        "sectionId": 4,
        "sectionTitle": "ПРИМЕРКА",
        "category": "ХУДИ",
        "title": "Худи Streetwear Cyberpunk",
        "img": "assets/hero_robot.jpg",
        "price": 490,
        "location": "ТРЦ Bishkek Park, 2 этаж, бутик Trendum",
        "model": "nano-banana-2",
        "prompt": "Virtual try-on: Fit the futuristic graphic hoodie on the person in the photo. Photorealistic texture, preserve facial likeness.",
        "htmlCode": ""
    },
    {
        "id": 104,
        "sectionId": 4,
        "sectionTitle": "ПРИМЕРКА",
        "category": "ФУТБОЛКИ",
        "title": "Футболка Trendum Minimalist",
        "img": "assets/man.jpg",
        "price": 350,
        "location": "Рынок Дордой, контейнер 205",
        "model": "chatgpt-2.5",
        "prompt": "Virtual try-on: Dress the person in the minimalist black cotton graphic t-shirt. Preserve exact facial likeness and natural body fit.",
        "htmlCode": ""
    },
    {
        "id": 1789218220360,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "ОБЛОЖКИ",
        "title": "Samurai",
        "price": 2,
        "model": "chatgpt-2.5",
        "prompt": "Redraw the person from the uploaded photo as a modern Asian illustrated poster. IDENTITY FIRST, BUT STYLIZED. The person must stay instantly recognizable — keep the proportions of the face, the shape of the nose and lips, the eye shape and spacing, the eyebrows, the skin tone, the hairstyle and the expression. Do not beautify and do not invent features. But this is an ILLUSTRATION, not a painted photograph: simplify and stylize the drawing itself. HOW TO STYLIZE THE PERSON — this is the most important part The figure must read as a DRAWN ILLUSTRATED CHARACTER, not as a photograph painted over. A viewer should say «beautifully drawn character», never «retouched photo». • the face is built from a few clean shapes: cheek, jaw and chin as smooth simple planes, no detailed modelling, no rendered bone structure; • skin is TWO OR THREE FLAT TONES with one soft transition and a coral blush — no pores, no shine, no photographic shading, no subtle wrinkles; • eyes noticeably larger than in life, drawn with a crisp confident line, clean eyelids, lashes as a few strokes, iris as a flat shape with one highlight; • nose reduced to two or three delicate lines and a soft shadow, nostrils barely indicated; • lips as one clear filled shape with a simple highlight; • eyebrows as solid graphic strokes; • the figure is elongated and graceful: longer neck, narrower sloping shoulders, slender elongated hands with long fingers; • hair is a set of large decorative ribbons of colour with a handful of drawn strands on top — never thousands of separate hairs; • clothing folds simplified into few large calm shapes with flat washes. Identity survives through PROPORTIONS and FEATURES, not through realistic rendering: same face proportions, same nose and lip shapes, same eye spacing, same brows, same hair colour and length, same expression. TECHNIQUE Hand-painted gouache and watercolour illustration with soft airbrush shading. Visible fine paper grain over the whole image. The face is painted crisply, with clean delicate linework, defined eyes and soft blush on the cheeks and nose. Clothing and body are blended softly, with gentle gradients instead of hard edges. No harsh black outlines, no cel shading, no vector look. COLOUR PALETTE — strictly limited • background: dusty cornflower blue, flat and slightly muted • accent: warm coral orange, used only for the animal, small details and the seal • secondary: muted sage-olive green, fading into the clothing • clothing and clouds: creamy off-white with pale blue shadows • skin: warm, lightly tanned, with coral blush • hair: deep navy-black with cool blue highlights Nothing outside this palette. No saturated neon, no purple, no brown. COMPOSITION Three-quarter view portrait, waist-up to knee-up, the figure turned slightly away with the head looking back at the viewer. Long hair flowing in soft strands. Oversized loose clothing taken from the uploaded photo, with wide sleeves and heavy folds, drawn in the cream-to-sage gradient. BACKGROUND Behind the figure, a large stylized SPIRIT ANIMAL. CHOOSE the animal yourself so that it fits this particular person's face and mood — a tiger, a crane, a koi carp, a fox, a wolf, a snake, a deer, a phoenix or a dragon. Do not default to a tiger. Whichever animal you choose, paint it the same way: broad flat white body with coral markings, decorative outlines, one bright amber eye, partly hidden behind the person. Around it, stylized swirling clouds in the old Asian manner: rolling spiral shapes in cream white with pale blue outlines. Everything decorative and flat, no realistic depth. POSTER FRAME The illustration sits on a warm off-white paper sheet with a visible margin around it. In the lower right corner of the artwork, a small vertical red seal stamp with white carved marks, like a traditional artist's chop. AVOID: photorealism, a painted-over photograph, realistic skin rendering, rendered bone structure, detailed facial modelling, 3D render, anime, manga, chibi, thick black outlines, harsh cel shading, glossy digital painting, extra colours outside the palette, brand logos and readable text anywhere except the red seal.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789218220360.jpg",
        "htmlCode": "",
        "location": ""
    },
    {
        "id": 1789561124233,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "МУЛЬТИКИ",
        "title": "Doodle style",
        "price": 1,
        "location": "",
        "model": "chatgpt-2.5",
        "prompt": "Turn this photo into a doodle-style character that looks intentionally ugly and funny, similar to a child's crayon drawing. Use a rough black outline like crayon or pencil, with messy scribble coloring.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789561124233.jpg",
        "htmlCode": ""
    },
    {
        "id": 1789567263652,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "ОБЛОЖКИ",
        "title": "Beauty",
        "price": 1,
        "location": "",
        "model": "chatgpt-2.5",
        "prompt": "Used uploaded photo, don’t change a face, don’t distort and keep the face exactly as in the uploaded photo and create a candid snapshot captured on a low-quality disposable camera. Photo-realistic Close-up shot,only macro face shot, black and white, Full, voluminous hair, hair slightly blown by the wind falling across the face, Chin slightly raised ,dreamy gaze, eyes is closed, and she is smiling,voluminous dress, squatting on wet, textured seaside rocks. ,voluminous dress white, The background features a dramatic, large coastal cliff face under a heavily misty, overcast and moody grey sky. The lighting is diffused and natural. The overall atmosphere is cinematic and raw. -—ar 9:16,add more cinematic photo taken on a film camera 85mm",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789567263652.jpg",
        "htmlCode": ""
    },
    {
        "id": 1789570220974,
        "sectionId": 4,
        "sectionTitle": "ПРИМЕРКА",
        "category": "ТОЛСТОВКИ",
        "title": "Men Style",
        "price": 1,
        "location": "Бутик 12а",
        "model": "chatgpt-2.5",
        "prompt": "",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1789570220974.jpg",
        "htmlCode": ""
    },
    {
        "id": 1790102576781,
        "sectionId": 1,
        "sectionTitle": "ФОТО",
        "category": "МУЛЬТИКИ",
        "title": "Draw Style",
        "price": 1,
        "location": "",
        "model": "chatgpt-2.5",
        "resolution": "1K",
        "prompt": "Используй загруженную фотографию как референс. Сохрани узнаваемую внешность человека, причёску, выражение лица, позу, одежду, детёныша животного и исходные цвета.\n\nПерерисуй изображение в виде милого, немного неуклюжего рисунка от руки: сделай голову непропорционально большой и слегка кривоватой, тело — маленьким и забавным, глаза — в виде точек, а черты лица — максимально простыми.\n\nИспользуй тонкие, слегка дрожащие линии чёрной шариковой ручки и небрежные штрихи цветными карандашами. Стиль должен выглядеть намеренно любительским, очаровательно неловким и немного детским, но при этом аккуратным и незахламлённым.\n\nУпрости фон, оставив много свободного пространства и белой бумаги.",
        "img": "https://pegkcclwtwxmngczcqtk.supabase.co/storage/v1/object/public/kiosk-media/templates/tpl_1790102576781.jpg",
        "htmlCode": ""
    }
];

let masterTemplates = [];
try {
    const savedTpls = localStorage.getItem('kiosk_templates_v2');
    if (savedTpls !== null) {
        const parsed = JSON.parse(savedTpls);
        if (Array.isArray(parsed) && parsed.length > 0) {
            masterTemplates = parsed;
        }
    }
} catch(e) {}

if (!Array.isArray(masterTemplates) || masterTemplates.length === 0) {
    masterTemplates = JSON.parse(JSON.stringify(DEFAULT_KIOSK_TEMPLATES));
}

let activeSectionCard = mainCardsConfig.length > 0 ? mainCardsConfig[0] : null;

function normalizeTemplates(tplList, cardsList) {
    if (!Array.isArray(tplList)) return [];
    const cards = cardsList || mainCardsConfig;

    // Полностью удаляем старые стандартные шаблоны и любые шаблоны пригласительных
    const cleanList = tplList.filter(t => {
        if (!t) return false;
        if (isLegacyStandardTemplate(t)) return false;
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
        } else if (modelNorm !== 'seedance-2.5' && modelNorm !== 'omni-flash' && modelNorm !== 'kling-video' && modelNorm !== 'roast-standup' && modelNorm !== 'nano-banana-2') {
            modelNorm = 'chatgpt-2.5';
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

try {
    localStorage.setItem('kiosk_templates_v2', JSON.stringify(masterTemplates));
} catch(e) {}

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
    // Фоновая проверка актуальных шаблонов из Supabase
    if (typeof window.syncCloudConfig === 'function') {
        window.syncCloudConfig();
    }
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
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                masterTemplates = normalizeTemplates(parsed, mainCardsConfig);
            }
        }
    } catch(e) {}

    if (!Array.isArray(masterTemplates) || masterTemplates.length === 0) {
        masterTemplates = JSON.parse(JSON.stringify(DEFAULT_KIOSK_TEMPLATES));
    }

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

    try {
        localStorage.setItem('kiosk_templates_v2', JSON.stringify(masterTemplates));
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

    // AI Modern Progress Bar Elements
    const aiProgressFill = document.getElementById('ai-progress-fill');
    const aiProgressPercent = document.getElementById('ai-progress-percent');
    const aiProgressModelBadge = document.getElementById('ai-progress-model-badge');
    const aiProgressResBadge = document.getElementById('ai-progress-res-badge');
    const aiProcessingMainTitle = document.getElementById('ai-processing-main-title');

    // Контроллер неонового прогресс-бара генерации ИИ
    let aiProgressTimer = null;
    let currentAiProgress = 0;
    let targetAiProgress = 0;

    function resetAiProgress(titleText = 'СОЗДАНИЕ ПОРТРЕТА', modelName = 'chatgpt-2.5', res = '1K') {
        if (aiProgressTimer) {
            clearInterval(aiProgressTimer);
            aiProgressTimer = null;
        }
        currentAiProgress = 0;
        targetAiProgress = 8;

        if (aiProcessingMainTitle) aiProcessingMainTitle.textContent = titleText;
        if (aiProgressFill) aiProgressFill.style.width = '0%';
        if (aiProgressPercent) aiProgressPercent.textContent = '0%';
        if (aiStatusText) aiStatusText.textContent = 'Подготовка кадра...';

        if (aiProgressModelBadge) {
            aiProgressModelBadge.style.display = 'none';
        }
        if (aiProgressResBadge) {
            aiProgressResBadge.style.display = 'none';
        }

        // Плавный интерполятор прогресса с частотой обновления 30ms (плавные 33 fps)
        aiProgressTimer = setInterval(() => {
            if (currentAiProgress < targetAiProgress) {
                const diff = targetAiProgress - currentAiProgress;
                const step = Math.max(0.25, diff * 0.08);
                currentAiProgress = Math.min(targetAiProgress, currentAiProgress + step);
                const displayVal = Math.floor(currentAiProgress);
                if (aiProgressFill) aiProgressFill.style.width = `${currentAiProgress}%`;
                if (aiProgressPercent) aiProgressPercent.textContent = `${displayVal}%`;
            }
        }, 30);
    }

    function setAiProgress(target, status) {
        targetAiProgress = Math.min(95, Math.max(0, target));
        if (status && aiStatusText) {
            aiStatusText.textContent = status;
        }
    }

    async function finishAiProgress() {
        targetAiProgress = 100;
        if (aiStatusText) aiStatusText.textContent = '✨ Готово! Открытие портрета...';

        let timeout = 0;
        while (currentAiProgress < 99 && timeout < 40) {
            await new Promise(r => setTimeout(r, 25));
            timeout++;
        }
        currentAiProgress = 100;
        if (aiProgressFill) aiProgressFill.style.width = '100%';
        if (aiProgressPercent) aiProgressPercent.textContent = '100%';

        await new Promise(r => setTimeout(r, 380));

        if (aiProgressTimer) {
            clearInterval(aiProgressTimer);
            aiProgressTimer = null;
        }
    }

    function stopAiProgress() {
        if (aiProgressTimer) {
            clearInterval(aiProgressTimer);
            aiProgressTimer = null;
        }
    }

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
        syncCloudConfig(); // Обновление при завершении сессии заказа
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

    // 4. СТУДИЙНАЯ ОБРАБОТКА И СОЗДАНИЕ ПОРТРЕТА / ПРОЖАРКА (С СОВРЕМЕННЫМ НЕОНОВЫМ ПРОГРЕСС-БАРОМ)
    async function runAIGeneration() {
        // Проверка: режим Стендап-Прожарки
        const isRoast = selectedStyleModel === 'roast-standup' || (selectedStyle && selectedStyle.toUpperCase().includes('ПРОЖАР'));

        if (isRoast) {
            resetAiProgress('СТЕНДАП-ПРОЖАРКА', 'chatgpt-2.5', '2K');
            const roastStatuses = [
                `Анализ лука и позы перед камерой...`,
                `Сканирование стиля и настроения...`,
                `Подбор остроумного монолога...`,
                `Создание комического шаржа...`,
                `Запись голоса стендап-комика...`
            ];
            let rIdx = 0;
            setAiProgress(15, roastStatuses[0]);
            const rInterval = setInterval(() => {
                rIdx++;
                if (rIdx < roastStatuses.length) {
                    setAiProgress(Math.min(90, 15 + rIdx * 18), roastStatuses[rIdx]);
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
                        await finishAiProgress();

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
                stopAiProgress();
            }
        }

        const genTitle = isTryOnMode ? 'ВИРТУАЛЬНАЯ ПРИМЕРКА' : 'СОЗДАНИЕ ПОРТРЕТА';
        resetAiProgress(genTitle, selectedStyleModel, currentAiResolution);

        const statuses = isTryOnMode ? [
            `Анализ силуэта и позы...`,
            `Подбор размера и примерка кроя...`,
            `Сохранение черт лица и индивидуальности...`,
            `Прорисовка складок ткани и реалистичного света...`
        ] : [
            `Анализ кадра и освещения...`,
            `Создание художественного стиля...`,
            `Прорисовка деталей портрета...`,
            `Финальная цветокоррекция...`
        ];

        let idx = 0;
        setAiProgress(14, statuses[0]);

        const interval = setInterval(() => {
            idx++;
            if (idx < statuses.length) {
                setAiProgress(Math.min(28, 14 + idx * 5), statuses[idx]);
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
                    model: selectedStyleModel || 'chatgpt-2',
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
                        const photoPollStatuses = [
                            `Обработка портрета в высоком качестве...`,
                            `Прорисовка фотореалистичных черт лица...`,
                            `Художественная стилизация и сохранение сходства...`,
                            `Шлифовка реалистичной текстуры и света...`,
                            `Финальная подготовка кадра...`
                        ];
                        const tryOnPollStatuses = [
                            `Примерка одежды на фото...`,
                            `Точная посадка кроя по вашей фигуре...`,
                            `Сохранение черт лица и позы...`,
                            `Прорисовка реалистичной ткани и теней...`,
                            `Финальная подготовка образа...`
                        ];
                        const activePollStatuses = (isTryOnMode || selectedStyleModel === 'nano-banana-2') ? tryOnPollStatuses : photoPollStatuses;
                        let pollIdx = 0;
                        let pollAttempts = 0;
                        const maxPollAttempts = 45; // ~110 секунд
                        setAiProgress(34, activePollStatuses[0]);

                        while (pollAttempts < maxPollAttempts) {
                            await new Promise(r => setTimeout(r, 1500));
                            pollAttempts++;

                            // Плавный рост прогресса на каждом шаге поллинга
                            const pollTarget = Math.min(94, 34 + Math.floor(pollAttempts * 7.5));
                            setAiProgress(pollTarget, activePollStatuses[pollIdx % activePollStatuses.length]);
                            pollIdx++;

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
            stopAiProgress();
        }

        clearInterval(interval);
        // Завершаем заполнение прогресс-бара до 100% с неоновым свечением
        await finishAiProgress();
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
    let lastCloudUpdatedAt = null;
    let isSyncingCloud = false;

    async function syncCloudConfig() {
        if (isSyncingCloud) return;
        isSyncingCloud = true;
        try {
            const res = await fetch(CLOUD_CONFIG_URL + '?_t=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();

                // Если конфиг не менялся, не перерисовываем DOM без необходимости
                if (data.updated_at && lastCloudUpdatedAt === data.updated_at) {
                    return;
                }
                if (data.updated_at) {
                    lastCloudUpdatedAt = data.updated_at;
                }

                if (data.main_header) {
                    mainHeaderConfig = data.main_header;
                    try { localStorage.setItem('kiosk_main_header_v1', JSON.stringify(data.main_header)); } catch(e){}
                }
                if (Array.isArray(data.main_cards) && data.main_cards.length > 0) {
                    mainCardsConfig = normalizeMainCards(data.main_cards);
                    try { localStorage.setItem('kiosk_main_cards_v1', JSON.stringify(mainCardsConfig)); } catch(e){}
                    renderMainCards();
                }

                if (Array.isArray(data.ads_top) && data.ads_top.length > 0) {
                    topPlaylist = data.ads_top;
                    try { localStorage.setItem('kiosk_ads_top', JSON.stringify(data.ads_top)); } catch(e){}
                }
                if (Array.isArray(data.ads_bottom) && data.ads_bottom.length > 0) {
                    bottomPlaylist = data.ads_bottom;
                    try { localStorage.setItem('kiosk_ads_bottom', JSON.stringify(data.ads_bottom)); } catch(e){}
                }
                if (data.attract_timeout) {
                    try { localStorage.setItem('kiosk_attract_timeout', data.attract_timeout); } catch(e){}
                }
                if (Array.isArray(data.templates) && data.templates.length > 0) {
                    masterTemplates = normalizeTemplates(data.templates, mainCardsConfig);
                    try {
                        localStorage.setItem('kiosk_templates_v2', JSON.stringify(masterTemplates));
                    } catch (e) {
                        console.warn('Storage quota warning:', e);
                    }
                    renderGridTemplates();
                    renderCategoryPillsBar();
                }
                if (Array.isArray(data.categories)) {
                    kioskCategories = data.categories;
                    try { localStorage.setItem('kiosk_categories_v2', JSON.stringify(data.categories)); } catch(e){}
                    renderCategoryPillsBar();
                }
                if (data.finik_account_id) {
                    try { localStorage.setItem('kiosk_finik_account_id', data.finik_account_id); } catch(e){}
                }
                if (data.finik_pos_id) {
                    try { localStorage.setItem('kiosk_finik_pos_id', data.finik_pos_id); } catch(e){}
                }
                if (data.finik_merchant_name) {
                    try { localStorage.setItem('kiosk_finik_merchant_name', data.finik_merchant_name); } catch(e){}
                }
                if (data.finik_static_qr) {
                    try { localStorage.setItem('kiosk_finik_static_qr', data.finik_static_qr); } catch(e){}
                }
                if (data.finik_qr_img) {
                    try { localStorage.setItem('kiosk_finik_qr_img', data.finik_qr_img); } catch(e){}
                }
                console.log('☁️ Авто-синхронизация Supabase: обновлены шаблоны и настройки на устройстве (' + (data.templates ? data.templates.length : 0) + ' шт.)');
            }
        } catch(e) {
            console.warn('Cloud config fetch skipped/offline:', e);
        } finally {
            isSyncingCloud = false;
        }
    }
    window.syncCloudConfig = syncCloudConfig;

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
        syncCloudConfig(); // Свежие данные из Supabase прямо при пробуждении киоска
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

    // Авто-синхронизация с Supabase каждые 20 секунд (независимость от киоска и автообновление всех устройств)
    setInterval(() => {
        syncCloudConfig();
    }, 20000);

    // Авто-синхронизация при возвращении фокуса / видимости окна
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) syncCloudConfig();
    });
    window.addEventListener('focus', () => {
        syncCloudConfig();
    });
});
