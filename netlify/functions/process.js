// Netlify Functions - タスク処理API

// グローバルストレージ（メモリ共有用）
let globalUserTasks = {};

// 高度な日付パーサークラス
class AdvancedDateParser {
    constructor() {
        this.setupPatterns();
    }
    
    setupPatterns() {
        // 時間パターン
        this.timePatterns = [
            { pattern: /午前(\d{1,2})時/, func: (h) => parseInt(h) },
            { pattern: /午後(\d{1,2})時/, func: (h) => parseInt(h) === 12 ? 12 : parseInt(h) + 12 },
            { pattern: /朝(\d{1,2})時/, func: (h) => parseInt(h) },
            { pattern: /昼(\d{1,2})時/, func: (h) => parseInt(h) === 12 ? 12 : parseInt(h) + 12 },
            { pattern: /夜(\d{1,2})時/, func: (h) => parseInt(h) < 12 ? parseInt(h) + 12 : parseInt(h) },
            { pattern: /朝/, func: () => 9 },
            { pattern: /昼/, func: () => 12 },
            { pattern: /午後/, func: () => 15 },
            { pattern: /夕方/, func: () => 17 },
            { pattern: /夜/, func: () => 19 },
            { pattern: /深夜/, func: () => 23 }
        ];
        
        // 数値相対パターン
        this.numericRelativePatterns = [
            { pattern: /(\d+)日後/, func: (d) => parseInt(d) },
            { pattern: /(\d+)週間後/, func: (w) => parseInt(w) * 7 },
            { pattern: /(\d+)ヶ?月後/, func: (m) => parseInt(m) * 30 },  // 概算
            { pattern: /(\d+)年後/, func: (y) => parseInt(y) * 365 }     // 概算
        ];
        
        // 曜日パターン
        this.weekdayMap = {
            '月曜': 0, '火曜': 1, '水曜': 2, '木曜': 3,
            '金曜': 4, '土曜': 5, '日曜': 6
        };
    }
    
    parse(text, baseDate = null) {
        if (!baseDate) baseDate = new Date();
        
        const textLower = text.toLowerCase();
        
        // 段階1: 複合表現の解析
        let result = this.parseComplexExpressions(textLower, baseDate);
        if (result) return result;
        
        // 段階2: 数値相対表現の解析
        result = this.parseNumericRelative(textLower, baseDate);
        if (result) return result;
        
        // 段階3: 期間表現の解析
        result = this.parsePeriods(textLower, baseDate);
        if (result) return result;
        
        // 段階4: 基本相対表現の解析
        result = this.parseBasicRelative(textLower, baseDate);
        if (result) return result;
        
        // 段階5: 曜日表現の解析
        result = this.parseWeekdays(textLower, baseDate);
        if (result) return result;
        
        // 段階6: 絶対日付の解析
        result = this.parseAbsoluteDates(textLower, baseDate);
        if (result) return result;
        
        return null;
    }
    
    parseComplexExpressions(text, baseDate) {
        const patterns = [
            /来週の(\w+)の(\w+)/,
            /今度の(\w+)の(\w+)/,
            /次の(\w+)の(\w+)/
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const weekdayStr = match[1];
                const timeStr = match[2];
                
                // 曜日を取得
                let weekday = null;
                for (const [day, num] of Object.entries(this.weekdayMap)) {
                    if (weekdayStr.includes(day)) {
                        weekday = num;
                        break;
                    }
                }
                
                if (weekday !== null) {
                    // 来週の指定曜日を計算
                    const currentWeekday = baseDate.getDay() === 0 ? 6 : baseDate.getDay() - 1; // 月曜=0に調整
                    let daysAhead = weekday - currentWeekday;
                    
                    if (text.includes('来週') || text.includes('次')) {
                        daysAhead += 7;
                    } else if (daysAhead <= 0) {
                        daysAhead += 7;
                    }
                    
                    const targetDate = new Date(baseDate);
                    targetDate.setDate(baseDate.getDate() + daysAhead);
                    
                    // 時間を設定
                    const hour = this.parseTime(timeStr);
                    targetDate.setHours(hour, 0, 0, 0);
                    
                    return this.formatDateTime(targetDate);
                }
            }
        }
        
