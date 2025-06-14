#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import calendar

class AdvancedDateParser:
    """高度な日本語日付解析エンジン"""
    
    def __init__(self):
        self.setup_patterns()
    
    def setup_patterns(self):
        """パターンの初期化"""
        # 時間パターン（順序重要：具体的なものから先に）
        self.time_patterns = [
            # 午前・午後（数値付き）を最優先
            (r'午前(\d{1,2})時', lambda h: int(h)),
            (r'午後(\d{1,2})時', lambda h: int(h) + 12 if int(h) < 12 else int(h)),
            (r'朝(\d{1,2})時', lambda h: int(h)),
            (r'昼(\d{1,2})時', lambda h: int(h) + 12 if int(h) != 12 else 12),
            (r'夜(\d{1,2})時', lambda h: int(h) + 12 if int(h) < 12 else int(h)),
            # 数値指定（単体）
            (r'(\d{1,2})時', lambda h: int(h)),
            # 文字指定（順序重要：長いものから先に）
            (r'深夜', lambda: 23),
            (r'午後', lambda: 15),
            (r'夕方', lambda: 17),
            (r'朝', lambda: 9),
            (r'昼', lambda: 12),
            (r'夜', lambda: 19),
        ]
        
        # 数値相対パターン
        self.numeric_relative_patterns = {
            r'(\d+)日後': lambda d: timedelta(days=int(d)),
            r'(\d+)週間後': lambda w: timedelta(weeks=int(w)),
            r'(\d+)ヶ?月後': lambda m: timedelta(days=int(m) * 30),  # 概算
            r'(\d+)年後': lambda y: timedelta(days=int(y) * 365),  # 概算
        }
        
        # 期間パターン
        self.period_patterns = {
            r'今週末': self._get_this_weekend,
            r'来週末': self._get_next_weekend,
            r'月末': self._get_month_end,
            r'来月末': self._get_next_month_end,
            r'年末': self._get_year_end,
            r'来年': self._get_next_year,
            r'今月(\d{1,2})日': self._get_this_month_day,
            r'来月(\d{1,2})日': self._get_next_month_day,
        }
        
        # 曜日パターン（改良版）
        self.weekday_patterns = {
            '月曜': 0, '火曜': 1, '水曜': 2, '木曜': 3,
            '金曜': 4, '土曜': 5, '日曜': 6
        }
    
    def parse(self, text: str, base_date: Optional[datetime] = None) -> Optional[str]:
        """テキストから日時を解析"""
        if base_date is None:
            base_date = datetime.now()
        
        text_lower = text.lower()
        
        # 段階1: 複合表現の解析
        result = self._parse_complex_expressions(text_lower, base_date)
        if result:
            return result
        
        # 段階2: 数値相対表現の解析
        result = self._parse_numeric_relative(text_lower, base_date)
        if result:
            return result
            
        # 段階3: 期間表現の解析
        result = self._parse_periods(text_lower, base_date)
        if result:
            return result
        
        # 段階4: 基本相対表現の解析
        result = self._parse_basic_relative(text_lower, base_date)
        if result:
            return result
            
        # 段階5: 曜日表現の解析（改良版）
        result = self._parse_weekdays_advanced(text_lower, base_date)
        if result:
            return result
        
        # 段階6: 絶対日付の解析
        result = self._parse_absolute_dates(text_lower, base_date)
        if result:
            return result
        
        return None
    
    def _parse_complex_expressions(self, text: str, base_date: datetime) -> Optional[str]:
        """複合表現の解析"""
        # 来週の月曜の午前中
        complex_patterns = [
            r'来週の(\w+)の(\w+)',
            r'今度の(\w+)の(\w+)',
            r'次の(\w+)の(\w+)',
        ]
        
        for pattern in complex_patterns:
            match = re.search(pattern, text)
            if match:
                weekday_str = match.group(1)
                time_str = match.group(2)
                
                # 曜日を取得
                weekday = None
                for day, num in self.weekday_patterns.items():
                    if day in weekday_str:
                        weekday = num
                        break
                
                if weekday is not None:
                    # 来週の指定曜日を計算
                    days_ahead = weekday - base_date.weekday()
                    if '来週' in text or '次' in text:
                        days_ahead += 7
                    elif days_ahead <= 0:
                        days_ahead += 7
                    
                    target_date = base_date + timedelta(days=days_ahead)
                    
                    # 時間を設定
                    hour = self._parse_time(time_str)
                    target_date = target_date.replace(hour=hour, minute=0, second=0, microsecond=0)
                    
                    return target_date.strftime("%Y-%m-%dT%H:%M")
        
        return None
    
    def _parse_numeric_relative(self, text: str, base_date: datetime) -> Optional[str]:
        """数値相対表現の解析"""
        for pattern, calc_func in self.numeric_relative_patterns.items():
            match = re.search(pattern, text)
            if match:
                try:
                    delta = calc_func(match.group(1))
                    target_date = base_date + delta
                    
                    # 時間を解析
                    hour = self._parse_time(text)
                    target_date = target_date.replace(hour=hour, minute=0, second=0, microsecond=0)
                    
                    return target_date.strftime("%Y-%m-%dT%H:%M")
                except Exception as e:
                    print(f"数値相対解析エラー: {e}")
                    continue
        
        return None
    
    def _parse_periods(self, text: str, base_date: datetime) -> Optional[str]:
        """期間表現の解析"""
        for pattern, calc_func in self.period_patterns.items():
            if re.search(pattern, text):
                try:
                    if '今月' in pattern and r'(\d{1,2})日' in pattern:
                        match = re.search(pattern, text)
                        if match:
                            target_date = calc_func(base_date, int(match.group(1)))
                        else:
                            continue
                    elif '来月' in pattern and r'(\d{1,2})日' in pattern:
                        match = re.search(pattern, text)
                        if match:
                            target_date = calc_func(base_date, int(match.group(1)))
                        else:
                            continue
                    else:
                        target_date = calc_func(base_date)
                    
                    # 時間を解析
                    hour = self._parse_time(text)
                    target_date = target_date.replace(hour=hour, minute=0, second=0, microsecond=0)
                    
                    return target_date.strftime("%Y-%m-%dT%H:%M")
                except Exception as e:
                    print(f"期間解析エラー: {e}")
                    continue
        
        return None
    
    def _parse_basic_relative(self, text: str, base_date: datetime) -> Optional[str]:
        """基本相対表現の解析"""
        basic_patterns = {
            '今日': timedelta(days=0),
            'きょう': timedelta(days=0),
            '明日': timedelta(days=1),
            'あした': timedelta(days=1),
            'あす': timedelta(days=1),
            '明後日': timedelta(days=2),
            'あさって': timedelta(days=2),
            '来週': timedelta(weeks=1),
            '再来週': timedelta(weeks=2),
            '来月': timedelta(days=30),  # 概算
        }
        
        for keyword, delta in basic_patterns.items():
            if keyword in text:
                target_date = base_date + delta
                
                # 時間を解析
                hour = self._parse_time(text)
                target_date = target_date.replace(hour=hour, minute=0, second=0, microsecond=0)
                
                return target_date.strftime("%Y-%m-%dT%H:%M")
        
        return None
    
    def _parse_weekdays_advanced(self, text: str, base_date: datetime) -> Optional[str]:
        """改良版曜日解析"""
        # 「明後日」などの誤認を防ぐ
        if re.search(r'明[々後日]+', text):
            return None
        
        for day_name, target_weekday in self.weekday_patterns.items():
            # より厳密なマッチング（単語境界を考慮）
            if day_name in text:
                current_weekday = base_date.weekday()
                days_ahead = target_weekday - current_weekday
                
                if '来週' in text:
                    days_ahead += 7
                elif days_ahead <= 0:
                    days_ahead += 7
                
                target_date = base_date + timedelta(days=days_ahead)
                
                # 時間を解析
                hour = self._parse_time(text)
                target_date = target_date.replace(hour=hour, minute=0, second=0, microsecond=0)
                
                return target_date.strftime("%Y-%m-%dT%H:%M")
        
        return None
    
    def _parse_absolute_dates(self, text: str, base_date: datetime) -> Optional[str]:
        """絶対日付の解析"""
        patterns = [
            r'(\d{1,2})月(\d{1,2})日',
            r'(\d{4})年(\d{1,2})月(\d{1,2})日',
            r'(\d{1,2})/(\d{1,2})',
            r'(\d{4})-(\d{1,2})-(\d{1,2})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                groups = match.groups()
                
                try:
                    if len(groups) == 2:  # 月日のみ
                        month, day = int(groups[0]), int(groups[1])
                        year = base_date.year
                    elif len(groups) == 3:  # 年月日
                        year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                    
                    # 妥当性チェック
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        target_date = datetime(year, month, day)
                        
                        # 時間を解析
                        hour = self._parse_time(text)
                        target_date = target_date.replace(hour=hour, minute=0, second=0, microsecond=0)
                        
                        return target_date.strftime("%Y-%m-%dT%H:%M")
                        
                except ValueError:
                    continue
        
        return None
    
    def _parse_time(self, text: str) -> int:
        """時間を解析（デフォルトは12時）"""
        for pattern, calc_func in self.time_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    if match.groups():
                        return calc_func(match.group(1))
                    else:
                        return calc_func()
                except:
                    continue
        
        return 12  # デフォルト
    
    # 期間計算ヘルパーメソッド
    def _get_this_weekend(self, base_date: datetime) -> datetime:
        """今週末（土曜日）"""
        days_until_saturday = (5 - base_date.weekday()) % 7
        if days_until_saturday == 0 and base_date.weekday() != 5:
            days_until_saturday = 7
        return base_date + timedelta(days=days_until_saturday)
    
    def _get_next_weekend(self, base_date: datetime) -> datetime:
        """来週末（土曜日）"""
        return self._get_this_weekend(base_date) + timedelta(weeks=1)
    
    def _get_month_end(self, base_date: datetime) -> datetime:
        """月末"""
        last_day = calendar.monthrange(base_date.year, base_date.month)[1]
        return base_date.replace(day=last_day)
    
    def _get_next_month_end(self, base_date: datetime) -> datetime:
        """来月末"""
        if base_date.month == 12:
            next_month_date = base_date.replace(year=base_date.year + 1, month=1)
        else:
            next_month_date = base_date.replace(month=base_date.month + 1)
        return self._get_month_end(next_month_date)
    
    def _get_year_end(self, base_date: datetime) -> datetime:
        """年末"""
        return base_date.replace(month=12, day=31)
    
    def _get_next_year(self, base_date: datetime) -> datetime:
        """来年（1月1日）"""
        return base_date.replace(year=base_date.year + 1, month=1, day=1)
    
    def _get_this_month_day(self, base_date: datetime, day: int) -> datetime:
        """今月の指定日"""
        try:
            return base_date.replace(day=day)
        except ValueError:
            # 日付が無効な場合は月末
            return self._get_month_end(base_date)
    
    def _get_next_month_day(self, base_date: datetime, day: int) -> datetime:
        """来月の指定日"""
        try:
            if base_date.month == 12:
                return base_date.replace(year=base_date.year + 1, month=1, day=day)
            else:
                return base_date.replace(month=base_date.month + 1, day=day)
        except ValueError:
            # 日付が無効な場合は来月末
            return self._get_next_month_end(base_date)


# テスト関数
def test_advanced_parser():
    """高度パーサーのテスト"""
    parser = AdvancedDateParser()
    
    test_cases = [
        "今日の午後3時までに",
        "明日の朝9時までに",
        "3日後までに",
        "1週間後までに",
        "今週末までに",
        "月末までに",
        "来週の月曜の午前中までに",
    ]
    
    print("=== 高度日付パーサーテスト ===")
    for test in test_cases:
        result = parser.parse(test)
        print(f"{test} → {result}")


if __name__ == "__main__":
    test_advanced_parser() 