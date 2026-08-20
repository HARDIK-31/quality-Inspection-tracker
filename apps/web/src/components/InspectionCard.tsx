import { Link } from 'react-router';
import { Badge } from './ui';
import {
  DEFECT_TYPE_LABELS,
  SEVERITY_BADGE,
  SEVERITY_LABELS,
  SEVERITY_RAIL,
  STATUS_BADGE,
  STATUS_LABELS,
} from '../lib/labels';
import { formatDate, relativeDay } from '../lib/format';
import type { Inspection } from '../lib/types';

export function InspectionCard({ inspection }: { inspection: Inspection }) {
  return (
    <Link
      to={`/inspections/${inspection.id}`}
      className="relative flex gap-3 overflow-hidden rounded-2xl bg-white p-3 pl-4 shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 ${SEVERITY_RAIL[inspection.severity]}`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-base font-semibold text-slate-900">{inspection.machineId}</p>
          <Badge className={STATUS_BADGE[inspection.status]}>
            {STATUS_LABELS[inspection.status]}
          </Badge>
        </div>

        <p className="mt-0.5 truncate text-sm text-slate-600">
          {DEFECT_TYPE_LABELS[inspection.defectType]}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge className={SEVERITY_BADGE[inspection.severity]}>
            {SEVERITY_LABELS[inspection.severity]}
          </Badge>
          <span className="text-xs text-slate-500">
            {formatDate(inspection.inspectionDate)} · {relativeDay(inspection.inspectionDate)}
          </span>
          {inspection.source === 'SAP_WEBHOOK' && (
            <Badge className="bg-violet-100 text-violet-800 ring-violet-600/20">SAP</Badge>
          )}
        </div>

        {inspection.remarks && (
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">{inspection.remarks}</p>
        )}
      </div>
    </Link>
  );
}
