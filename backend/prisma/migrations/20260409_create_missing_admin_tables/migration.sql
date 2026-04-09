-- Create Role table for RBAC system
CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "permissions" TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "roles_name_key" UNIQUE ("name")
);

-- Create MarqueeOffer table for promotional banners
CREATE TABLE "marquee_offers" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "linkUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "marquee_offers_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better query performance
CREATE INDEX "roles_name_idx" ON "roles"("name");
CREATE INDEX "marquee_offers_isActive_idx" ON "marquee_offers"("isActive");
CREATE INDEX "marquee_offers_sortOrder_idx" ON "marquee_offers"("sortOrder");
