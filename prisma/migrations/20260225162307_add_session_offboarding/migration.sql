-- CreateTable
CREATE TABLE "SessionOffboarding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "date" DATETIME,
    "sessionNumber" INTEGER,
    "hours" REAL,
    "clientLabel" TEXT,
    "eventTopic" TEXT,
    "learningExperience" TEXT,
    "sessionGoals" TEXT,
    "homework" TEXT,
    "techniques" TEXT,
    "keyInsightsClient" TEXT,
    "gains" TEXT,
    "homeworkDescription" TEXT,
    "feedback" TEXT,
    "coachReflection" TEXT,
    "focusAreas" TEXT,
    "additionalNotes" TEXT,
    "generatedNoteMd" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SessionOffboarding_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionOffboarding_sessionId_key" ON "SessionOffboarding"("sessionId");
