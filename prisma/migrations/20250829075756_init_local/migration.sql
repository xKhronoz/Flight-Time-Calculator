-- CreateTable
CREATE TABLE "public"."Airport" (
    "id" SERIAL NOT NULL,
    "iata" VARCHAR(3) NOT NULL,
    "icao" VARCHAR(4),
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "timezone" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" SERIAL NOT NULL,
    "iata" VARCHAR(3) NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Snapshot" (
    "id" SERIAL NOT NULL,
    "iata" VARCHAR(3) NOT NULL,
    "data" JSONB NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Airport_iata_key" ON "public"."Airport"("iata");

-- CreateIndex
CREATE INDEX "AuditLog_iata_idx" ON "public"."AuditLog"("iata");

-- CreateIndex
CREATE INDEX "Snapshot_iata_idx" ON "public"."Snapshot"("iata");

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_iata_fkey" FOREIGN KEY ("iata") REFERENCES "public"."Airport"("iata") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Snapshot" ADD CONSTRAINT "Snapshot_iata_fkey" FOREIGN KEY ("iata") REFERENCES "public"."Airport"("iata") ON DELETE RESTRICT ON UPDATE CASCADE;
