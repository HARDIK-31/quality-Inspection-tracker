import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useInspectionList } from '../hooks/useInspections';
import { InspectionCard } from '../components/InspectionCard';
import { FilterSheet } from '../components/FilterSheet';
import { Badge, Button, EmptyState, ErrorState, Select, Spinner } from '../components/ui';
import { DEFECT_TYPE_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '../lib/labels';
import { formatDate } from '../lib/format';
import type { InspectionFilters } from '../lib/types';

const SORT_OPTIONS = [
  { value: 'inspectionDate:desc', label: 'Newest first' },
  { value: 'inspectionDate:asc', label: 'Oldest first' },
  { value: 'severity:asc', label: 'Most severe first' },
  { value: 'severity:desc', label: 'Least severe first' },
  { value: 'machineId:asc', label: 'Machine A–Z' },
  { value: 'createdAt:desc', label: 'Recently logged' },
] as const;

const PAGE_SIZE = 20;

// Filters live in the URL so views are shareable and back works properly.
function parseFilters(params: URLSearchParams): InspectionFilters {
  const get = (key: string) => params.get(key) ?? undefined;
  return {
    status: get('status') as InspectionFilters['status'],
    severity: get('severity') as InspectionFilters['severity'],
    defectType: get('defectType') as InspectionFilters['defectType'],
    machineId: get('machineId'),
    from: get('from'),
    to: get('to'),
    sortBy: (get('sortBy') as InspectionFilters['sortBy']) ?? 'inspectionDate',
    order: (get('order') as InspectionFilters['order']) ?? 'desc',
    page: Number(get('page') ?? 1),
    limit: PAGE_SIZE,
  };
}

function toSearchParams(filters: InspectionFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'limit') continue;
    if (value === undefined || value === null || value === '') continue;
    if (key === 'page' && value === 1) continue;
    params.set(key, String(value));
  }
  return params;
}

export function ListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = useInspectionList(filters);

  const activeChips = buildChips(filters);
  const update = (next: InspectionFilters) => setSearchParams(toSearchParams(next));

  const pagination = query.data?.pagination;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => setFilterOpen(true)}
          className="shrink-0"
          aria-haspopup="dialog"
        >
          <FilterIcon />
          Filters
          {activeChips.length > 0 && (
            <span className="ml-0.5 rounded-full bg-slate-900 px-1.5 text-xs font-bold text-white">
              {activeChips.length}
            </span>
          )}
        </Button>

        <label className="sr-only" htmlFor="sort">
          Sort inspections
        </label>
        <Select
          id="sort"
          className="min-w-0 flex-1"
          value={`${filters.sortBy}:${filters.order}`}
          onChange={(event) => {
            const [sortBy, order] = event.target.value.split(':');
            update({
              ...filters,
              sortBy: sortBy as InspectionFilters['sortBy'],
              order: order as InspectionFilters['order'],
              page: 1,
            });
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <Badge key={chip.key} className="bg-slate-200 text-slate-800 ring-slate-400/30">
              {chip.label}
            </Badge>
          ))}
          <button
            type="button"
            onClick={() =>
              update({ sortBy: filters.sortBy, order: filters.order, page: 1, limit: PAGE_SIZE })
            }
            className="rounded-full px-2 py-0.5 text-xs font-semibold text-slate-600 underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs text-slate-500">
          {query.isLoading ? (
            <Spinner label="Loading inspections" />
          ) : pagination ? (
            `${pagination.total} inspection${pagination.total === 1 ? '' : 's'}`
          ) : null}
        </p>
        {query.isFetching && !query.isLoading && <Spinner label="Refreshing" />}
      </div>

      {query.isError && (
        <ErrorState
          message={
            query.error instanceof Error ? query.error.message : 'Could not load inspections'
          }
          onRetry={() => void query.refetch()}
        />
      )}

      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title={activeChips.length > 0 ? 'No matching inspections' : 'No inspections yet'}
          description={
            activeChips.length > 0
              ? 'Try widening the date range or clearing a filter.'
              : 'Log the first defect you find on the floor and it will appear here.'
          }
          action={
            <Link to="/new">
              <Button>Log an inspection</Button>
            </Link>
          }
        />
      )}

      <div className="flex flex-col gap-2">
        {query.data?.data.map((inspection) => (
          <InspectionCard key={inspection.id} inspection={inspection} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={pagination.page <= 1}
            onClick={() => update({ ...filters, page: pagination.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => update({ ...filters, page: pagination.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      <Link
        to="/new"
        className="fixed right-4 bottom-20 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-slate-900 pr-5 pl-4 font-semibold text-white shadow-lg active:bg-slate-950"
      >
        <PlusIcon />
        Log
      </Link>

      <FilterSheet
        open={filterOpen}
        value={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          update(next);
          setFilterOpen(false);
        }}
      />
    </div>
  );
}

function buildChips(filters: InspectionFilters): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  if (filters.severity) chips.push({ key: 'severity', label: SEVERITY_LABELS[filters.severity] });
  if (filters.status) chips.push({ key: 'status', label: STATUS_LABELS[filters.status] });
  if (filters.defectType)
    chips.push({ key: 'defectType', label: DEFECT_TYPE_LABELS[filters.defectType] });
  if (filters.machineId) chips.push({ key: 'machineId', label: `Machine: ${filters.machineId}` });
  if (filters.from || filters.to) {
    const from = filters.from ? formatDate(filters.from) : 'Any';
    const to = filters.to ? formatDate(filters.to) : 'Any';
    chips.push({ key: 'dates', label: `${from} → ${to}` });
  }
  return chips;
}

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M7 12h10M11 18h2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
