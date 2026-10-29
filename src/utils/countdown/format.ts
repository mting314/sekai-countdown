import type { CountdownCharacter, DroughtSeverity } from '~/types/countdown';

export function formatDateShort(ts: number | null | undefined, locale: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (locale.startsWith('ja')) {
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDurationCountdown(msRemaining: number): string {
  const clamped = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(clamped / 86400);
  const hours = Math.floor((clamped % 86400) / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function charDisplayName(c: CountdownCharacter, locale: string, short = false): string {
  if (locale.startsWith('ja')) {
    return short ? c.givenNameJa : c.nameJa;
  }
  return short ? c.givenNameEn : c.nameEn;
}

export function localizedTitle(
  ja: string | undefined,
  en: string | undefined,
  locale: string
): string {
  if (!locale.startsWith('ja') && en) return en;
  return ja || en || '—';
}

export const SEVERITY_PALETTE: Record<
  DroughtSeverity,
  { bg: string; border: string; text: string; bar: string; labelEn: string; labelJa: string }
> = {
  fresh: {
    bg: 'rgba(20, 184, 166, 0.14)',
    border: 'rgba(20, 184, 166, 0.45)',
    text: '#14b8a6',
    bar: '#14b8a6',
    labelEn: 'Fresh',
    labelJa: '直近'
  },
  normal: {
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.38)',
    text: '#0ea5e9',
    bar: '#38bdf8',
    labelEn: 'On Pace',
    labelJa: '通常圏内'
  },
  due: {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.5)',
    text: '#d97706',
    bar: '#f59e0b',
    labelEn: 'Due',
    labelJa: 'そろそろ'
  },
  overdue: {
    bg: 'rgba(249, 115, 22, 0.17)',
    border: 'rgba(249, 115, 22, 0.6)',
    text: '#ea580c',
    bar: '#f97316',
    labelEn: 'Overdue',
    labelJa: '長期未実装'
  },
  record: {
    bg: 'rgba(244, 63, 94, 0.19)',
    border: 'rgba(244, 63, 94, 0.72)',
    text: '#e11d48',
    bar: '#f43f5e',
    labelEn: 'Extreme Drought',
    labelJa: '最長更新級'
  }
};
