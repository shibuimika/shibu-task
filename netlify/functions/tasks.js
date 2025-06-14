// Netlify Functions - タスク一覧取得API
exports.handler = async (event, context) => {
    // CORS対応
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json; charset=utf-8'
    };

    // OPTIONS リクエスト（CORS preflight）
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // 一時的にローカルストレージから取得（実際はデータベースを使用）
        // ここではサンプルデータを返却
        const sampleTasks = [];
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(sampleTasks)
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
}; 