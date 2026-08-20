import type { DefectType, Severity, Status } from './types';

export const DEFECT_TYPE_LABELS: Record<DefectType, string> = {
  WEAVE_DEFECT: 'Weave Defect',
  SHADE_VARIATION: 'Shade Variation',
  HOLE_TEAR: 'Hole / Tear',
  COUNT_DEVIATION: 'Count Deviation',
  OTHER: 'Other',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
};

export const STATUS_LABELS: Record<Status, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
};

export const SEVERITY_BADGE: Record<Severity, string> = {
  CRITICAL: 'bg-rose-100 text-rose-800 ring-rose-600/20',
  MAJOR: 'bg-amber-100 text-amber-900 ring-amber-600/25',
  MINOR: 'bg-sky-100 text-sky-800 ring-sky-600/20',
};

export const SEVERITY_RAIL: Record<Severity, string> = {
  CRITICAL: 'bg-rose-500',
  MAJOR: 'bg-amber-500',
  MINOR: 'bg-sky-500',
};

export const STATUS_BADGE: Record<Status, string> = {
  OPEN: 'bg-slate-200 text-slate-800 ring-slate-500/20',
  RESOLVED: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
};
