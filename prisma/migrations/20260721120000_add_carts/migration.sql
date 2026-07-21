-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('open', 'converted', 'abandoned');

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "guest_token" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carts_tenant_id_customer_id_idx" ON "carts"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "carts_tenant_id_status_idx" ON "carts"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "carts_tenant_id_guest_token_key" ON "carts"("tenant_id", "guest_token");

-- CreateIndex
CREATE INDEX "cart_items_tenant_id_idx" ON "cart_items"("tenant_id");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id", "product_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
