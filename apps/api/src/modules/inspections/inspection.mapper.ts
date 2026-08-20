import type { Inspection } from '../../generated/prisma/client.ts';
import { formatDateOnly } from '../../lib/dates.ts';

export interface InspectionDTO {
  id: string;
  inspectionDate: string;
  machineId: string;
  defectType: Inspection['defectType'];
  severity: Inspection['severity'];
  remarks: string | null;
  status: Inspection['status'];
  resolutionNote: string | null;
  resolvedAt: string | null;
  source: Inspection['source'];
  clientRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toInspectionDTO(row: Inspection): InspectionDTO {
  return {
    id: row.id,
    inspectionDate: formatDateOnly(row.inspectionDate),
    machineId: row.machineId,
    defectType: row.defectType,
    severity: row.severity,
    remarks: row.remarks,
    status: row.status,
    resolutionNote: row.resolutionNote,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    source: row.source,
    clientRef: row.clientRef,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
