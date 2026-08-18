-- Tenant-scoped FAQ knowledge center. question/answer are English (default);
-- question_km/answer_km are reserved for Phase 1 bilingual without a rewrite.
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "question_km" TEXT,
    "answer_km" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "faqs_tenant_id_is_active_sort_order_idx" ON "faqs"("tenant_id", "is_active", "sort_order");

ALTER TABLE "faqs" ADD CONSTRAINT "faqs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
