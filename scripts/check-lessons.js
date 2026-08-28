const fs = require("fs");
const path = require("path");

const lessonsDir = path.join(__dirname, "..", "data", "lessons");

if (!fs.existsSync(lessonsDir)) {
  console.error("Missing data/lessons directory.");
  process.exit(1);
}

const requiredKeys = [
  "id",
  "title",
  "level",
  "topic",
  "speakingGoal",
  "grammarGoal",
  "warmupQuestions",
  "keyExpressions",
  "dialogue",
  "pronunciationNotes",
  "blankExercises",
  "grammar",
  "vocabulary",
  "substitution",
  "freeSpeakingQuestions",
  "roleplayPractice",
  "homework"
];

const files = fs.readdirSync(lessonsDir).filter((file) => file.endsWith(".json"));

if (files.length === 0) {
  console.error("No lesson JSON files found.");
  process.exit(1);
}

for (const file of files) {
  const lesson = JSON.parse(fs.readFileSync(path.join(lessonsDir, file), "utf8"));
  for (const key of requiredKeys) {
    if (!(key in lesson)) {
      console.error(`${file} is missing required key: ${key}`);
      process.exit(1);
    }
  }
}

console.log(`Validated ${files.length} lesson file(s).`);
