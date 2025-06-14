#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from shibu_task_agent import ShibuTaskAgent
from datetime import datetime

def test_current_date_issues():
    """現在の日付解析の問題を特定"""
    agent = ShibuTaskAgent()
    
    # 問題のあるケース
    problematic_cases = [
        # 時間指定
        "今日の午後3時までに",
        "明日の朝9時までに", 
        "明後日の夕方までに",
        
        # 週末・平日指定
        "今度の土曜日までに",
        "次の平日までに",
        "今週末までに",
        
        # より自然な表現
        "3日後までに",
        "1週間後までに", 
        "10日後までに",
        
        # 複雑な表現
        "来週の月曜の午前中までに",
        "月末までに",
        "来月の頭までに",
        
        # エッジケース
        "今月25日までに",
        "来年の3月までに",
        "年末までに"
    ]
    
    print("=== 現在の日付解析の問題調査 ===")
    print(f"基準日時: {datetime.now().strftime('%Y年%m月%d日 %H:%M (%A)')}")
    print()
    
    issues = []
    
    for i, test_input in enumerate(problematic_cases, 1):
        print(f"テスト {i}: {test_input}")
        
        try:
            result = agent.process_input(test_input)
            import json
            tasks = json.loads(result)
            
            if tasks:
                latest_task = tasks[-1]
                due_date = datetime.fromisoformat(latest_task['due'].replace('T', ' ').replace(':', ':'))
                print(f"  → 期日: {due_date.strftime('%Y年%m月%d日 %H:%M (%A)')}")
                
                # 問題のチェック
                if "午後3時" in test_input and due_date.hour != 15:
                    issues.append(f"時間指定未対応: {test_input}")
                elif "朝9時" in test_input and due_date.hour != 9:
                    issues.append(f"時間指定未対応: {test_input}")
                elif "3日後" in test_input:
                    expected = datetime.now().date() + datetime.timedelta(days=3)
                    if due_date.date() != expected:
                        issues.append(f"相対日付計算エラー: {test_input}")
                
            else:
                print(f"  → タスク作成失敗")
                issues.append(f"タスク作成失敗: {test_input}")
                
        except Exception as e:
            print(f"  → エラー: {e}")
            issues.append(f"エラー: {test_input} - {e}")
        
        print()
    
    print("=== 検出された問題 ===")
    if issues:
        for issue in issues:
            print(f"❌ {issue}")
    else:
        print("✅ 大きな問題は検出されませんでした")

if __name__ == "__main__":
    test_current_date_issues() 