// Автоматическая очистка временных медиафайлов гостей из Supabase Storage (старше 12 часов)
// Безопасно очищает только папки: guests/, phone-cam/, tryon/, diag/, tasks/
// НИ В КОЕМ СЛУЧАЕ не удаляет постоянные шаблоны (templates/), одежду (clothes/), конфиги и рекламу!

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'kiosk-media';

// Папки, содержащие исключительно временные файлы гостей
const TEMPORARY_FOLDERS = ['guests', 'phone-cam', 'tryon', 'diag', 'tasks'];

async function cleanupStorage(maxAgeHours = 12) {
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();
    const summary = {
        deletedTotal: 0,
        folders: {},
        errors: []
    };

    for (const folder of TEMPORARY_FOLDERS) {
        try {
            // 1. Получаем список файлов в папке
            const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prefix: folder,
                    limit: 200,
                    sortBy: { column: 'created_at', order: 'asc' }
                })
            });

            if (!listRes.ok) {
                summary.errors.push(`Не удалось получить список ${folder}: HTTP ${listRes.status}`);
                continue;
            }

            const items = await listRes.json();
            if (!Array.isArray(items) || items.length === 0) {
                summary.folders[folder] = 0;
                continue;
            }

            // 2. Отбираем файлы старше порога (по умолчанию 12 часов)
            const expiredFiles = items.filter(item => {
                if (!item || !item.name) return false;
                const createdAt = item.created_at || item.updated_at;
                if (!createdAt) return false;
                const fileAge = now - new Date(createdAt).getTime();
                return fileAge > maxAgeMs;
            });

            if (expiredFiles.length === 0) {
                summary.folders[folder] = 0;
                continue;
            }

            // 3. Формируем массив путей для массового удаления
            const prefixesToDelete = expiredFiles.map(file => `${folder}/${file.name}`);

            // Удаляем пачками по 50 файлов
            let deletedInFolder = 0;
            for (let i = 0; i < prefixesToDelete.length; i += 50) {
                const batch = prefixesToDelete.slice(i, i + 50);
                const delRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prefixes: batch })
                });

                if (delRes.ok) {
                    deletedInFolder += batch.length;
                    summary.deletedTotal += batch.length;
                } else {
                    summary.errors.push(`Ошибка удаления пачки в ${folder}: HTTP ${delRes.status}`);
                }
            }

            summary.folders[folder] = deletedInFolder;
        } catch (err) {
            summary.errors.push(`Исключение при очистке ${folder}: ${err.message}`);
        }
    }

    return summary;
}

module.exports = async (req, res) => {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const queryAge = req.query?.hours ? parseFloat(req.query.hours) : null;
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const maxAgeHours = queryAge || body.maxAgeHours || 12;

        console.log(`[Storage Cleanup] Запуск автоматической очистки медиа старше ${maxAgeHours} часов...`);
        const result = await cleanupStorage(maxAgeHours);
        console.log(`[Storage Cleanup] Успешно удалено ${result.deletedTotal} старых файлов.`, result.folders);

        return res.status(200).json({
            success: true,
            message: `Удалено ${result.deletedTotal} медиафайлов старше ${maxAgeHours} часов`,
            thresholdHours: maxAgeHours,
            result,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('[Storage Cleanup Error]', err);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

module.exports.cleanupStorage = cleanupStorage;
