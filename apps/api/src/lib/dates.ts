import { badRequest } from './errors.ts';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Pinned to UTC midnight. Local-time Dates shift the day across the boundary.
export function parseDateOnly(value: string, field = 'date'): Date {
  if (!DATE_ONLY.test(value)) {
    throw badRequest(`${field} must be formatted as YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${field} is not a valid calendar date`);
  }
  return date;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function endOfDayExclusive(value: string, field = 'date'): Date {
  const date = parseDateOnly(value, field);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}
