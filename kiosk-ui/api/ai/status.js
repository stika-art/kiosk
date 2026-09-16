// ============================================================
// TRENDUM KIOSK — AI GENERATION STATUS POLLING ENDPOINT
// ============================================================

const SUPABASE_URL = 'https://pegkcclwtwxmngczcqtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZ2tjY2x3dHd4bW5nY3pjcXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjQ3OTksImV4cCI6MjEwNDU0MDc5OX0.AR2bUswLEm5pJ4ORsfQiNqZMlvcp0b5LhZaMr0FtKew';
const SUPABASE_BUCKET = 'kiosk-media';
const KIE_RECORD_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const taskId = req.query.taskId;
    const apiKey = req.query.apiKey || process.env.AI_AGGREGATOR_KEY || process.env.KIE_API_KEY || 'fde11cd9f361b989eb19b8ef8530bfbd';

    if (!taskId) {
        return res.status(400).json({ success: false, error: 'Missing taskId' });
    }

    try {
        // Прямой опрос Kie.ai recordInfo
        const recordRes = await fetch(`${KIE_RECORD_URL}?taskId=${encodeURIComponent(taskId)}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (recordRes.ok) {
            const recordData = await recordRes.json();
            const taskInfo = recordData.data || recordData;
            const state = (taskInfo.state || taskInfo.status || '').toLowerCase();

            if (state === 'success' || state === 'completed') {
                let resultUrls = [];
                if (taskInfo.resultJson) {
                    try {
                        const parsed = typeof taskInfo.resultJson === 'string' ? JSON.parse(taskInfo.resultJson) : taskInfo.resultJson;
                        resultUrls = parsed.resultUrls || parsed.urls || [parsed.url || parsed.video_url];
                    } catch(e) {}
                }
                if ((!resultUrls || resultUrls.length === 0) && taskInfo.response) {
                    resultUrls = taskInfo.response.resultUrls || [taskInfo.response.url];
                }

                const resultUrl = (resultUrls && resultUrls[0]) || taskInfo.video_url || taskInfo.image_url;
                return res.status(200).json({
                    success: true,
                    state: 'success',
                    taskId,
                    resultUrl
                });
            } else if (state === 'fail' || state === 'failed' || state === 'error') {
                return res.status(200).json({
                    success: false,
                    state: 'fail',
                    taskId,
                    error: taskInfo.failMsg || taskInfo.errorMessage || 'Ошибка генерации'
                });
            } else {
                return res.status(200).json({
                    success: true,
                    state: state || 'generating',
                    taskId
                });
            }
        }

        return res.status(200).json({
            success: true,
            state: 'generating',
            taskId
        });
    } catch(err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
