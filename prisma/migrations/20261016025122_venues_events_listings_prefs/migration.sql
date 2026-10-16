-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "externalId" TEXT
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "startsAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "externalId" TEXT,
    CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "eventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "photoUrl" TEXT,
    "carCount" INTEGER NOT NULL DEFAULT 1,
    "pricingMode" TEXT NOT NULL DEFAULT 'FLAT',
    "hourlyRate" INTEGER,
    "flatPrice" INTEGER,
    "openFrom" DATETIME NOT NULL,
    "openUntil" DATETIME NOT NULL,
    "address" TEXT NOT NULL,
    "instructions" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "approxLat" REAL NOT NULL,
    "approxLng" REAL NOT NULL,
    "areaLabel" TEXT NOT NULL,
    "walkMeters" INTEGER NOT NULL,
    "walkMinutes" INTEGER NOT NULL,
    "walkSource" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Listing_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isDriver" BOOLEAN NOT NULL DEFAULT false,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "lastRole" TEXT NOT NULL DEFAULT 'DRIVER',
    "themePref" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "homeArea" TEXT,
    "homeLat" REAL,
    "homeLng" REAL,
    "maxWalkMinutes" INTEGER NOT NULL DEFAULT 15,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleColor" TEXT,
    "licensePlate" TEXT,
    "stripeCustomerId" TEXT
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isDriver", "isHost", "lastRole", "name", "passwordHash", "themePref", "updatedAt") SELECT "createdAt", "email", "id", "isDriver", "isHost", "lastRole", "name", "passwordHash", "themePref", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Venue_source_externalId_key" ON "Venue"("source", "externalId");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_source_externalId_key" ON "Event"("source", "externalId");

-- CreateIndex
CREATE INDEX "Listing_eventId_status_idx" ON "Listing"("eventId", "status");
