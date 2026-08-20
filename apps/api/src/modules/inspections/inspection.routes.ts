import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.ts';
import { requireAuth } from '../../middleware/auth.ts';
import {
  createInspectionSchema,
  listInspectionsSchema,
  resolveInspectionSchema,
} from './inspection.schemas.ts';
import {
  createInspection,
  getInspection,
  getSummary,
  listInspections,
  resolveInspection,
} from './inspection.service.ts';

export const inspectionRoutes = Router();

inspectionRoutes.use(requireAuth);

inspectionRoutes.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    res.json(await getSummary());
  }),
);

inspectionRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listInspectionsSchema.parse(req.query);
    res.json(await listInspections(query));
  }),
);

inspectionRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getInspection(String(req.params.id)));
  }),
);

inspectionRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createInspectionSchema.parse(req.body);
    const { inspection } = await createInspection(input);
    res.status(201).json(inspection);
  }),
);

inspectionRoutes.patch(
  '/:id/resolve',
  asyncHandler(async (req, res) => {
    const input = resolveInspectionSchema.parse(req.body);
    res.json(await resolveInspection(String(req.params.id), input));
  }),
);
