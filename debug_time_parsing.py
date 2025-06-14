#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from advanced_date_parser import AdvancedDateParser
from datetime import datetime

def debug_time_parsing():
    """時間解析のデバッグ"""
    parser = AdvancedDateParser()
    
    test_cases = [
        '3日後18時までに',
        '明日の18時までに', 
        '今日の18時までに',
        '来週の月曜18時までに',
        '明日の19時までに',  
        '3日後の20時までに',
        '明後日21時までに'
    ]
    
    print('=== 時間指定デバッグテスト ===')
    print(f'基準時刻: {datetime.now().strftime("%Y-%m-%d %H:%M")}')
    print()
    
    for i, test in enumerate(test_cases, 1):
        print(f'テスト {i}: {test}')
        result = parser.parse(test)
        
        if result:
            parsed_datetime = datetime.fromisoformat(result)
            print(f'  結果: {result}')
            print(f'  時刻: {parsed_datetime.strftime("%H:%M")}')
            
            # 期待される時間をチェック
            if '18時' in test:
                expected_hour = 18
                actual_hour = parsed_datetime.hour
                if actual_hour != expected_hour:
                    print(f'  ❌ 時間エラー: 期待{expected_hour}時 → 実際{actual_hour}時')
                else:
                    print(f'  ✅ 時間正常: {actual_hour}時')
            elif '19時' in test:
                expected_hour = 19
                actual_hour = parsed_datetime.hour
                if actual_hour != expected_hour:
                    print(f'  ❌ 時間エラー: 期待{expected_hour}時 → 実際{actual_hour}時')
                else:
                    print(f'  ✅ 時間正常: {actual_hour}時')
        else:
            print(f'  ❌ 解析失敗')
        
        print()
    
    # パターンマッチングのテスト
    print('=== パターンマッチング詳細テスト ===')
    test_text = '3日後18時までに'
    print(f'テキスト: {test_text}')
    
    # 時間パターンを個別テスト
    import re
    patterns = [
        r'(\d{1,2})時',
        r'午前(\d{1,2})時',
        r'午後(\d{1,2})時',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, test_text)
        if match:
            print(f'  マッチ: {pattern} → {match.group()}')
        else:
            print(f'  非マッチ: {pattern}')


if __name__ == "__main__":
    debug_time_parsing() 