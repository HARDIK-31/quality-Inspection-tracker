import { z } from 'zod';

export const defectTypeSchema = z.enum([
  'WEAVE_DEFECT',
  'SHADE_VARIATION',
  'HOLE_TEAR',
  'COUNT_DEVIATION',
  'OTHER',
]);

export const severitySchema = z.enum(['CRITICAL', 'MAJOR', 'MINOR']);
export const statusSchema = z.enum(['OPEN', 'RESOLVED']);
export const sourceSchema = z.enum(['MANUAL', 'SAP_WEBHOOK']);

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null));

export const createInspectionSchema = z.object({
  inspectionDate: dateOnlySchema,
  machineId: z
    .string()
    .trim()
    .min(1, 'Machine / line ID is required')
    .max(64, 'Must be 64 characters or fewer'),
  defectType: defectTypeSchema,
  severity: severitySchema,
  remarks: optionalText(2000),
});

export const resolveInspectionSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .min(1, 'A resolution note is required to close an inspection')
    .max(2000, 'Must be 2000 characters or fewer'),
});

export const sortBySchema = z.enum(['inspectionDate', 'createdAt', 'severity', 'machineId']);

export const listInspectionsSchema = z
  .object({
    status: statusSchema.optional(),
    severity: severitySchema.optional(),
    defectType: defectTypeSchema.optional(),
    machineId: z.string().trim().min(1).optional(),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    sortBy: sortBySchema.default('inspectionDate'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: '"from" must be on or before "to"',
    path: ['from'],
  });

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type ResolveInspectionInput = z.infer<typeof resolveInspectionSchema>;
export type ListInspectionsQuery = z.infer<typeof listInspectionsSchema>;
