-- CreateTable
CREATE TABLE "about_us" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "about_us_pkey" PRIMARY KEY ("id")
);
