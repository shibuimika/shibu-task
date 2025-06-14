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
        // ユーザー別タスク取得（process.jsと同期）
        const user = event.queryStringParameters?.user || 'anonymous';
        
        // 一時的にサンプルデータを返却（実際はデータベースから取得）
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