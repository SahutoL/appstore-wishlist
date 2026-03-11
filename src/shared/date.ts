import type { DateDisplayFormat } from './models.js';

function formatRelativeDate(parsed: number): string {
  const diffMs = parsed - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) {
    return 'たった今';
  }

  if (absMinutes < 60) {
    return `${absMinutes} 分${diffMinutes < 0 ? '前' : '後'}`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);
  if (absHours < 24) {
    return `${absHours} 時間${diffHours < 0 ? '前' : '後'}`;
  }

  const diffDays = Math.round(diffHours / 24);
  const absDays = Math.abs(diffDays);
  return `${absDays} 日${diffDays < 0 ? '前' : '後'}`;
}

export function formatDateTime(
  value: string | null,
  format: DateDisplayFormat = 'datetime'
): string {
  if (!value) {
    return '-';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return '-';
  }

  if (format === 'relative') {
    return formatRelativeDate(parsed);
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: format === 'date' ? 'medium' : 'medium',
    timeStyle: format === 'date' ? undefined : 'short'
  }).format(new Date(parsed));
}
