ALTER TABLE "organizations"
  ADD COLUMN "notification_lead_days" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "notification_polling_seconds" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "show_overdue_notifications" BOOLEAN NOT NULL DEFAULT true;
