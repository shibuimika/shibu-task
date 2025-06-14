#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from shibu_task_agent import ShibuTaskAgent
import json

def test_agent_with_advanced_parser():
    """高度パーサーを使用したShibuTaskAgentのテスト"""
    agent = ShibuTaskAgent()
    
    test_cases = [
        '今日の午後3時までに会議資料を作成する',
        '明日の朝9時までにメールを送信する', 
        '3日後までにレポートを完成させる',
        '来週の月曜の午前中までにプレゼンを準備する',
        '月末までに予算書を提出する',
        '今週末までに買い物をする',
        '6月21日までに企画書を作成する'
    ]
    
    print('=== 高度パーサー使用 ShibuTaskAgent テスト ===')
    
    success_count = 0
    total_count = len(test_cases)
    
    for i, test in enumerate(test_cases, 1):
        print(f'\nテスト {i}: {test}')
        
        try:
            result = agent.process_input(test)
            tasks = json.loads(result)
            
            if tasks:
                latest_task = tasks[-1]
                print(f'  ✅ タイトル: {latest_task["title"]}')
                print(f'     期日: {latest_task["due"]}')
                print(f'     リンク: {latest_task["link"]}')
                success_count += 1
            else:
                print('  ❌ タスク作成失敗')
                
        except Exception as e:
            print(f'  ❌ エラー: {e}')
    
    print(f'\n=== テスト結果 ===')
    print(f'成功: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)')
    
    if success_count == total_count:
        print('🎉 すべてのテストが成功しました！')
    elif success_count >= total_count * 0.8:
        print('✅ 高い成功率を達成しました')
    else:
        print('⚠️  改善が必要です')


if __name__ == "__main__":
    test_agent_with_advanced_parser() 