        return null;
    }
    
    parseNumericRelative(text, baseDate) {
        for (const { pattern, func } of this.numericRelativePatterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    const days = func(match[1]);
                    const targetDate = new Date(baseDate);
                    targetDate.setDate(baseDate.getDate() + days);
                    
                    // 時間を解析
                    const hour = this.parseTime(text);
                    targetDate.setHours(hour, 0, 0, 0);
                    
                    return this.formatDateTime(targetDate);
                } catch (e) {
                    continue;
                }
            }
        }
        
        return null;
    }
    
    parsePeriods(text, baseDate) {
        // 今週末
        if (text.includes('今週末')) {
            const targetDate = this.getThisWeekend(baseDate);
            const hour = this.parseTime(text);
            targetDate.setHours(hour, 0, 0, 0);
            return this.formatDateTime(targetDate);
        }
        
        // 来週末
        if (text.includes('来週末')) {
            const targetDate = this.getNextWeekend(baseDate);
            const hour = this.parseTime(text);
            targetDate.setHours(hour, 0, 0, 0);
            return this.formatDateTime(targetDate);
        }
        
        // 月末
        if (text.includes('月末') && !text.includes('来月')) {
            const targetDate = this.getMonthEnd(baseDate);
            const hour = this.parseTime(text);
            targetDate.setHours(hour, 0, 0, 0);
            return this.formatDateTime(targetDate);
        }
        
        // 来月末
        if (text.includes('来月末')) {
            const targetDate = this.getNextMonthEnd(baseDate);
            const hour = this.parseTime(text);
            targetDate.setHours(hour, 0, 0, 0);
            return this.formatDateTime(targetDate);
        }
        
        // 年末
        if (text.includes('年末')) {
            const targetDate = new Date(baseDate.getFullYear(), 11, 31);
            const hour = this.parseTime(text);
            targetDate.setHours(hour, 0, 0, 0);
            return this.formatDateTime(targetDate);
        }
        
        // 今月X日
        const thisMonthMatch = text.match(/今月(\d{1,2})日/);
        if (thisMonthMatch) {
            const day = parseInt(thisMonthMatch[1]);
            const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), day);
            const hour = this.parseTime(text);
            targetDate.setHours(hour, 0, 0, 0);
            return this.formatDateTime(targetDate);
        }
        
        // 来月X日
        const nextMonthMatch = text.match(/来月(\d{1,2})日/);
        if (nextMonthMatch) {
            const day = parseInt(nextMonthMatch[1]);
            const nextMonth = baseDate.getMonth() === 11 ? 0 : baseDate.getMonth() + 1;
            const year = baseDate.getMonth() === 11 ? baseDate.getFullYear() + 1 : baseDate.getFullYear();
            const targetDate = new Date(year, nextMonth, day);
            const hour = this.parseTime(text);
            targetDate.setHours(hour, 0, 0, 0);
            return this.formatDateTime(targetDate);
        }
        
        return null;
    }
    
    parseBasicRelative(text, baseDate) {
        const patterns = {
            '今日': 0,
            'きょう': 0,
            '明日': 1,
            'あした': 1,
            'あす': 1,
            '明後日': 2,
            'あさって': 2,
            '来週': 7,
            '再来週': 14,
            '来月': 30  // 概算
        };
        
        for (const [keyword, days] of Object.entries(patterns)) {
            if (text.includes(keyword)) {
                const targetDate = new Date(baseDate);
                targetDate.setDate(baseDate.getDate() + days);
                
                // 時間を解析
                const hour = this.parseTime(text);
                targetDate.setHours(hour, 0, 0, 0);
                
                return this.formatDateTime(targetDate);
            }
        }
        
        return null;
    }
    
    parseWeekdays(text, baseDate) {
        // 「明後日」などの誤認を防ぐ
        if (/明[々後日]+/.test(text)) {
            return null;
        }
        
        for (const [dayName, targetWeekday] of Object.entries(this.weekdayMap)) {
            if (text.includes(dayName)) {
                const currentWeekday = baseDate.getDay() === 0 ? 6 : baseDate.getDay() - 1; // 月曜=0に調整
                let daysAhead = targetWeekday - currentWeekday;
                
                if (text.includes('来週')) {
                    daysAhead += 7;
                } else if (daysAhead <= 0) {
                    daysAhead += 7;
                }
                
                const targetDate = new Date(baseDate);
                targetDate.setDate(baseDate.getDate() + daysAhead);
                
                // 時間を解析
                const hour = this.parseTime(text);
                targetDate.setHours(hour, 0, 0, 0);
                
                return this.formatDateTime(targetDate);
            }
        }
        
        return null;
    }
    
    parseAbsoluteDates(text, baseDate) {
        const patterns = [
            /(\d{1,2})月(\d{1,2})日/,
            /(\d{4})年(\d{1,2})月(\d{1,2})日/,
            /(\d{1,2})\/(\d{1,2})/,
            /(\d{4})-(\d{1,2})-(\d{1,2})/
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    let year, month, day;
                    
                    if (match.length === 3) {  // 月日のみ
                        month = parseInt(match[1]);
                        day = parseInt(match[2]);
                        year = baseDate.getFullYear();
                    } else if (match.length === 4) {  // 年月日
                        year = parseInt(match[1]);
                        month = parseInt(match[2]);
                        day = parseInt(match[3]);
                    }
                    
                    // 妥当性チェック
                    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                        const targetDate = new Date(year, month - 1, day);
                        
                        // 時間を解析
                        const hour = this.parseTime(text);
                        targetDate.setHours(hour, 0, 0, 0);
                        
                        return this.formatDateTime(targetDate);
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        return null;
    }
    
    parseTime(text) {
        for (const { pattern, func } of this.timePatterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    if (match[1]) {
                        return func(match[1]);
                    } else {
                        return func();
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        return 12; // デフォルト
    }
    
    // ヘルパーメソッド
    getThisWeekend(baseDate) {
        const currentDay = baseDate.getDay();
        const daysUntilSaturday = currentDay === 0 ? 6 : 6 - currentDay;
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() + daysUntilSaturday);
        return targetDate;
    }
    
    getNextWeekend(baseDate) {
        const thisWeekend = this.getThisWeekend(baseDate);
        thisWeekend.setDate(thisWeekend.getDate() + 7);
        return thisWeekend;
    }
    
    getMonthEnd(baseDate) {
        return new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    }
    
    getNextMonthEnd(baseDate) {
        return new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0);
    }
    
    formatDateTime(date) {
        return date.toISOString().slice(0, 16);
    }
}

