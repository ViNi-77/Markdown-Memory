ALTER TABLE "document" ADD COLUMN "sort_order" integer;
--> statement-breakpoint
WITH ranked_documents AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "user_id"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id" ASC
    ) - 1 AS "next_sort_order"
  FROM "document"
)
UPDATE "document"
SET "sort_order" = ranked_documents."next_sort_order"
FROM ranked_documents
WHERE "document"."id" = ranked_documents."id";
--> statement-breakpoint
ALTER TABLE "document" ALTER COLUMN "sort_order" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "document" ALTER COLUMN "sort_order" SET NOT NULL;
