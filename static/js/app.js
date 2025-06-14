// ShibuTaskAgent JavaScript

class ShibuTaskApp {
    constructor() {
        console.log('ShibuTaskApp constructor called');  // デバッグ用
        this.recognition = null;
        this.isRecording = false;
        this.init();
    }

    init() {
        console.log('init() called');  // デバッグ用
        this.bindEvents();
        console.log('bindEvents() completed');  // デバッグ用
        this.initSpeechRecognition();
        console.log('initSpeechRecognition() completed');  // デバッグ用
        this.loadTasks();
        console.log('loadTasks() completed');  // デバッグ用
    }

    bindEvents() {
        // 処理実行ボタン
        const processBtn = document.getElementById('processBtn');
        console.log('Binding events - processBtn found:', processBtn !== null);  // デバッグ用
        processBtn.addEventListener('click', () => {
            console.log('Process button clicked');  // デバッグ用
            this.processInput();
        });

        // 音声入力ボタン
        document.getElementById('voiceBtn').addEventListener('click', () => {
            this.toggleVoiceInput();
        });

        // リセットボタン
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetTasks();
        });

        // 更新ボタン
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadTasks();
        });

        // Enterキーで処理実行
        document.getElementById('userInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.processInput();
            }
        });
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.lang = 'ja-JP';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isRecording = true;
                this.updateVoiceButton();
                this.showProcessResult('🎤 音声を聞き取り中です...', 'info');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('userInput').value = transcript;
                this.showProcessResult(`✅ 音声認識完了: "${transcript}"`);
                
                // 音声入力完了後、自動的にタスク処理を実行
                setTimeout(() => {
                    this.showProcessResult('🤖 タスクを作成中...', 'info');
                    this.processInput(true); // 音声入力フラグを true に設定
                }, 1000); // 1秒後に自動処理（ユーザーが結果を確認できるように）
            };

            this.recognition.onerror = (event) => {
                console.error('音声認識エラー:', event.error);
                let errorMessage = '音声認識でエラーが発生しました';
                if (event.error === 'no-speech') {
                    errorMessage = '音声が検出されませんでした。もう一度お試しください';
                } else if (event.error === 'audio-capture') {
                    errorMessage = 'マイクにアクセスできません。マイクの許可を確認してください';
                } else if (event.error === 'not-allowed') {
                    errorMessage = 'マイクの使用が許可されていません。ブラウザの設定を確認してください';
                }
                this.showProcessResult(`❌ ${errorMessage}`, 'error');
                this.isRecording = false;
                this.updateVoiceButton();
            };

            this.recognition.onend = () => {
                this.isRecording = false;
                this.updateVoiceButton();
            };
        } else {
            document.getElementById('voiceBtn').style.display = 'none';
            console.warn('このブラウザは音声認識をサポートしていません');
        }
    }

    toggleVoiceInput() {
        if (!this.recognition) return;

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateVoiceButton() {
        const btn = document.getElementById('voiceBtn');
        const icon = document.getElementById('voiceIcon');
        const text = document.getElementById('voiceText');

        if (this.isRecording) {
            btn.classList.add('voice-recording', 'btn-danger');
            btn.classList.remove('btn-outline-secondary');
            icon.className = 'fas fa-stop me-2';
            text.textContent = '音声入力停止';
        } else {
            btn.classList.remove('voice-recording', 'btn-danger');
            btn.classList.add('btn-outline-secondary');
            icon.className = 'fas fa-microphone me-2';
            text.textContent = '音声入力開始';
        }
    }

        async processInput(isVoiceInput = false) {
        console.log('processInput called, isVoiceInput:', isVoiceInput);  // デバッグ用
        const input = document.getElementById('userInput').value.trim();
        console.log('Input value:', input);  // デバッグ用
        
        if (!input) {
            this.showProcessResult('入力が空です', 'error');
            return;
        }

        const btn = document.getElementById('processBtn');
        btn.classList.add('loading');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>処理中...';

        try {
            console.log('Sending request to API...');  // デバッグ用
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input: input })
            });

            console.log('Response status:', response.status);  // デバッグ用
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);  // デバッグ用

            if (data.success) {
                if (isVoiceInput) {
                    this.showProcessResult(`🎉 音声からタスクが追加されました！ "${data.processed_input}"`);
                } else {
                    this.showProcessResult(`処理完了: "${data.processed_input}"`);
                }
                this.displayTasks(data.tasks);
                document.getElementById('userInput').value = '';
            } else {
                this.showProcessResult(`エラー: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('API Error:', error);
            this.showProcessResult(`通信エラー: ${error.message}`, 'error');
        } finally {
            btn.classList.remove('loading');
            btn.innerHTML = '<i class="fas fa-cogs me-2"></i>処理実行';
        }
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            const tasks = await response.json();
            this.displayTasks(tasks);
        } catch (error) {
            console.error('タスク読み込みエラー:', error);
        }
    }

    async resetTasks() {
        if (!confirm('すべてのタスクをリセットしますか？')) return;

        try {
            const response = await fetch('/api/reset', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                this.showProcessResult('タスクをリセットしました');
                this.loadTasks();
            } else {
                this.showProcessResult(`エラー: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('リセットエラー:', error);
            this.showProcessResult(`リセット中にエラーが発生しました: ${error.message}`, 'error');
        }
    }

         displayTasks(tasks) {
         const container = document.getElementById('tasksList');
         console.log('displayTasks called with:', tasks);  // デバッグ用
         
         if (!tasks || tasks.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-clipboard-list fa-3x mb-3"></i>
                    <p>まだタスクがありません</p>
                    <p class="small">音声入力でタスクを作成してください</p>
                </div>
            `;
            return;
        }

        const tasksHtml = tasks.map(task => this.createTaskCard(task)).join('');
        container.innerHTML = tasksHtml;

        // タスクカードにアニメーションを追加
        container.querySelectorAll('.task-card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('fade-in');
            }, index * 100);
        });
    }

    createTaskCard(task) {
        const statusClass = task.status === '完了' ? 'completed' : 'pending';
        const statusBadgeClass = task.status === '完了' ? 'status-completed' : 'status-pending';
        const linkClass = this.getLinkClass(task.link);
        
        const dueDate = new Date(task.due);
        const formattedDate = dueDate.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="task-card ${statusClass}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <span class="status-badge ${statusBadgeClass}">${task.status}</span>
                </div>
                <div class="task-meta">
                    <div class="mb-2">
                        <i class="fas fa-calendar-alt me-1"></i>
                        期限: ${formattedDate}
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="task-link ${linkClass}">${task.link}</span>
                        <small class="text-muted">ID: ${task.id}</small>
                    </div>
                </div>
            </div>
        `;
    }

    getLinkClass(link) {
        const linkMap = {
            'PowerPoint Web': 'link-powerpoint',
            'Word Web': 'link-word',
            'Excel Web': 'link-excel',
            'Outlook Web': 'link-outlook'
        };
        return linkMap[link] || 'link-word';
    }

    showProcessResult(message, type = 'info') {
        const resultDiv = document.getElementById('processResult');
        const resultText = document.getElementById('resultText');
        const alertDiv = resultDiv.querySelector('.alert');

        resultText.textContent = message;
        
        // アラートクラスを更新
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'info'}`;
        
        resultDiv.style.display = 'block';
        resultDiv.classList.add('slide-in');

        // 3秒後に自動で非表示
        setTimeout(() => {
            resultDiv.style.display = 'none';
            resultDiv.classList.remove('slide-in');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ShibuTaskApp');  // デバッグ用
    try {
        const app = new ShibuTaskApp();
        console.log('ShibuTaskApp initialized successfully');  // デバッグ用
    } catch (error) {
        console.error('Error initializing ShibuTaskApp:', error);  // デバッグ用
    }
});

// サービスワーカー登録（PWA化用、オプション）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful');
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed');
            });
    });
} 