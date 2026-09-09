-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('RESULT', 'ERROR');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sandboxId" VARCHAR(64),
    "imageUrl" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "type" "MessageType" NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeFragment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sandboxUrl" TEXT NOT NULL,
    "sandboxId" VARCHAR(64),
    "title" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "imageUrl" TEXT,
    "designSpec" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeFragment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Message_projectId_createdAt_idx" ON "Message"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_userId_idx" ON "Message"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeFragment_messageId_key" ON "CodeFragment"("messageId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeFragment" ADD CONSTRAINT "CodeFragment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
