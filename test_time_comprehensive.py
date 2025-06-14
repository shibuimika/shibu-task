#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from advanced_date_parser import AdvancedDateParser
from datetime import datetime

def test_time_comprehensive():
    """包括的な時間指定テスト"""
    parser = AdvancedDateParser()
    
    test_cases = [
        # 数値時間指定
        ('明日8時までに', 8),
        ('明日9時までに', 9),
        ('明日12時までに', 12),
        ('明日15時までに', 15),
        ('明日18時までに', 18),
        ('明日21時までに', 21),
        ('明日23時までに', 23),
        
        # 午前・午後指定
        ('明日の午前8時までに', 8),
        ('明日の午前11時までに', 11),
        ('明日の午後1時までに', 13),
        ('明日の午後3時までに', 15),
        ('明日の午後6時までに', 18),
        ('明日の午後11時までに', 23),
        
        # 文字指定
        ('明日の朝までに', 9),
        ('明日の昼までに', 12),
        ('明日の午後までに', 15),
        ('明日の夕方までに', 17),
        ('明日の夜までに', 19),
        ('明日の深夜までに', 23),
        
        # 複合表現
        ('3日後の18時までに', 18),
        ('来週の月曜18時までに', 18),
        ('月末の15時までに', 15),
    ]
    
    print('=== 包括的時間指定テスト ===')
    print(f'基準時刻: {datetime.now().strftime("%Y-%m-%d %H:%M")}')
    print()
    
    success_count = 0
    total_count = len(test_cases)
    
    for i, (test_text, expected_hour) in enumerate(test_cases, 1):
        print(f'テスト {i:2d}: {test_text}')
        
        result = parser.parse(test_text)
        
        if result:
            try:
                parsed_datetime = datetime.fromisoformat(result)
                actual_hour = parsed_datetime.hour
                
                print(f'        → 結果: {parsed_datetime.strftime("%Y-%m-%d %H:%M")}')
                
                if actual_hour == expected_hour:
                    print(f'        → ✅ 時間正常: {actual_hour}時')
                    success_count += 1
                else:
                    print(f'        → ❌ 時間エラー: 期待{expected_hour}時 → 実際{actual_hour}時')
                    
            except Exception as e:
                print(f'        → ❌ 解析エラー: {e}')
        else:
            print(f'        → ❌ 解析失敗')
        
        print()
    
    print(f'=== テスト結果 ===')
    print(f'成功: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)')
    
    if success_count >= total_count * 0.9:
        print('🎉 時間指定機能は優秀です！')
    elif success_count >= total_count * 0.8:
        print('✅ 時間指定機能は良好です')
    else:
        print('⚠️  時間指定機能に改善が必要です')


if __name__ == "__main__":
    test_time_comprehensive() 