import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';
import type { Prisma } from './generated/prisma/client.ts';
import 'dotenv/config';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  console.error('DATABASE_URL is not set — cannot seed.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function daysAgo(n: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - n);
  return date.toISOString().slice(0, 10);
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

type SeedRow = {
  days: number;
  machineId: string;
  defectType: Prisma.InspectionCreateInput['defectType'];
  severity: Prisma.InspectionCreateInput['severity'];
  remarks?: string;
  resolution?: string;
};

const ROWS: SeedRow[] = [
  {
    days: 0,
    machineId: 'LOOM-14',
    defectType: 'WEAVE_DEFECT',
    severity: 'CRITICAL',
    remarks: 'Broken pick repeating every ~2m across full width.',
  },
  {
    days: 0,
    machineId: 'LOOM-07',
    defectType: 'SHADE_VARIATION',
    severity: 'MAJOR',
    remarks: 'Selvedge to centre shade drift on indigo lot.',
  },
  {
    days: 0,
    machineId: 'SULZER-03',
    defectType: 'COUNT_DEVIATION',
    severity: 'MINOR',
    remarks: 'EPI reading 118 against standard 124.',
  },
  {
    days: 1,
    machineId: 'LOOM-14',
    defectType: 'HOLE_TEAR',
    severity: 'CRITICAL',
    remarks: 'Temple mark tearing at right selvedge.',
  },
  { days: 1, machineId: 'AIRJET-21', defectType: 'WEAVE_DEFECT', severity: 'MAJOR' },
  {
    days: 2,
    machineId: 'LOOM-09',
    defectType: 'OTHER',
    severity: 'MINOR',
    remarks: 'Oil spot near beam, suspect lubrication overflow.',
    resolution: 'Cleaned beam housing and wiped down guide rollers. Next 200m clear.',
  },
  {
    days: 3,
    machineId: 'SULZER-03',
    defectType: 'SHADE_VARIATION',
    severity: 'CRITICAL',
    remarks: 'Batch-to-batch mismatch flagged by finishing.',
    resolution: 'Lot quarantined and re-dyed. Dyehouse recipe corrected.',
  },
  { days: 3, machineId: 'LOOM-07', defectType: 'WEAVE_DEFECT', severity: 'MINOR' },
  {
    days: 4,
    machineId: 'RAPIER-11',
    defectType: 'COUNT_DEVIATION',
    severity: 'MAJOR',
    remarks: 'PPI short by 4 on three consecutive rolls.',
    resolution: 'Let-off tension recalibrated by maintenance. Verified on sample.',
  },
  {
    days: 5,
    machineId: 'LOOM-14',
    defectType: 'HOLE_TEAR',
    severity: 'MINOR',
    resolution: 'Isolated pinhole, roll downgraded to B-grade and passed.',
  },
  {
    days: 6,
    machineId: 'AIRJET-21',
    defectType: 'SHADE_VARIATION',
    severity: 'MAJOR',
    remarks: 'Visible barre under D65 light box.',
  },
  {
    days: 7,
    machineId: 'LOOM-02',
    defectType: 'WEAVE_DEFECT',
    severity: 'CRITICAL',
    remarks: 'Reed mark running full roll length.',
    resolution: 'Reed replaced. Loom re-qualified with a 50m trial run.',
  },
  {
    days: 8,
    machineId: 'SULZER-03',
    defectType: 'OTHER',
    severity: 'MAJOR',
    remarks: 'Unidentified contamination streak, sample sent to lab.',
  },
  {
    days: 9,
    machineId: 'RAPIER-11',
    defectType: 'HOLE_TEAR',
    severity: 'CRITICAL',
    resolution: 'Gripper tape frayed; replaced and stitched section cut out.',
  },
  { days: 11, machineId: 'LOOM-09', defectType: 'COUNT_DEVIATION', severity: 'MINOR' },
  {
    days: 12,
    machineId: 'LOOM-07',
    defectType: 'HOLE_TEAR',
    severity: 'MAJOR',
    remarks: 'Two tears within 15m near left selvedge.',
  },
  {
    days: 14,
    machineId: 'AIRJET-21',
    defectType: 'COUNT_DEVIATION',
    severity: 'CRITICAL',
    remarks: 'Count off by 9 EPI — whole shift output held.',
    resolution: 'Warp beam mis-set at creel. Shift output re-inspected, 60% released.',
  },
  {
    days: 16,
    machineId: 'LOOM-02',
    defectType: 'SHADE_VARIATION',
    severity: 'MINOR',
    resolution: 'Within tolerance on re-check. Closed with no action.',
  },
  { days: 18, machineId: 'SULZER-08', defectType: 'WEAVE_DEFECT', severity: 'MAJOR' },
  {
    days: 21,
    machineId: 'LOOM-14',
    defectType: 'OTHER',
    severity: 'MINOR',
    remarks: 'Roll label mismatch against production docket.',
    resolution: 'Docket corrected at packing. Root cause: manual entry.',
  },
  {
    days: 24,
    machineId: 'RAPIER-11',
    defectType: 'WEAVE_DEFECT',
    severity: 'MINOR',
    resolution: 'Minor float, trimmed at inspection table.',
  },
  {
    days: 28,
    machineId: 'SULZER-08',
    defectType: 'HOLE_TEAR',
    severity: 'MAJOR',
    remarks: 'Recurring at same loom position.',
  },
  {
    days: 31,
    machineId: 'LOOM-09',
    defectType: 'SHADE_VARIATION',
    severity: 'CRITICAL',
    resolution: 'Full lot re-processed. Supplier yarn batch blacklisted.',
  },
  {
    days: 35,
    machineId: 'LOOM-02',
    defectType: 'COUNT_DEVIATION',
    severity: 'MAJOR',
    resolution: 'Tension roller serviced during planned maintenance.',
  },
  {
    days: 40,
    machineId: 'AIRJET-21',
    defectType: 'OTHER',
    severity: 'MINOR',
    remarks: 'Historical entry migrated from paper register.',
    resolution: 'Closed during backlog cleanup, no action required.',
  },
];

async function main() {
  // Entrypoint runs this on every boot, so don't wipe unless asked.
  const force = process.env['SEED_FORCE'] === 'true';
  const existing = await prisma.inspection.count();

  if (existing > 0 && !force) {
    console.log(`[seed] skipped — ${existing} inspections already present`);
    console.log('[seed] set SEED_FORCE=true to wipe and reseed');
    return;
  }

  console.log('[seed] clearing existing data…');
  await prisma.inspection.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('arvind123', 10);
  await prisma.user.create({
    data: { username: 'supervisor', passwordHash, displayName: 'Shop-floor Supervisor' },
  });
  console.log('[seed] user created: supervisor / arvind123');

  for (const row of ROWS) {
    const resolved = Boolean(row.resolution);
    await prisma.inspection.create({
      data: {
        inspectionDate: dateOnly(daysAgo(row.days)),
        machineId: row.machineId,
        defectType: row.defectType,
        severity: row.severity,
        remarks: row.remarks ?? null,
        status: resolved ? 'RESOLVED' : 'OPEN',
        resolutionNote: row.resolution ?? null,
        resolvedAt: resolved ? new Date(dateOnly(daysAgo(Math.max(0, row.days - 1)))) : null,
      },
    });
  }

  const open = await prisma.inspection.count({ where: { status: 'OPEN' } });
  const resolved = await prisma.inspection.count({ where: { status: 'RESOLVED' } });
  console.log(`[seed] ${ROWS.length} inspections created (${open} open, ${resolved} resolved)`);
}

main()
  .catch((error: unknown) => {
    console.error('[seed] failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
