import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useInspection, useResolveInspection } from '../hooks/useInspections';
import { Badge, Button, Card, ErrorState, Field, Spinner, Textarea } from '../components/ui';
import {
  DEFECT_TYPE_LABELS,
  SEVERITY_BADGE,
  SEVERITY_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
} from '../lib/labels';
import { formatDate, formatDateTime } from '../lib/format';

export function InspectionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const query = useInspection(id);
  const resolve = useResolveInspection(id);

  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading inspection" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex flex-col gap-3">
        <ErrorState
          message={query.error instanceof Error ? query.error.message : 'Inspection not found'}
          onRetry={() => void query.refetch()}
        />
        <Link to="/">
          <Button variant="secondary" fullWidth>
            Back to inspections
          </Button>
        </Link>
      </div>
    );
  }

  const inspection = query.data;

  const submitResolution = async () => {
    const trimmed = note.trim();
    if (trimmed.length === 0) {
      setNoteError('A resolution note is required before closing this inspection.');
      return;
    }
    setNoteError(null);
    try {
      await resolve.mutateAsync(trimmed);
      setResolving(false);
      setNote('');
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Could not resolve the inspection.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => void navigate(-1)}
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1 px-2 text-sm font-medium text-slate-600"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{inspection.machineId}</h1>
          <Badge className={STATUS_BADGE[inspection.status]}>
            {STATUS_LABELS[inspection.status]}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge className={SEVERITY_BADGE[inspection.severity]}>
            {SEVERITY_LABELS[inspection.severity]}
          </Badge>
          {inspection.source === 'SAP_WEBHOOK' && (
            <Badge className="bg-violet-100 text-violet-800 ring-violet-600/20">
              Created by SAP
            </Badge>
          )}
        </div>

        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <Row label="Defect type" value={DEFECT_TYPE_LABELS[inspection.defectType]} />
          <Row label="Date found" value={formatDate(inspection.inspectionDate)} />
          <Row label="Remarks" value={inspection.remarks ?? '—'} />
          <Row label="Logged at" value={formatDateTime(inspection.createdAt)} />
          {inspection.resolvedAt && (
            <Row label="Resolved at" value={formatDateTime(inspection.resolvedAt)} />
          )}
        </dl>
      </Card>

      {inspection.status === 'RESOLVED' && inspection.resolutionNote && (
        <Card className="border-l-4 border-emerald-500 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Resolution note</h2>
          <p className="mt-1 text-sm whitespace-pre-wrap text-slate-700">
            {inspection.resolutionNote}
          </p>
        </Card>
      )}

      {inspection.status === 'OPEN' && !resolving && (
        <Button fullWidth onClick={() => setResolving(true)}>
          Mark as resolved
        </Button>
      )}

      {inspection.status === 'OPEN' && resolving && (
        <Card className="flex flex-col gap-3 p-4">
          <Field
            label="Resolution note"
            htmlFor="resolutionNote"
            required
            error={noteError ?? undefined}
            hint="What was done to fix it? This is stored permanently."
          >
            <Textarea
              id="resolutionNote"
              rows={4}
              autoFocus
              value={note}
              invalid={Boolean(noteError)}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Reed replaced, loom re-qualified on a 50m trial run."
            />
          </Field>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setResolving(false);
                setNoteError(null);
              }}
            >
              Cancel
            </Button>
            <Button fullWidth disabled={resolve.isPending} onClick={() => void submitResolution()}>
              {resolve.isPending ? 'Saving…' : 'Confirm resolved'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="whitespace-pre-wrap text-slate-900">{value}</dd>
    </div>
  );
}