class ShibuTaskAgent {
    constructor() {
        this.userTasks = globalUserTasks; // グローバル変数を参照
        this.nextId = 1;
        this.dateParser = new AdvancedDateParser();
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
        // 高度パーサーを使用
        const result = this.dateParser.parse(text);
        if (result) {
            return result;
        }
        
        // フォールバック：デフォルトは今日から1週間後
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const defaultDate = new Date(today);
        defaultDate.setDate(defaultDate.getDate() + 7);
        return defaultDate.toISOString().substring(0, 16);
    }

    parseRelativeDate(text, baseDate) {
        const textLower = text.toLowerCase();
        const result = new Date(baseDate);

        // 今日・明日・明後日
        if (textLower.includes('今日') || textLower.includes('きょう')) {
            return result.toISOString().substring(0, 16);
        }
        
        if (textLower.includes('明日') || textLower.includes('あした') || textLower.includes('あす')) {
            result.setDate(result.getDate() + 1);
            return result.toISOString().substring(0, 16);
        }
        
        if (textLower.includes('明後日') || textLower.includes('あさって')) {
            result.setDate(result.getDate() + 2);
            return result.toISOString().substring(0, 16);
        }

        // 曜日指定
        const dayOfWeekMatch = this.parseDayOfWeek(text, baseDate);
        if (dayOfWeekMatch) {
            return dayOfWeekMatch;
        }

        // 週単位の指定
        if (textLower.includes('来週') || textLower.includes('らいしゅう')) {
            result.setDate(result.getDate() + 7);
            return result.toISOString().substring(0, 16);
        }

        if (textLower.includes('再来週') || textLower.includes('さらいしゅう')) {
            result.setDate(result.getDate() + 14);
            return result.toISOString().substring(0, 16);
        }

        // 月単位の指定
        if (textLower.includes('来月') || textLower.includes('らいげつ')) {
            result.setMonth(result.getMonth() + 1);
            return result.toISOString().substring(0, 16);
        }

        return null;
    }

    parseDayOfWeek(text, baseDate) {
        const dayNames = {
            '月曜': 1, '月曜日': 1, 'げつよう': 1,
            '火曜': 2, '火曜日': 2, 'かよう': 2,
            '水曜': 3, '水曜日': 3, 'すいよう': 3,
            '木曜': 4, '木曜日': 4, 'もくよう': 4,
            '金曜': 5, '金曜日': 5, 'きんよう': 5,
            '土曜': 6, '土曜日': 6, 'どよう': 6,
            '日曜': 0, '日曜日': 0, 'にちよう': 0
        };

        const textLower = text.toLowerCase();
        
        // より厳密なマッチング - 「明後日」「明日」「明々後日」などが誤認されないように
        for (const [day, targetDay] of Object.entries(dayNames)) {
            // 「明」で始まる単語内での曜日は除外
            const regex = new RegExp(`(^|[^ぁ-ん明後昨々])${day}([^ぁ-んの]|$)`, 'g');
            const hasMinPattern = /明[々後日]+/.test(textLower);
            
            if (regex.test(textLower) && !hasMinPattern) {
                const result = new Date(baseDate);
                const currentDay = result.getDay();
                let daysToAdd = targetDay - currentDay;
                
                // 来週の指定がある場合は7日追加
                if (textLower.includes('来週') || textLower.includes('らいしゅう')) {
                    daysToAdd += 7;
                } else if (daysToAdd <= 0) {
                    // 今週の指定で既に過ぎている場合は来週
                    daysToAdd += 7;
                }
                
                result.setDate(result.getDate() + daysToAdd);
                return result.toISOString().substring(0, 16);
            }
        }

        return null;
    }

    parseAbsoluteDate(text, baseDate) {
        const datePatterns = [
            /(\d{1,2})月(\d{1,2})日/,
            /(\d{1,2})\/(\d{1,2})/,
            /(\d{4})-(\d{1,2})-(\d{1,2})/,
            /(\d{4})年(\d{1,2})月(\d{1,2})日/
        ];

        const currentYear = baseDate.getFullYear();

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                if (match.length === 3) { // 月日のみ
                    const month = parseInt(match[1]);
                    const day = parseInt(match[2]);
                    
                    // 妥当性チェック
                    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                        return `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00`;
                    }
                } else if (match.length === 4) { // 年月日
                    const year = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    const day = parseInt(match[3]);
                    
                    // 妥当性チェック
                    if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00`;
                    }
                }
            }
        }

        return null;
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