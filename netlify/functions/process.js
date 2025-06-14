// Netlify Functions - タスク処理API
class ShibuTaskAgent {
    constructor() {
        this.userTasks = {}; // ユーザー別タスク管理
        this.nextId = 1;
    }

    getUserTasks(username) {
        if (!this.userTasks[username]) {
            this.userTasks[username] = [];
        }
        return this.userTasks[username];
    }

    getNextId(username) {
        const tasks = this.getUserTasks(username);
        if (!tasks || tasks.length === 0) {
            return 1;
        }
        return Math.max(...tasks.map(task => task.id)) + 1;
    }

    parseDate(text) {
        const datePatterns = [
            /(\d{1,2})月(\d{1,2})日/,
            /(\d{1,2})\/(\d{1,2})/,
            /(\d{4})-(\d{1,2})-(\d{1,2})/,
            /(\d{4})年(\d{1,2})月(\d{1,2})日/
        ];

        const currentYear = new Date().getFullYear();

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                if (match.length === 3) { // 月日のみ
                    const month = parseInt(match[1]);
                    const day = parseInt(match[2]);
                    return `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00`;
                } else if (match.length === 4) { // 年月日
                    const year = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    const day = parseInt(match[3]);
                    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00`;
                }
            }
        }

        // デフォルトは今日から1週間後
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        return defaultDate.toISOString().substring(0, 16);
    }

    extractLinkLabel(text) {
        const linkKeywords = {
            'powerpoint': 'PowerPoint Web',
            'パワーポイント': 'PowerPoint Web',
            'プレゼン': 'PowerPoint Web',
            'スライド': 'PowerPoint Web',
            'word': 'Word Web',
            'ワード': 'Word Web',
            '文書': 'Word Web',
            'excel': 'Excel Web',
            'エクセル': 'Excel Web',
            '表': 'Excel Web',
            'シート': 'Excel Web',
            'outlook': 'Outlook Web',
            'アウトルック': 'Outlook Web',
            'メール': 'Outlook Web',
            '連絡': 'Outlook Web'
        };

        const textLower = text.toLowerCase();
        for (const [keyword, label] of Object.entries(linkKeywords)) {
            if (textLower.includes(keyword)) {
                return label;
            }
        }

        return 'Word Web';
    }

    isTaskCreation(text) {
        const creationKeywords = [
            'タスク', '作業', '仕事', 'やること', 'TODO', 'todo',
            '作成', '作る', '書く', '準備', '用意', '調査', '確認',
            'までに', 'まで', '期限', '締切', '資料', '報告書'
        ];

        return creationKeywords.some(keyword => text.includes(keyword));
    }

    isTaskCompletion(text) {
        const completionKeywords = [
            '完了', '終了', '終わった', '済んだ', '済み', 'できた',
            '終わり', '完成', '提出した', '送った', '提出'
        ];

        return completionKeywords.some(keyword => text.includes(keyword));
    }

    findTaskToComplete(text, username) {
        const tasks = this.getUserTasks(username);
        const incompleteTasks = tasks.filter(task => task.status === '未着手');

        const textLower = text.toLowerCase();
        for (const task of incompleteTasks) {
            const titleLower = task.title.toLowerCase();
            const titleWords = titleLower.split(' ').filter(w => w.length > 2);
            if (titleWords.some(word => textLower.includes(word))) {
                return task;
            }

            const keyTerms = ['営業', '資料', '調査', '報告', '会議', 'データ', '分析', '提案'];
            for (const term of keyTerms) {
                if (titleLower.includes(term) && textLower.includes(term)) {
                    return task;
                }
            }
        }

        return incompleteTasks.length > 0 ? incompleteTasks[incompleteTasks.length - 1] : null;
    }

    extractTitle(text) {
        let cleanedText = text
            .replace(/\d{1,2}月\d{1,2}日/g, '')
            .replace(/\d{4}年\d{1,2}月\d{1,2}日/g, '')
            .replace(/\d{4}-\d{1,2}-\d{1,2}/g, '')
            .replace(/(してください|します|する|です|である)$/g, '')
            .replace(/(まで|までに)$/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanedText || cleanedText.length < 3) {
            const words = text.split(' ');
            const meaningfulWords = words.filter(w => w.length > 1 && !/\d+月\d+日/.test(w));
            if (meaningfulWords.length > 0) {
                cleanedText = meaningfulWords.slice(0, 3).join(' ');
            }
        }

        if (cleanedText.length > 30) {
            cleanedText = cleanedText.substring(0, 30) + "...";
        }

        return cleanedText || "新しいタスク";
    }

    processInput(userInput, username = 'anonymous') {
        const tasks = this.getUserTasks(username);
        
        if (this.isTaskCompletion(userInput)) {
            const taskToComplete = this.findTaskToComplete(userInput, username);
            if (taskToComplete) {
                taskToComplete.status = '完了';
            }
        } else if (this.isTaskCreation(userInput)) {
            const title = this.extractTitle(userInput);
            const dueDate = this.parseDate(userInput);
            const linkLabel = this.extractLinkLabel(userInput);

            const newTask = {
                id: this.getNextId(username),
                title: title,
                due: dueDate,
                link: linkLabel,
                status: '未着手',
                user: username
            };

            tasks.push(newTask);
        }

        return tasks;
    }
}

// Netlify Function エントリーポイント
exports.handler = async (event, context) => {
    // CORS対応
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        const agent = new ShibuTaskAgent();
        
        if (event.httpMethod === 'POST') {
            const { input, user } = JSON.parse(event.body);
            
            if (!input) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Input is required' })
                };
            }

            const username = user || 'anonymous';
            const tasks = agent.processInput(input, username);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    tasks: tasks,
                    processed_input: input
                })
            };
        }

        // GET リクエスト（タスク一覧取得）
        const queryUser = event.queryStringParameters?.user || 'anonymous';
        const userTasks = agent.getUserTasks(queryUser);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(userTasks)
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