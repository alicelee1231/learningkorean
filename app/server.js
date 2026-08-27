const fs = require("fs");
const path = require("path");
const http = require("http");
const { URL } = require("url");
const { verifyToken } = require("./token");

const ROOT_DIR = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const LESSON_DIR = path.join(ROOT_DIR, "data", "lessons");
const PORT = Number(process.env.PORT || 3000);
const APP_SECRET = process.env.APP_SECRET;

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return null;
  }
}

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatKoreanDate(timestamp) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date(timestamp));
}

function listLessons() {
  if (!fs.existsSync(LESSON_DIR)) {
    return [];
  }

  return fs
    .readdirSync(LESSON_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const raw = JSON.parse(fs.readFileSync(path.join(LESSON_DIR, file), "utf8"));
      return {
        id: raw.id,
        title: raw.title,
        level: raw.level,
        topic: raw.topic
      };
    });
}

function loadLesson(lessonId) {
  const filePath = path.join(LESSON_DIR, `${lessonId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function renderLayout({ title, body }) {
  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main class="page">
      ${body}
    </main>
  </body>
</html>`;
}

function renderLandingPage() {
  const lessonsMarkup = listLessons()
    .map(
      (lesson) => `
        <li class="lesson-card">
          <strong>${escapeHtml(lesson.title)}</strong>
          <span>${escapeHtml(lesson.level)} · ${escapeHtml(lesson.topic)}</span>
        </li>`
    )
    .join("");

  return renderLayout({
    title: "Learning Korean Classroom",
    body: `
      <section class="hero">
        <p class="eyebrow">Teacher Access</p>
        <h1>Time-limited Korean lesson links</h1>
        <p class="lead">
          Students can only open lessons with a signed link that expires automatically.
        </p>
        <div class="code-block">
          <code>npm run generate-link -- sample-cafe-ordering "Student Name" 60</code>
        </div>
      </section>

      <section class="panel">
        <h2>How it works</h2>
        <ol>
          <li>Create a lesson JSON file in <code>data/lessons</code>.</li>
          <li>Generate a link before class.</li>
          <li>Share the link with the student.</li>
          <li>When the time expires, the lesson page locks automatically.</li>
        </ol>
      </section>

      <section class="panel">
        <h2>Available lessons</h2>
        <ul class="lesson-list">${lessonsMarkup}</ul>
      </section>
    `
  });
}

function renderErrorPage(message, detail) {
  return renderLayout({
    title: "Lesson Access Locked",
    body: `
      <section class="hero error">
        <p class="eyebrow">Access Closed</p>
        <h1>${escapeHtml(message)}</h1>
        <p class="lead">${escapeHtml(detail)}</p>
      </section>
    `
  });
}

function renderList(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderTable(rows) {
  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.expression || row.word || "")}</td>
          <td>${escapeHtml(row.meaning || row.coreMeaning || "")}</td>
          <td>${escapeHtml(row.usage || row.collocations || "")}</td>
          <td>${escapeHtml(row.notes || row.example || "")}</td>
        </tr>`
    )
    .join("");

  return `<table><tbody>${body}</tbody></table>`;
}

function renderLessonPage(lesson, payload) {
  const studentName = payload.studentName || "Student";
  const expiresAt = formatKoreanDate(payload.exp);

  const expressionsRows = lesson.keyExpressions
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.expression)}</td>
        <td>${escapeHtml(item.meaning)}</td>
        <td>${escapeHtml(item.usage)}</td>
        <td>${escapeHtml(item.notes)}</td>
      </tr>`
    )
    .join("");

  const vocabularyRows = lesson.vocabulary
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.word)}</td>
        <td>${escapeHtml(item.coreMeaning)}</td>
        <td>${escapeHtml(item.collocations)}</td>
        <td>${escapeHtml(item.example)}</td>
      </tr>`
    )
    .join("");

  const dialogueMarkup = lesson.dialogue
    .map(
      (line) => `
        <div class="dialogue-line">
          <span class="speaker">${escapeHtml(line.speaker)}:</span>
          <span>${escapeHtml(line.korean)}</span>
          <span class="translation">${escapeHtml(line.translation)}</span>
        </div>`
    )
    .join("");

  const grammarMarkup = lesson.grammar
    .map(
      (point) => `
      <article class="card">
        <h3>${escapeHtml(point.name)}</h3>
        <p><strong>Form:</strong> ${escapeHtml(point.form)}</p>
        <p><strong>Meaning:</strong> ${escapeHtml(point.meaning)}</p>
        <p><strong>Why here:</strong> ${escapeHtml(point.whyItAppears)}</p>
        <p><strong>Common mistake:</strong> ${escapeHtml(point.commonMistake)}</p>
        <ul>${renderList(point.examples)}</ul>
      </article>`
    )
    .join("");

  return renderLayout({
    title: lesson.title,
    body: `
      <section class="hero">
        <p class="eyebrow">${escapeHtml(lesson.level)} Lesson</p>
        <h1>${escapeHtml(lesson.title)}</h1>
        <p class="lead">${escapeHtml(lesson.speakingGoal)}</p>
        <div class="meta-grid">
          <div><strong>Student</strong><span>${escapeHtml(studentName)}</span></div>
          <div><strong>Topic</strong><span>${escapeHtml(lesson.topic)}</span></div>
          <div><strong>Grammar Goal</strong><span>${escapeHtml(lesson.grammarGoal)}</span></div>
          <div><strong>Access Expires</strong><span>${escapeHtml(expiresAt)}</span></div>
        </div>
      </section>

      <section class="panel">
        <h2>Warm-up</h2>
        <ul>${renderList(lesson.warmupQuestions)}</ul>
      </section>

      <section class="panel">
        <h2>Key Expressions</h2>
        <table>
          <thead>
            <tr><th>Expression</th><th>Meaning</th><th>When to use it</th><th>Notes</th></tr>
          </thead>
          <tbody>${expressionsRows}</tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Core Dialogue</h2>
        <div class="dialogue">${dialogueMarkup}</div>
      </section>

      <section class="panel">
        <h2>Pronunciation Practice</h2>
        <ul>${renderList(lesson.pronunciationNotes)}</ul>
      </section>

      <section class="panel">
        <h2>Grammar In Context</h2>
        <div class="cards">${grammarMarkup}</div>
      </section>

      <section class="panel">
        <h2>Vocabulary Expansion</h2>
        <table>
          <thead>
            <tr><th>Word</th><th>Meaning</th><th>Common Collocations</th><th>Example</th></tr>
          </thead>
          <tbody>${vocabularyRows}</tbody>
        </table>
      </section>

      <section class="panel split">
        <div>
          <h2>Substitution Drill</h2>
          <p class="base-pattern">${escapeHtml(lesson.substitution.basePattern)}</p>
          <ul>${renderList(lesson.substitution.examples)}</ul>
        </div>
        <div>
          <h2>Free Speaking</h2>
          <ul>${renderList(lesson.freeSpeakingQuestions)}</ul>
        </div>
      </section>

      <section class="panel split">
        <div>
          <h2>Roleplay Practice</h2>
          <ul>${renderList(lesson.roleplayPractice)}</ul>
        </div>
        <div>
          <h2>Homework</h2>
          <ul>${renderList(lesson.homework)}</ul>
        </div>
      </section>
    `
  });
}

function serveStaticAsset(requestPath, response) {
  const assetPath = path.join(PUBLIC_DIR, requestPath);
  if (!assetPath.startsWith(PUBLIC_DIR) || !fs.existsSync(assetPath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const contentType = assetPath.endsWith(".css") ? "text/css; charset=utf-8" : "text/plain; charset=utf-8";
  response.writeHead(200, { "Content-Type": contentType });
  response.end(fs.readFileSync(assetPath));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/styles.css") {
    serveStaticAsset("styles.css", response);
    return;
  }

  if (url.pathname === "/api/lessons") {
    jsonResponse(response, 200, { lessons: listLessons() });
    return;
  }

  if (url.pathname === "/lesson") {
    if (!APP_SECRET) {
      response.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderErrorPage("Server setup incomplete", "Set APP_SECRET before starting the app."));
      return;
    }

    const result = verifyToken(url.searchParams.get("token"), APP_SECRET);

    if (!result.ok) {
      response.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderErrorPage("This lesson link is no longer available.", "Ask your teacher for a new class link."));
      return;
    }

    const lesson = loadLesson(result.payload.lessonId);

    if (!lesson) {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderErrorPage("Lesson not found", "The lesson for this link could not be loaded."));
      return;
    }

    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(renderLessonPage(lesson, result.payload));
    return;
  }

  if (url.pathname === "/health") {
    jsonResponse(response, 200, { ok: true });
    return;
  }

  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(renderLandingPage());
});

server.listen(PORT, () => {
  const hasSecret = APP_SECRET ? "configured" : "missing";
  console.log(`Learning Korean server running on http://localhost:${PORT}`);
  console.log(`APP_SECRET: ${hasSecret}`);
});
