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
    "stripeCustomerId" TEXT,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutAccountRef" TEXT,
    "payoutLabel" TEXT
);
INSERT INTO "new_User" ("createdAt", "email", "homeArea", "homeLat", "homeLng", "id", "isDriver", "isHost", "lastRole", "licensePlate", "maxWalkMinutes", "name", "passwordHash", "payoutAccountRef", "payoutLabel", "payoutsEnabled", "stripeCustomerId", "updatedAt", "vehicleColor", "vehicleMake", "vehicleModel") SELECT "createdAt", "email", "homeArea", "homeLat", "homeLng", "id", "isDriver", "isHost", "lastRole", "licensePlate", "maxWalkMinutes", "name", "passwordHash", "payoutAccountRef", "payoutLabel", "payoutsEnabled", "stripeCustomerId", "updatedAt", "vehicleColor", "vehicleMake", "vehicleModel" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

