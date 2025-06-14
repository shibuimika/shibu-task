#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ShibuTaskAgent Web Interface
"""

from flask import Flask, render_template, request, jsonify, Response
from shibu_task_agent import ShibuTaskAgent
import json

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False  # 日本語をUnicodeエスケープしない
agent = ShibuTaskAgent()

@app.route('/')
def index():
    """メインページ"""
    return render_template('index.html')

@app.route('/api/process', methods=['POST'])
def process_input():
    """音声入力を処理"""
    try:
        data = request.get_json()
        user_input = data.get('input', '')
        
        if not user_input:
            return jsonify({'error': 'Input is required'}), 400
        
        # ShibuTaskAgentで処理
        result = agent.process_input(user_input)
        tasks = json.loads(result)
        
        response_data = {
            'success': True,
            'tasks': tasks,
            'processed_input': user_input
        }
        return Response(
            json.dumps(response_data, ensure_ascii=False, indent=2),
            mimetype='application/json',
            headers={'Content-Type': 'application/json; charset=utf-8'}
        )
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """現在のタスク一覧を取得"""
    try:
        result = agent.process_input("")  # 空入力で現在のタスクを取得
        tasks = json.loads(result)
        return Response(
            json.dumps(tasks, ensure_ascii=False, indent=2),
            mimetype='application/json',
            headers={'Content-Type': 'application/json; charset=utf-8'}
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reset', methods=['POST'])
def reset_tasks():
    """タスクをリセット"""
    try:
        global agent
        agent = ShibuTaskAgent()
        return jsonify({'success': True, 'message': 'Tasks reset successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080) 