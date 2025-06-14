#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ShibuTaskAgent - タスク管理エージェント
音声入力から文字起こしされたテキストを処理してタスクを管理します。
"""

import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from advanced_date_parser import AdvancedDateParser


class ShibuTaskAgent:
    def __init__(self):
        self.tasks: List[Dict[str, Any]] = []
        self.next_id = 1
        self.date_parser = AdvancedDateParser()
    
    def get_next_id(self) -> int:
        """次のタスクIDを取得"""
        if not self.tasks:
            return 1
        return max(task['id'] for task in self.tasks) + 1
    
    def parse_date(self, text: str) -> Optional[str]:
        """テキストから日付を解析してISO8601形式で返す（高度パーサー使用）"""
        from datetime import timedelta
        
        # 高度パーサーを使用
        result = self.date_parser.parse(text)
        if result:
            return result
        
        # フォールバック：デフォルトは今日から1週間後
        today = datetime.now()
        today = today.replace(hour=12, minute=0, second=0, microsecond=0)
        default_date = today + timedelta(days=7)
        return default_date.strftime("%Y-%m-%dT12:00")
    
    def parse_relative_date(self, text: str, base_date: datetime) -> Optional[str]:
        """相対日付表現を解析"""
        from datetime import timedelta
        
        text_lower = text.lower()
        result = base_date
        
        # 今日・明日・明後日
        if '今日' in text_lower or 'きょう' in text_lower:
            return result.strftime("%Y-%m-%dT12:00")
            
        if '明日' in text_lower or 'あした' in text_lower or 'あす' in text_lower:
            result = result + timedelta(days=1)
            return result.strftime("%Y-%m-%dT12:00")
            
        if '明後日' in text_lower or 'あさって' in text_lower:
            result = result + timedelta(days=2)
            return result.strftime("%Y-%m-%dT12:00")
        
        # 曜日指定
        day_of_week_result = self.parse_day_of_week(text, base_date)
        if day_of_week_result:
            return day_of_week_result
            
        # 週単位の指定
        if '来週' in text_lower or 'らいしゅう' in text_lower:
            result = result + timedelta(days=7)
            return result.strftime("%Y-%m-%dT12:00")
            
        if '再来週' in text_lower or 'さらいしゅう' in text_lower:
            result = result + timedelta(days=14)
            return result.strftime("%Y-%m-%dT12:00")
            
        # 月単位の指定
        if '来月' in text_lower or 'らいげつ' in text_lower:
            if result.month == 12:
                result = result.replace(year=result.year + 1, month=1)
            else:
                result = result.replace(month=result.month + 1)
            return result.strftime("%Y-%m-%dT12:00")
        
        return None
    
    def parse_day_of_week(self, text: str, base_date: datetime) -> Optional[str]:
        """曜日指定を解析"""
        from datetime import timedelta
        import re
        
        day_names = {
            '月曜': 0, '月曜日': 0, 'げつよう': 0,
            '火曜': 1, '火曜日': 1, 'かよう': 1,
            '水曜': 2, '水曜日': 2, 'すいよう': 2,
            '木曜': 3, '木曜日': 3, 'もくよう': 3,
            '金曜': 4, '金曜日': 4, 'きんよう': 4,
            '土曜': 5, '土曜日': 5, 'どよう': 5,
            '日曜': 6, '日曜日': 6, 'にちよう': 6
        }
        
        text_lower = text.lower()
        
        # より厳密なマッチング - 「明後日」「明日」「明々後日」などが誤認されないように
        for day, target_day in day_names.items():
            # 「明」で始まる単語内での曜日は除外
            pattern = r'(^|[^ぁ-ん明後昨々])' + re.escape(day) + r'([^ぁ-んの]|$)'
            has_min_pattern = re.search(r'明[々後日]+', text_lower)
            
            if re.search(pattern, text_lower) and not has_min_pattern:
                result = base_date
                current_day = result.weekday()
                days_to_add = target_day - current_day
                
                # 来週の指定がある場合は7日追加
                if '来週' in text_lower or 'らいしゅう' in text_lower:
                    days_to_add += 7
                elif days_to_add <= 0:
                    # 今週の指定で既に過ぎている場合は来週
                    days_to_add += 7
                
                result = result + timedelta(days=days_to_add)
                return result.strftime("%Y-%m-%dT12:00")
        
        return None
    
    def parse_absolute_date(self, text: str, base_date: datetime) -> Optional[str]:
        """絶対日付表現を解析"""
        date_patterns = [
            r'(\d{1,2})月(\d{1,2})日',
            r'(\d{1,2})/(\d{1,2})',
            r'(\d{4})-(\d{1,2})-(\d{1,2})',
            r'(\d{4})年(\d{1,2})月(\d{1,2})日'
        ]
        
        current_year = base_date.year
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                groups = match.groups()
                if len(groups) == 2:  # 月日のみ
                    month, day = int(groups[0]), int(groups[1])
                    # 妥当性チェック
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        return f"{current_year}-{month:02d}-{day:02d}T12:00"
                elif len(groups) == 3:  # 年月日
                    year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                    # 妥当性チェック
                    if 2020 <= year <= 2030 and 1 <= month <= 12 and 1 <= day <= 31:
                        return f"{year}-{month:02d}-{day:02d}T12:00"
        
        return None
    
    def extract_link_label(self, text: str) -> str:
        """テキストからリンクラベルを抽出"""
        link_keywords = {
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
        }
        
        text_lower = text.lower()
        for keyword, label in link_keywords.items():
            if keyword in text_lower:
                return label
        
        # デフォルトはWord Web
        return 'Word Web'
    
    def is_task_creation(self, text: str) -> bool:
        """新規タスク作成かどうかを判定"""
        creation_keywords = [
            'タスク', '作業', '仕事', 'やること', 'TODO', 'todo',
            '作成', '作る', '書く', '準備', '用意', '調査', '確認',
            'までに', 'まで', '期限', '締切', '資料', '報告書'
        ]
        
        return any(keyword in text for keyword in creation_keywords)
    
    def is_task_completion(self, text: str) -> bool:
        """タスク完了かどうかを判定"""
        completion_keywords = [
            '完了', '終了', '終わった', '済んだ', '済み', 'できた',
            '終わり', '完成', '提出した', '送った', '提出'
        ]
        
        return any(keyword in text for keyword in completion_keywords)
    
    def find_task_to_complete(self, text: str) -> Optional[Dict[str, Any]]:
        """完了対象のタスクを検索"""
        # 未完了のタスクから部分一致で検索
        incomplete_tasks = [task for task in self.tasks if task['status'] == '未着手']
        
        # キーワードベースでマッチング
        text_lower = text.lower()
        for task in incomplete_tasks:
            title_lower = task['title'].lower()
            # タイトルの主要単語がテキストに含まれているかチェック
            title_words = [w for w in title_lower.split() if len(w) > 2]
            if title_words and any(word in text_lower for word in title_words):
                return task
            
            # より柔軟な一致（営業→営業資料など）
            key_terms = ['営業', '資料', '調査', '報告', '会議', 'データ', '分析', '提案']
            for term in key_terms:
                if term in title_lower and term in text_lower:
                    return task
        
        # 見つからない場合は最新の未完了タスクを返す
        if incomplete_tasks:
            return incomplete_tasks[-1]
        
        return None
    
    def process_input(self, user_input: str) -> str:
        """ユーザー入力を処理してJSON形式で結果を返す"""
        if self.is_task_completion(user_input):
            # タスク完了処理
            task_to_complete = self.find_task_to_complete(user_input)
            if task_to_complete:
                task_to_complete['status'] = '完了'
        
        elif self.is_task_creation(user_input):
            # 新規タスク作成
            title = self.extract_title(user_input)
            due_date = self.parse_date(user_input)
            link_label = self.extract_link_label(user_input)
            
            new_task = {
                'id': self.get_next_id(),
                'title': title,
                'due': due_date,
                'link': link_label,
                'status': '未着手'
            }
            
            self.tasks.append(new_task)
        
        # 全タスクをJSON形式で返却
        return json.dumps(self.tasks, ensure_ascii=False, indent=2)
    
    def extract_title(self, text: str) -> str:
        """テキストからタスクタイトルを抽出"""
        # 日付表現を除去
        cleaned_text = re.sub(r'\d{1,2}月\d{1,2}日', '', text)
        cleaned_text = re.sub(r'\d{4}年\d{1,2}月\d{1,2}日', '', cleaned_text)
        cleaned_text = re.sub(r'\d{4}-\d{1,2}-\d{1,2}', '', cleaned_text)
        
        # 不要な語尾を除去
        cleaned_text = re.sub(r'(してください|します|する|です|である)$', '', cleaned_text)
        cleaned_text = re.sub(r'(まで|までに)$', '', cleaned_text)
        
        # 余分な空白を削除
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text.strip())
        
        # 空の場合や短すぎる場合の処理
        if not cleaned_text or len(cleaned_text) < 3:
            # 元のテキストから主要部分を抽出
            words = text.split()
            meaningful_words = [w for w in words if len(w) > 1 and not re.match(r'\d+月\d+日', w)]
            if meaningful_words:
                cleaned_text = ' '.join(meaningful_words[:3])
        
        # 最大30文字に制限
        if len(cleaned_text) > 30:
            cleaned_text = cleaned_text[:30] + "..."
        
        return cleaned_text if cleaned_text else "新しいタスク"


def main():
    """メイン処理（テスト用）"""
    agent = ShibuTaskAgent()
    
    # テスト入力
    test_inputs = [
        "6月17日までに営業資料をパワーポイントで作成してください",
        "顧客データの調査をエクセルで6月14日まで",
        "営業資料の作成が完了しました"
    ]
    
    print("=== ShibuTaskAgent テスト ===")
    for i, input_text in enumerate(test_inputs, 1):
        print(f"\n入力 {i}: {input_text}")
        result = agent.process_input(input_text)
        print(f"出力:\n{result}")


if __name__ == "__main__":
    main() 