-- AlterTable
ALTER TABLE "organization_invites" ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "emailSentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastEmailSentAt" TIMESTAMP(3);
