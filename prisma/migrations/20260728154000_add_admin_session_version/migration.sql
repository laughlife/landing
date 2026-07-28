-- AlterTable
ALTER TABLE `portal_admin_users`
    ADD COLUMN `session_version` INTEGER UNSIGNED NOT NULL DEFAULT 1;
