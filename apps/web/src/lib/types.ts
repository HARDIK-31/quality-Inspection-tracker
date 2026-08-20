export const DEFECT_TYPES = [
  'WEAVE_DEFECT',
  'SHADE_VARIATION',
  'HOLE_TEAR',
  'COUNT_DEVIATION',
  'OTHER',
] as const;

export const SEVERITIES = ['CRITICAL', 'MAJOR', 'MINOR'] as const;
export const STATUSES = ['OPEN', 'RESOLVED'] as const;

export type DefectType = (typeof DEFECT_TYPES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type Status = (typeof STATUSES)[number];
export type Source = 'MANUAL' | 'SAP_WEBHOOK';

export interface Inspection {
  id: string;
  inspectionDate: string;
  machineId: string;
  defectType: DefectType;
  severity: Severity;
  remarks: string | null;
  status: Status;
  resolutionNote: string | null;
  resolvedAt: string | null;
  source: Source;
  clientRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InspectionListResponse {
  data: Inspection[];
  pagination: Pagination;
}

export interface SeveritySummaryRow {
  severity: Severity;
  open: number;
  resolved: number;
  total: number;
}

export interface Summary {
  totals: { open: number; resolved: number; total: number };
  bySeverity: SeveritySummaryRow[];
}

export interface AuthUser {
  sub: string;
  username: string;
  displayName: string;
}

export interface InspectionFilters {
  status?: Status;
  severity?: Severity;
  defectType?: DefectType;
  machineId?: string;
  from?: string;
  to?: string;
  sortBy?: 'inspectionDate' | 'createdAt' | 'severity' | 'machineId';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateInspectionInput {
  inspectionDate: string;
  machineId: string;
  defectType: DefectType;
  severity: Severity;
  remarks?: string | null;
}
