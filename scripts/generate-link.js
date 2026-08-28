const fs = require("fs");
const path = require("path");
const { signPayload } = require("../app/token");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const lessonId = process.argv[2];
const studentName = process.argv[3] || "Student";
const durationMinutes = Number(process.argv[4] || 60);
const secret = process.env.APP_SECRET;
const baseUrl = process.env.BASE_URL || "http://localhost:3000";

if (!secret) {
  console.error("APP_SECRET is missing. Copy .env.example to .env and set a long secret.");
  process.exit(1);
}

if (!lessonId) {
  console.error('Usage: npm run generate-link -- <lesson-id> "Student Name" <minutes>');
  process.exit(1);
}

if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
  console.error("Duration must be a positive number of minutes.");
  process.exit(1);
}

const lessonPath = path.join(__dirname, "..", "data", "lessons", `${lessonId}.json`);
if (!fs.existsSync(lessonPath)) {
  console.error(`Lesson not found: ${lessonId}`);
  process.exit(1);
}

const expiration = Date.now() + durationMinutes * 60 * 1000;
const token = signPayload(
  {
    lessonId,
    studentName,
    exp: expiration
  },
  secret
);

const lessonUrl = `${baseUrl.replace(/\/$/, "")}/lesson?token=${token}`;

console.log(`Lesson ID: ${lessonId}`);
console.log(`Student: ${studentName}`);
console.log(`Expires: ${new Date(expiration).toISOString()}`);
console.log(`URL: ${lessonUrl}`);
