/*
  Warnings:

  - Added the required column `user_id` to the `shortened_urls` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "shortened_urls" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "api_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_api_key_key" ON "users"("api_key");

-- AddForeignKey
ALTER TABLE "shortened_urls" ADD CONSTRAINT "shortened_urls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
