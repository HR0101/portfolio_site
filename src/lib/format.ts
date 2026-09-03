// 日時フォーマット用ユーティリティ

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

// ISO 日時文字列を「◯分前」「◯日前」のような相対表記に変換する
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < MS_PER_MINUTE) {
    return 'たった今';
  }
  if (diffMs < MS_PER_HOUR) {
    return `${Math.floor(diffMs / MS_PER_MINUTE)}分前`;
  }
  if (diffMs < MS_PER_DAY) {
    return `${Math.floor(diffMs / MS_PER_HOUR)}時間前`;
  }

  const diffDays = Math.floor(diffMs / MS_PER_DAY);
  if (diffDays < DAYS_PER_MONTH) {
    return `${diffDays}日前`;
  }
  if (diffDays < DAYS_PER_YEAR) {
    return `${Math.floor(diffDays / DAYS_PER_MONTH)}ヶ月前`;
  }
  return `${Math.floor(diffDays / DAYS_PER_YEAR)}年前`;
}
