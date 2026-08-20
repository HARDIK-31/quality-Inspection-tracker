import { Link } from 'react-router';
import { useSummary } from '../hooks/useInspections';
import { Button, Card, ErrorState, Spinner } from '../components/ui';
import { SEVERITY_LABELS, SEVERITY_RAIL } from '../lib/labels';

export function SummaryPage() {
  const query = useSummary();

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading summary" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : 'Could not load the summary'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { totals, bySeverity } = query.data;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Summary</h1>
        <p className="mt-0.5 text-sm text-slate-500">All inspections across the plant.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <TotalTile label="Open" value={totals.open} tone="text-rose-700" />
        <TotalTile label="Resolved" value={totals.resolved} tone="text-emerald-700" />
        <TotalTile label="Total" value={totals.total} tone="text-slate-900" />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="px-0.5 text-sm font-semibold text-slate-700">By severity</h2>

        {bySeverity.map((row) => {
          const resolvedPct = row.total === 0 ? 0 : Math.round((row.resolved / row.total) * 100);
          return (
            <Card key={row.severity} className="relative overflow-hidden p-4 pl-5">
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 w-1.5 ${SEVERITY_RAIL[row.severity]}`}
              />

              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">
                  {SEVERITY_LABELS[row.severity]}
                </h3>
                <span className="text-sm text-slate-500">{row.total} total</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Stat label="Open" value={row.open} tone="text-rose-700" />
                <Stat label="Resolved" value={row.resolved} tone="text-emerald-700" />
              </div>

              <div className="mt-3">
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
                  role="img"
                  aria-label={`${resolvedPct}% of ${SEVERITY_LABELS[row.severity].toLowerCase()} inspections resolved`}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${resolvedPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{resolvedPct}% resolved</p>
              </div>
            </Card>
          );
        })}
      </section>

      <Link to="/?status=OPEN&severity=CRITICAL&sortBy=inspectionDate&order=desc">
        <Button variant="secondary" fullWidth>
          View open critical inspections
        </Button>
      </Link>
    </div>
  );
}

function TotalTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="px-3 py-4 text-center">
      <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className={`text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
