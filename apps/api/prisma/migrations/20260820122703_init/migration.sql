-- CreateEnum
CREATE TYPE "DefectType" AS ENUM ('WEAVE_DEFECT', 'SHADE_VARIATION', 'HOLE_TEAR', 'COUNT_DEVIATION', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "InspectionSource" AS ENUM ('MANUAL', 'SAP_WEBHOOK');

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "inspection_date" DATE NOT NULL,
    "machine_id" VARCHAR(64) NOT NULL,
    "defect_type" "DefectType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "remarks" VARCHAR(2000),
    "status" "InspectionStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_note" VARCHAR(2000),
    "resolved_at" TIMESTAMP(3),
    "source" "InspectionSource" NOT NULL DEFAULT 'MANUAL',
    "client_ref" VARCHAR(64),
    "sap_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inspections_client_ref_key" ON "inspections"("client_ref");

-- CreateIndex
CREATE INDEX "inspections_status_severity_idx" ON "inspections"("status", "severity");

-- CreateIndex
CREATE INDEX "inspections_inspection_date_idx" ON "inspections"("inspection_date" DESC);

-- CreateIndex
CREATE INDEX "inspections_created_at_idx" ON "inspections"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
