import { useEffect, useState } from 'react';
import { Button, Field, Input, Select } from './ui';
import { DEFECT_TYPE_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '../lib/labels';
import { DEFECT_TYPES, SEVERITIES, STATUSES, type InspectionFilters } from '../lib/types';

export interface FilterSheetProps {
  open: boolean;
  value: InspectionFilters;
  onClose: () => void;
  onApply: (filters: InspectionFilters) => void;
}

export function FilterSheet({ open, value, onClose, onApply }: FilterSheetProps) {
  if (!open) return null;
  return <FilterSheetContent value={value} onClose={onClose} onApply={onApply} />;
}

function FilterSheetContent({ value, onClose, onApply }: Omit<FilterSheetProps, 'open'>) {
  const [draft, setDraft] = useState<InspectionFilters>(value);

  // Lock the body so the sheet scrolls, not the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const set = <K extends keyof InspectionFilters>(key: K, raw: string) =>
    setDraft((current) => ({
      ...current,
      [key]: raw === '' ? undefined : (raw as InspectionFilters[K]),
      page: 1,
    }));

  const dateRangeInvalid = Boolean(draft.from && draft.to && draft.from > draft.to);

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter inspections"
        className="pb-safe absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-white"
      >
        <div className="sticky top-0 bg-white px-4 pt-3 pb-2">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <Field label="Severity" htmlFor="filter-severity">
            <Select
              id="filter-severity"
              value={draft.severity ?? ''}
              onChange={(event) => set('severity', event.target.value)}
            >
              <option value="">All severities</option>
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {SEVERITY_LABELS[severity]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status" htmlFor="filter-status">
            <Select
              id="filter-status"
              value={draft.status ?? ''}
              onChange={(event) => set('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Defect type" htmlFor="filter-defect">
            <Select
              id="filter-defect"
              value={draft.defectType ?? ''}
              onChange={(event) => set('defectType', event.target.value)}
            >
              <option value="">All defect types</option>
              {DEFECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DEFECT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Machine / line ID" htmlFor="filter-machine" hint="Partial match, e.g. LOOM">
            <Input
              id="filter-machine"
              value={draft.machineId ?? ''}
              onChange={(event) => set('machineId', event.target.value)}
              placeholder="Any machine"
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="From date" htmlFor="filter-from">
              <Input
                id="filter-from"
                type="date"
                value={draft.from ?? ''}
                invalid={dateRangeInvalid}
                onChange={(event) => set('from', event.target.value)}
              />
            </Field>
            <Field
              label="To date"
              htmlFor="filter-to"
              error={dateRangeInvalid ? 'Must be on or after the from date' : undefined}
            >
              <Input
                id="filter-to"
                type="date"
                value={draft.to ?? ''}
                invalid={dateRangeInvalid}
                onChange={(event) => set('to', event.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="pb-safe sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white px-4 py-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              const cleared: InspectionFilters = {
                sortBy: draft.sortBy,
                order: draft.order,
                page: 1,
                limit: draft.limit,
              };
              setDraft(cleared);
              onApply(cleared);
            }}
          >
            Clear all
          </Button>
          <Button fullWidth disabled={dateRangeInvalid} onClick={() => onApply(draft)}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
