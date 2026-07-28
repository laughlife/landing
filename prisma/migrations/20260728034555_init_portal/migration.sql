-- CreateTable
CREATE TABLE `portal_admin_users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(64) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(254) NULL,
    `avatar` VARCHAR(1024) NULL,
    `role` ENUM('SUPER_ADMIN', 'EDITOR') NOT NULL DEFAULT 'SUPER_ADMIN',
    `status` ENUM('ENABLED', 'DISABLED') NOT NULL DEFAULT 'ENABLED',
    `last_login_at` DATETIME(3) NULL,
    `last_login_ip` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `portal_admin_users_username_key`(`username`),
    UNIQUE INDEX `portal_admin_users_email_key`(`email`),
    INDEX `portal_admin_users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_company_profiles` (
    `id` INTEGER UNSIGNED NOT NULL,
    `company_name` VARCHAR(200) NOT NULL,
    `short_name` VARCHAR(100) NULL,
    `slogan` VARCHAR(255) NULL,
    `logo` VARCHAR(1024) NULL,
    `favicon` VARCHAR(1024) NULL,
    `hero_title` VARCHAR(255) NULL,
    `hero_subtitle` VARCHAR(1000) NULL,
    `introduction` TEXT NULL,
    `full_description` LONGTEXT NULL,
    `business_scope` LONGTEXT NULL,
    `advantages` JSON NULL,
    `address` VARCHAR(500) NULL,
    `phone` VARCHAR(64) NULL,
    `email` VARCHAR(254) NULL,
    `wechat` VARCHAR(128) NULL,
    `whatsapp` VARCHAR(128) NULL,
    `working_hours` VARCHAR(255) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `registration_info` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_site_settings` (
    `id` INTEGER UNSIGNED NOT NULL,
    `site_name` VARCHAR(200) NOT NULL,
    `site_url` VARCHAR(1024) NULL,
    `site_title` VARCHAR(255) NULL,
    `site_keywords` VARCHAR(500) NULL,
    `site_description` TEXT NULL,
    `logo` VARCHAR(1024) NULL,
    `favicon` VARCHAR(1024) NULL,
    `footer_text` TEXT NULL,
    `copyright` VARCHAR(500) NULL,
    `icp_number` VARCHAR(100) NULL,
    `theme_config` JSON NULL,
    `social_links` JSON NULL,
    `contact_config` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_product_categories` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `parent_id` INTEGER UNSIGNED NULL,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `description` LONGTEXT NULL,
    `cover_image` VARCHAR(1024) NULL,
    `icon` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ENABLED', 'DISABLED') NOT NULL DEFAULT 'ENABLED',
    `seo_title` VARCHAR(255) NULL,
    `seo_keywords` VARCHAR(500) NULL,
    `seo_description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `portal_product_categories_slug_key`(`slug`),
    INDEX `portal_product_categories_parent_id_sort_order_idx`(`parent_id`, `sort_order`),
    INDEX `portal_product_categories_status_sort_order_idx`(`status`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_products` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `model` VARCHAR(150) NULL,
    `subtitle` VARCHAR(500) NULL,
    `summary` TEXT NULL,
    `description` LONGTEXT NULL,
    `cover_image` VARCHAR(1024) NULL,
    `video_url` VARCHAR(1024) NULL,
    `features` JSON NULL,
    `applications` JSON NULL,
    `specifications` JSON NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('DRAFT', 'PUBLISHED', 'DISABLED') NOT NULL DEFAULT 'DRAFT',
    `view_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `seo_title` VARCHAR(255) NULL,
    `seo_keywords` VARCHAR(500) NULL,
    `seo_description` TEXT NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `portal_products_slug_key`(`slug`),
    INDEX `portal_products_category_id_status_sort_order_idx`(`category_id`, `status`, `sort_order`),
    INDEX `portal_products_status_is_featured_sort_order_idx`(`status`, `is_featured`, `sort_order`),
    INDEX `portal_products_status_published_at_idx`(`status`, `published_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_product_images` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER UNSIGNED NOT NULL,
    `media_id` INTEGER UNSIGNED NOT NULL,
    `image_url` VARCHAR(1024) NOT NULL,
    `alt_text` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `portal_product_images_product_id_sort_order_idx`(`product_id`, `sort_order`),
    INDEX `portal_product_images_media_id_idx`(`media_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_partners` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(1024) NULL,
    `cover_image` VARCHAR(1024) NULL,
    `summary` TEXT NULL,
    `description` LONGTEXT NULL,
    `website` VARCHAR(1024) NULL,
    `cooperation_type` VARCHAR(100) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ENABLED', 'DISABLED') NOT NULL DEFAULT 'ENABLED',
    `seo_title` VARCHAR(255) NULL,
    `seo_description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `portal_partners_slug_key`(`slug`),
    INDEX `portal_partners_status_is_featured_sort_order_idx`(`status`, `is_featured`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_service_items` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(255) NULL,
    `cover_image` VARCHAR(1024) NULL,
    `summary` TEXT NULL,
    `description` LONGTEXT NULL,
    `features` JSON NULL,
    `process_steps` JSON NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ENABLED', 'DISABLED') NOT NULL DEFAULT 'ENABLED',
    `seo_title` VARCHAR(255) NULL,
    `seo_description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `portal_service_items_slug_key`(`slug`),
    INDEX `portal_service_items_status_is_featured_sort_order_idx`(`status`, `is_featured`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_banners` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `subtitle` VARCHAR(1000) NULL,
    `image` VARCHAR(1024) NULL,
    `mobile_image` VARCHAR(1024) NULL,
    `button_text` VARCHAR(100) NULL,
    `button_link` VARCHAR(1024) NULL,
    `position` VARCHAR(64) NOT NULL DEFAULT 'HOME_HERO',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ENABLED', 'DISABLED') NOT NULL DEFAULT 'ENABLED',
    `start_at` DATETIME(3) NULL,
    `end_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `portal_banners_position_status_start_at_end_at_sort_order_idx`(`position`, `status`, `start_at`, `end_at`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_articles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `content` LONGTEXT NULL,
    `cover_image` VARCHAR(1024) NULL,
    `author` VARCHAR(100) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'DISABLED') NOT NULL DEFAULT 'DRAFT',
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `seo_title` VARCHAR(255) NULL,
    `seo_keywords` VARCHAR(500) NULL,
    `seo_description` TEXT NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `portal_articles_slug_key`(`slug`),
    INDEX `portal_articles_status_published_at_idx`(`status`, `published_at`),
    INDEX `portal_articles_status_is_featured_sort_order_idx`(`status`, `is_featured`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_contact_messages` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `company` VARCHAR(200) NULL,
    `phone` VARCHAR(64) NULL,
    `email` VARCHAR(254) NULL,
    `subject` VARCHAR(255) NULL,
    `message` TEXT NOT NULL,
    `source_page` VARCHAR(1024) NULL,
    `product_id` INTEGER UNSIGNED NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,
    `status` ENUM('NEW', 'PROCESSING', 'RESOLVED', 'SPAM') NOT NULL DEFAULT 'NEW',
    `admin_remark` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `portal_contact_messages_status_created_at_idx`(`status`, `created_at`),
    INDEX `portal_contact_messages_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_media_files` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `original_name` VARCHAR(512) NOT NULL,
    `stored_name` VARCHAR(255) NOT NULL,
    `relative_path` VARCHAR(700) NOT NULL,
    `url` VARCHAR(1024) NOT NULL,
    `mime_type` VARCHAR(127) NOT NULL,
    `extension` VARCHAR(20) NOT NULL,
    `size` INTEGER UNSIGNED NOT NULL,
    `width` INTEGER UNSIGNED NULL,
    `height` INTEGER UNSIGNED NULL,
    `checksum` CHAR(64) NOT NULL,
    `category` ENUM('IMAGE', 'DOCUMENT', 'OTHER') NOT NULL DEFAULT 'IMAGE',
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `portal_media_files_stored_name_key`(`stored_name`),
    UNIQUE INDEX `portal_media_files_relative_path_key`(`relative_path`),
    INDEX `portal_media_files_checksum_idx`(`checksum`),
    INDEX `portal_media_files_category_created_at_idx`(`category`, `created_at`),
    INDEX `portal_media_files_created_by_created_at_idx`(`created_by`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_media_references` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `media_id` INTEGER UNSIGNED NOT NULL,
    `resource_type` VARCHAR(64) NOT NULL,
    `resource_id` INTEGER UNSIGNED NOT NULL,
    `field` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `portal_media_references_resource_type_resource_id_idx`(`resource_type`, `resource_id`),
    UNIQUE INDEX `portal_media_references_media_id_resource_type_resource_id_f_key`(`media_id`, `resource_type`, `resource_id`, `field`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_audit_logs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_user_id` INTEGER UNSIGNED NULL,
    `module` VARCHAR(64) NOT NULL,
    `action` ENUM('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'DISABLE', 'UPLOAD', 'DELETE_FILE', 'UPDATE_ADMIN') NOT NULL,
    `target_type` VARCHAR(64) NULL,
    `target_id` VARCHAR(64) NULL,
    `summary` VARCHAR(1000) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `portal_audit_logs_admin_user_id_created_at_idx`(`admin_user_id`, `created_at`),
    INDEX `portal_audit_logs_module_created_at_idx`(`module`, `created_at`),
    INDEX `portal_audit_logs_target_type_target_id_idx`(`target_type`, `target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `portal_product_categories` ADD CONSTRAINT `portal_product_categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `portal_product_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portal_products` ADD CONSTRAINT `portal_products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `portal_product_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portal_product_images` ADD CONSTRAINT `portal_product_images_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `portal_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portal_product_images` ADD CONSTRAINT `portal_product_images_media_id_fkey` FOREIGN KEY (`media_id`) REFERENCES `portal_media_files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portal_contact_messages` ADD CONSTRAINT `portal_contact_messages_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `portal_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portal_media_files` ADD CONSTRAINT `portal_media_files_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `portal_admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portal_media_references` ADD CONSTRAINT `portal_media_references_media_id_fkey` FOREIGN KEY (`media_id`) REFERENCES `portal_media_files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portal_audit_logs` ADD CONSTRAINT `portal_audit_logs_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `portal_admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
