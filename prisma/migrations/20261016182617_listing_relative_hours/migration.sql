-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
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
    "opensHoursBefore" INTEGER NOT NULL DEFAULT 3,
    "closesHoursAfter" INTEGER NOT NULL DEFAULT 3,
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
INSERT INTO "new_Listing" ("address", "approxLat", "approxLng", "areaLabel", "carCount", "createdAt", "eventId", "flatPrice", "hostId", "hourlyRate", "id", "instructions", "isDemo", "lat", "lng", "openFrom", "openUntil", "photoUrl", "pricingMode", "status", "updatedAt", "venueId", "walkMeters", "walkMinutes", "walkSource") SELECT "address", "approxLat", "approxLng", "areaLabel", "carCount", "createdAt", "eventId", "flatPrice", "hostId", "hourlyRate", "id", "instructions", "isDemo", "lat", "lng", "openFrom", "openUntil", "photoUrl", "pricingMode", "status", "updatedAt", "venueId", "walkMeters", "walkMinutes", "walkSource" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_eventId_status_idx" ON "Listing"("eventId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
