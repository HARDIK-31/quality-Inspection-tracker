import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../env.ts';
import { asyncHandler } from '../../lib/asyncHandler.ts';
import { unauthorized } from '../../lib/errors.ts';
import { createInspection } from '../inspections/inspection.service.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// Mock SAP QM notification. Unknown codes fall back to OTHER/MAJOR rather than
// rejecting, otherwise SAP just retries the same bad message forever.
const sapPayloadSchema = z.object({
  notification_no: z.string().trim().min(1).max(48),
  plant_code: z.string().trim().max(16).optional(),
  posting_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'posting_date must be YYYY-MM-DD')
    .optional(),
  work_center: z.string().trim().min(1).max(64),
  defect_code: z.string().trim().min(1).max(32),
  // SAP priority scale: 1 = Critical, 2 = Major, 3 = Minor.
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.enum(['1', '2', '3'])]).optional(),
  long_text: z.string().trim().max(2000).optional(),
});

export type SapPayload = z.infer<typeof sapPayloadSchema>;

const DEFECT_CODE_MAP: Record<
  string,
  'WEAVE_DEFECT' | 'SHADE_VARIATION' | 'HOLE_TEAR' | 'COUNT_DEVIATION'
> = {
  WEAVE: 'WEAVE_DEFECT',
  WEAVE_DEFECT: 'WEAVE_DEFECT',
  SHADE: 'SHADE_VARIATION',
  SHADE_VARIATION: 'SHADE_VARIATION',
  HOLE: 'HOLE_TEAR',
  TEAR: 'HOLE_TEAR',
  HOLE_TEAR: 'HOLE_TEAR',
  COUNT: 'COUNT_DEVIATION',
  COUNT_DEVIATION: 'COUNT_DEVIATION',
};

const PRIORITY_MAP = { '1': 'CRITICAL', '2': 'MAJOR', '3': 'MINOR' } as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const sapRoutes = Router();

sapRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    // Unset in dev so the endpoint stays curl-able.
    if (env.SAP_WEBHOOK_SECRET && req.headers['x-sap-signature'] !== env.SAP_WEBHOOK_SECRET) {
      throw unauthorized('Invalid or missing x-sap-signature header');
    }

    const payload = sapPayloadSchema.parse(req.body);

    const defectType = DEFECT_CODE_MAP[payload.defect_code.toUpperCase()] ?? 'OTHER';
    const severity = payload.priority
      ? PRIORITY_MAP[String(payload.priority) as '1' | '2' | '3']
      : 'MAJOR';

    const remarkParts = [
      payload.long_text,
      payload.plant_code ? `Plant ${payload.plant_code}` : null,
    ].filter((part): part is string => Boolean(part));

    const { inspection, created } = await createInspection(
      {
        inspectionDate: payload.posting_date ?? today(),
        machineId: payload.work_center,
        defectType,
        severity,
        remarks: remarkParts.length > 0 ? remarkParts.join(' · ') : null,
      },
      {
        source: 'SAP_WEBHOOK',
        sapPayload: payload as unknown as Prisma.InputJsonValue,
        // SAP resends until it gets a 2xx, so key off the notification number.
        clientRef: `sap:${payload.notification_no}`,
      },
    );

    res.status(created ? 201 : 200).json({
      received: true,
      created,
      inspectionId: inspection.id,
      inspection,
    });
  }),
);
