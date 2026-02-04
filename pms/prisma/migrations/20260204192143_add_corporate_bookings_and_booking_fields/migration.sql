/*
  Warnings:

  - The values [ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `idProof` on the `guests` table. All the data in the column will be lost.
  - You are about to drop the column `isPaid` on the `occupancies` table. All the data in the column will be lost.
  - Added the required column `actualRoomRate` to the `occupancies` table without a default value. This is not possible if the table is not empty.
  - Made the column `totalAmount` on table `occupancies` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `floorId` to the `rooms` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `roomType` on the `rooms` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('DELUXE', 'SUITE', 'AC', 'NON_AC');

-- CreateEnum
CREATE TYPE "RoomCategory" AS ENUM ('ECONOMY', 'MODERATE', 'PREMIUM', 'ELITE', 'VIP');

-- CreateEnum
CREATE TYPE "IdProofType" AS ENUM ('AADHAAR_CARD', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'PAN_CARD', 'RATION_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WALK_IN', 'PHONE_CALL', 'GOIBIBO', 'MAKEMYTRIP', 'BOOKING_DOT_COM', 'AIRBNB', 'AGODA', 'EXPEDIA', 'CORPORATE', 'TRAVEL_AGENT', 'WEBSITE', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'RECEPTIONIST');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoomStatus" ADD VALUE 'RESERVED';
ALTER TYPE "RoomStatus" ADD VALUE 'DIRTY';
ALTER TYPE "RoomStatus" ADD VALUE 'CLEANING';

-- AlterTable
ALTER TABLE "guests" DROP COLUMN "idProof",
ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'India',
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "idProofImage" TEXT,
ADD COLUMN     "idProofNumber" TEXT,
ADD COLUMN     "idProofType" "IdProofType",
ADD COLUMN     "nationality" TEXT DEFAULT 'Indian',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "otherIdProof" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "occupancies" DROP COLUMN "isPaid",
ADD COLUMN     "actualCapacity" INTEGER,
ADD COLUMN     "actualRoomRate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "balanceAmount" DOUBLE PRECISION,
ADD COLUMN     "bookingSource" "BookingSource" NOT NULL DEFAULT 'WALK_IN',
ADD COLUMN     "corporateBookingId" TEXT,
ADD COLUMN     "groupBookingId" TEXT,
ADD COLUMN     "lastPaidDate" TIMESTAMP(3),
ADD COLUMN     "paidAmount" DOUBLE PRECISION DEFAULT 0,
ALTER COLUMN "expectedCheckOut" DROP NOT NULL,
ALTER COLUMN "totalAmount" SET NOT NULL;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "amenities" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'India',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "images" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "amenities" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "floorId" TEXT NOT NULL,
ADD COLUMN     "images" TEXT,
ADD COLUMN     "roomCategory" "RoomCategory" NOT NULL DEFAULT 'MODERATE',
ADD COLUMN     "size" DOUBLE PRECISION,
DROP COLUMN "roomType",
ADD COLUMN     "roomType" "RoomType" NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerificationCode" TEXT,
ADD COLUMN     "phoneVerificationExpiry" TIMESTAMP(3),
ADD COLUMN     "phoneVerified" TIMESTAMP(3),
ADD COLUMN     "propertyId" TEXT,
ALTER COLUMN "role" DROP NOT NULL,
ALTER COLUMN "role" DROP DEFAULT;

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "floorName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupancy_guests" (
    "id" TEXT NOT NULL,
    "occupancyId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occupancy_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_bookings" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "totalRooms" INTEGER NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_bookings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "gstNumber" TEXT,
    "notes" TEXT,
    "propertyId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "occupancyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidUpToDate" TIMESTAMP(3),
    "transactionId" TEXT,
    "notes" TEXT,
    "receivedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "floors_propertyId_floorNumber_key" ON "floors"("propertyId", "floorNumber");

-- CreateIndex
CREATE UNIQUE INDEX "occupancy_guests_occupancyId_guestId_key" ON "occupancy_guests"("occupancyId", "guestId");

-- AddForeignKey
ALTER TABLE "occupancies" ADD CONSTRAINT "occupancies_groupBookingId_fkey" FOREIGN KEY ("groupBookingId") REFERENCES "group_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupancies" ADD CONSTRAINT "occupancies_corporateBookingId_fkey" FOREIGN KEY ("corporateBookingId") REFERENCES "corporate_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupancy_guests" ADD CONSTRAINT "occupancy_guests_occupancyId_fkey" FOREIGN KEY ("occupancyId") REFERENCES "occupancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupancy_guests" ADD CONSTRAINT "occupancy_guests_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_bookings" ADD CONSTRAINT "group_bookings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_bookings" ADD CONSTRAINT "group_bookings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_bookings" ADD CONSTRAINT "corporate_bookings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_bookings" ADD CONSTRAINT "corporate_bookings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_occupancyId_fkey" FOREIGN KEY ("occupancyId") REFERENCES "occupancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
