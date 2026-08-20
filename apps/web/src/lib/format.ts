// Parsed as a calendar day so the date never shifts by timezone.
export function formatDate(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) return dateOnly;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Today in the user's own timezone, the date they'd write down.
export function todayISO(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function daysAgoISO(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function relativeDay(dateOnly: string): string {
  const today = todayISO();
  if (dateOnly === today) return 'Today';
  if (dateOnly === daysAgoISO(1)) return 'Yesterday';

  const diff = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dateOnly}T00:00:00Z`)) / 86_400_000,
  );
  if (diff < 0) return 'Future date';
  if (diff < 30) return `${diff} days ago`;
  const months = Math.round(diff / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}
