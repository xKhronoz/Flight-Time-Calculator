-- Adds an optional reason/comment for each audit row
ALTER TABLE "AuditLog" ADD COLUMN "reason" TEXT;
