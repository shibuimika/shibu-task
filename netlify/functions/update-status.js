// Netlify Functions - タスクステータス更新API
// グローバルストレージ（process.jsと共有）
let globalUserTasks = {};

exports.handler = async (event, context) => {
    // CORS対応
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { taskId, status, user } = JSON.parse(event.body);
        
        if (!taskId || !status) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'TaskId and status are required' })
            };
        }

        const username = user || 'anonymous';
        
        // ユーザーのタスクを取得
        if (!globalUserTasks[username]) {
            globalUserTasks[username] = [];
        }
        
        const userTasks = globalUserTasks[username];
        const taskIndex = userTasks.findIndex(task => task.id === parseInt(taskId));
        
        if (taskIndex === -1) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Task not found' })
            };
        }

        // ステータス更新
        userTasks[taskIndex].status = status;
        userTasks[taskIndex].updatedAt = new Date().toISOString();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Task status updated successfully',
                task: userTasks[taskIndex],
                allTasks: userTasks
            })
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