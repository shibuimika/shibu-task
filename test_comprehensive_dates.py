#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from advanced_date_parser import AdvancedDateParser
from datetime import datetime

def test_comprehensive_dates():
    """包括的な日付解析テスト"""
    parser = AdvancedDateParser()
    
    test_cases = [
        # 基本相対表現
        "今日までに",
        "明日までに", 
        "明後日までに",
        
        # 時間指定
        "今日の午後3時までに",
        "明日の朝9時までに",
        "明後日の夕方までに",
        
        # 数値相対表現
        "3日後までに",
        "1週間後までに",
        "10日後までに",
        "2ヶ月後までに",
        
        # 曜日指定
        "月曜までに",
        "火曜日までに",
        "来週の水曜までに",
        
        # 期間指定
        "今週末までに",
        "来週末までに",
        "月末までに",
        "来月末までに",
        "年末までに",
        
        # 複合表現
        "来週の月曜の午前中までに",
        "今度の土曜の夜までに",
        
        # 月日指定
        "今月25日までに",
        "来月15日までに",
        "6月21日までに",
        "2025年12月31日までに",
        
        # エラーケース
        "明後日の日曜までに",  # 明後日の誤認テスト
        "無効な日付",
    ]
    
    print(f"=== 包括的日付解析テスト ===")
    print(f"基準日時: {datetime.now().strftime('%Y年%m月%d日 %H:%M (%A)')}")
    print()
    
    success_count = 0
    total_count = len(test_cases)
    
    for i, test_input in enumerate(test_cases, 1):
        print(f"テスト {i:2d}: {test_input}")
        
        result = parser.parse(test_input)
        
        if result:
            try:
                parsed_date = datetime.fromisoformat(result)
                formatted_date = parsed_date.strftime('%Y年%m月%d日 %H:%M (%A)')
                print(f"      → ✅ {formatted_date}")
                success_count += 1
                
                # 追加検証
                if "午後3時" in test_input and parsed_date.hour != 15:
                    print(f"      ⚠️  時間指定エラー（期待:15時、実際:{parsed_date.hour}時）")
                elif "朝9時" in test_input and parsed_date.hour != 9:
                    print(f"      ⚠️  時間指定エラー（期待:9時、実際:{parsed_date.hour}時）")
                elif "3日後" in test_input:
                    from datetime import timedelta
                    expected_date = datetime.now().date() + timedelta(days=3)
                    if parsed_date.date() != expected_date:
                        print(f"      ⚠️  日付計算エラー（期待:{expected_date}、実際:{parsed_date.date()}）")
                
            except Exception as e:
                print(f"      → ❌ 解析エラー: {e}")
        else:
            print(f"      → ❌ 解析失敗")
        
        print()
    
    print(f"=== テスト結果 ===")
    print(f"成功: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)")
    
    if success_count >= total_count * 0.8:
        print("✅ 高度日付パーサーの性能は良好です")
    else:
        print("⚠️  改善が必要な項目があります")


if __name__ == "__main__":
    test_comprehensive_dates() 