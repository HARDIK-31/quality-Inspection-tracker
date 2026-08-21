import type { Prisma } from '../../generated/prisma/client.ts';
import { prisma } from '../../prisma.ts';
import { conflict, notFound } from '../../lib/errors.ts';
import { endOfDayExclusive, parseDateOnly } from '../../lib/dates.ts';
import { toInspectionDTO, type InspectionDTO } from './inspection.mapper.ts';
import type {
  CreateInspectionInput,
  ListInspectionsQuery,
  ResolveInspectionInput,
} from './inspection.schemas.ts';

export function normaliseMachineId(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

export interface CreateOptions {
  source?: 'MANUAL' | 'SAP_WEBHOOK';
  sapPayload?: Prisma.InputJsonValue;
  clientRef?: string | null;
}

export interface CreateResult {
  inspection: InspectionDTO;
  created: boolean;
}

export async function createInspection(
  input: CreateInspectionInput,
  options: CreateOptions = {},
): Promise<CreateResult> {
  const clientRef = options.clientRef ?? null;

  // Replayed webhook delivery, return what we already have.
  if (clientRef) {
    const existing = await prisma.inspection.findUnique({ where: { clientRef } });
    if (existing) {
      return { inspection: toInspectionDTO(existing), created: false };
    }
  }

  const data: Prisma.InspectionCreateInput = {
    inspectionDate: parseDateOnly(input.inspectionDate, 'inspectionDate'),
    machineId: normaliseMachineId(input.machineId),
    defectType: input.defectType,
    severity: input.severity,
    remarks: input.remarks ?? null,
    source: options.source ?? 'MANUAL',
    clientRef,
    ...(options.sapPayload ? { sapPayload: options.sapPayload } : {}),
  };

  const row = await prisma.inspection.create({ data });
  return { inspection: toInspectionDTO(row), created: true };
}

export interface ListResult {
  data: InspectionDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listInspections(query: ListInspectionsQuery): Promise<ListResult> {
  const where = buildWhere(query);

  // Enum is declared CRITICAL, MAJOR, MINOR so asc sorts by urgency.
  const orderBy: Prisma.InspectionOrderByWithRelationInput[] = [{ [query.sortBy]: query.order }];
  if (query.sortBy !== 'createdAt') {
    orderBy.push({ createdAt: 'desc' });
  }

  const [total, rows] = await Promise.all([
    prisma.inspection.count({ where }),
    prisma.inspection.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    data: rows.map(toInspectionDTO),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

function buildWhere(query: ListInspectionsQuery): Prisma.InspectionWhereInput {
  const where: Prisma.InspectionWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.severity) where.severity = query.severity;
  if (query.defectType) where.defectType = query.defectType;
  if (query.machineId) {
    where.machineId = { contains: normaliseMachineId(query.machineId) };
  }

  // Filters on when the defect happened, not when it was entered.
  if (query.from || query.to) {
    where.inspectionDate = {
      ...(query.from ? { gte: parseDateOnly(query.from, 'from') } : {}),
      ...(query.to ? { lt: endOfDayExclusive(query.to, 'to') } : {}),
    };
  }

  return where;
}

export async function getInspection(id: string): Promise<InspectionDTO> {
  const row = await prisma.inspection.findUnique({ where: { id } });
  if (!row) throw notFound(`No inspection with id ${id}`);
  return toInspectionDTO(row);
}

export async function resolveInspection(
  id: string,
  input: ResolveInspectionInput,
): Promise<InspectionDTO> {
  const existing = await prisma.inspection.findUnique({ where: { id } });
  if (!existing) throw notFound(`No inspection with id ${id}`);

  if (existing.status === 'RESOLVED') {
    throw conflict('This inspection has already been resolved', {
      resolvedAt: existing.resolvedAt?.toISOString() ?? null,
    });
  }

  const row = await prisma.inspection.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      resolutionNote: input.resolutionNote,
      resolvedAt: new Date(),
    },
  });

  return toInspectionDTO(row);
}

export interface SeveritySummaryRow {
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  open: number;
  resolved: number;
  total: number;
}

export interface SummaryResult {
  totals: { open: number; resolved: number; total: number };
  bySeverity: SeveritySummaryRow[];
}

const SEVERITY_ORDER = ['CRITICAL', 'MAJOR', 'MINOR'] as const;

// Plant-wide on purpose, the list view's filters don't apply here.
export async function getSummary(): Promise<SummaryResult> {
  const grouped = await prisma.inspection.groupBy({
    by: ['severity', 'status'],
    _count: { _all: true },
  });

  const bySeverity: SeveritySummaryRow[] = SEVERITY_ORDER.map((severity) => {
    const open =
      grouped.find((g) => g.severity === severity && g.status === 'OPEN')?._count._all ?? 0;
    const resolved =
      grouped.find((g) => g.severity === severity && g.status === 'RESOLVED')?._count._all ?? 0;
    return { severity, open, resolved, total: open + resolved };
  });

  const totals = bySeverity.reduce(
    (acc, row) => ({
      open: acc.open + row.open,
      resolved: acc.resolved + row.resolved,
      total: acc.total + row.total,
    }),
    { open: 0, resolved: 0, total: 0 },
  );

  return { totals, bySeverity };
}
