-- CreateTable
CREATE TABLE "request_logs" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);
