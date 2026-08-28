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

function safeJsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderLayout({ title, body, extraScripts = "" }) {
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
    <script src="/app.js" defer></script>
    ${extraScripts}
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
    title: "한국어 수업 자료실",
    body: `
      <section class="hero">
        <p class="eyebrow">교사용</p>
        <h1>시간 제한 한국어 수업 링크</h1>
        <p class="lead">
          학생은 만료 시간이 포함된 서명 링크로만 수업 자료를 열 수 있어요.
        </p>
        <div class="code-block">
          <code>npm run generate-link -- sample-cafe-ordering "학생 이름" 60</code>
        </div>
      </section>

      <section class="panel">
        <h2>사용 방법</h2>
        <ol>
          <li><code>data/lessons</code> 폴더에 레슨 JSON 파일을 추가해요.</li>
          <li>수업 전에 학생용 링크를 생성해요.</li>
          <li>학생에게 링크를 보내요.</li>
          <li>시간이 지나면 링크가 자동으로 만료돼요.</li>
        </ol>
      </section>

      <section class="panel">
        <h2>현재 레슨 목록</h2>
        <ul class="lesson-list">${lessonsMarkup}</ul>
      </section>
    `
  });
}

function renderErrorPage(message, detail) {
  return renderLayout({
    title: "수업 링크가 잠겼어요",
    body: `
      <section class="hero error">
        <p class="eyebrow">접속 종료</p>
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
  const studentName = payload.studentName || "수강생";
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
          ${line.translation ? `<span class="translation">${escapeHtml(line.translation)}</span>` : ""}
        </div>`
    )
    .join("");

  const grammarMarkup = lesson.grammar
    .map(
      (point) => `
      <article class="card">
        <h3>${escapeHtml(point.name)}</h3>
        <p><strong>형태:</strong> ${escapeHtml(point.form)}</p>
        <p><strong>의미:</strong> ${escapeHtml(point.meaning)}</p>
        <p><strong>이 수업에서 쓰는 이유:</strong> ${escapeHtml(point.whyItAppears)}</p>
        <p><strong>자주 하는 실수:</strong> ${escapeHtml(point.commonMistake)}</p>
        <ul>${renderList(point.examples)}</ul>
      </article>`
    )
    .join("");

  const levelLabelMap = {
    Beginner: "초급",
    Intermediate: "중급",
    Advanced: "고급"
  };
  const lessonLevel = levelLabelMap[lesson.level] || lesson.level;
  const roleplayData = lesson.roleplayMode || null;

  return renderLayout({
    title: lesson.title,
    body: `
      <section class="hero">
        <p class="eyebrow">${escapeHtml(lessonLevel)} 수업</p>
        <h1>${escapeHtml(lesson.title)}</h1>
        <p class="lead">${escapeHtml(lesson.speakingGoal)}</p>
        <div class="meta-grid">
          <div><strong>수강생</strong><span>${escapeHtml(studentName)}</span></div>
          <div><strong>주제</strong><span>${escapeHtml(lesson.topic)}</span></div>
          <div><strong>문법 목표</strong><span>${escapeHtml(lesson.grammarGoal)}</span></div>
          <div><strong>접속 만료</strong><span>${escapeHtml(expiresAt)}</span></div>
        </div>
      </section>

      <section class="panel">
        <h2>도입 질문</h2>
        <ul>${renderList(lesson.warmupQuestions)}</ul>
      </section>

      <section class="panel">
        <h2>핵심 표현</h2>
        <table>
          <thead>
            <tr><th>표현</th><th>뜻</th><th>쓰는 상황</th><th>메모</th></tr>
          </thead>
          <tbody>${expressionsRows}</tbody>
        </table>
      </section>

      <section class="panel">
        <h2>문법 설명</h2>
        <div class="cards">${grammarMarkup}</div>
      </section>

      <section class="panel">
        <h2>핵심 대화</h2>
        <div class="dialogue">${dialogueMarkup}</div>
      </section>

      ${
        roleplayData
          ? `
      <section class="panel">
        <h2>상황극 대화 연습</h2>
        <div class="roleplay-meta">
          <div><strong>상황</strong><span>${escapeHtml(roleplayData.scene)}</span></div>
          <div><strong>선생님 역할</strong><span>${escapeHtml(roleplayData.teacherRole)}</span></div>
          <div><strong>학생 역할</strong><span>${escapeHtml(roleplayData.studentRole)}</span></div>
        </div>
        <p class="roleplay-help">${escapeHtml(roleplayData.instructions)}</p>
        <div class="roleplay-app" data-roleplay-root>
          <div class="chat-log" data-chat-log></div>
          <div class="coach-box" data-coach-box>
            <strong>즉시 피드백</strong>
            <p data-coach-message>상황극을 시작하면 여기에서 문장 힌트와 수정 포인트를 볼 수 있어요.</p>
            <ul data-coach-examples></ul>
          </div>
          <div class="chat-controls">
            <textarea data-chat-input rows="3" placeholder="여기에 말하거나 입력해 보세요."></textarea>
            <div class="chat-actions">
              <button type="button" class="secondary-button" data-speech-button>음성 입력</button>
              <button type="button" class="primary-button" data-send-button>보내기</button>
            </div>
          </div>
        </div>
      </section>`
          : ""
      }

      <section class="panel">
        <h2>발음 연습</h2>
        <ul>${renderList(lesson.pronunciationNotes)}</ul>
      </section>

      <section class="panel">
        <h2>어휘 확장</h2>
        <table>
          <thead>
            <tr><th>단어</th><th>뜻</th><th>자주 쓰는 표현</th><th>예문</th></tr>
          </thead>
          <tbody>${vocabularyRows}</tbody>
        </table>
      </section>

      <section class="panel split">
        <div>
          <h2>바꿔 말하기 연습</h2>
          <p class="base-pattern">${escapeHtml(lesson.substitution.basePattern)}</p>
          <ul>${renderList(lesson.substitution.examples)}</ul>
        </div>
        <div>
          <h2>자유 말하기</h2>
          <ul>${renderList(lesson.freeSpeakingQuestions)}</ul>
        </div>
      </section>

      <section class="panel split">
        <div>
          <h2>역할극 연습</h2>
          <ul>${renderList(lesson.roleplayPractice)}</ul>
        </div>
        <div>
          <h2>숙제</h2>
          <ul>${renderList(lesson.homework)}</ul>
        </div>
      </section>
    `,
    extraScripts: roleplayData
      ? `<script id="roleplay-data" type="application/json">${safeJsonForScript(roleplayData)}</script>`
      : ""
  });
}

function serveStaticAsset(requestPath, response) {
  const assetPath = path.join(PUBLIC_DIR, requestPath);
  if (!assetPath.startsWith(PUBLIC_DIR) || !fs.existsSync(assetPath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  let contentType = "text/plain; charset=utf-8";
  if (assetPath.endsWith(".css")) {
    contentType = "text/css; charset=utf-8";
  } else if (assetPath.endsWith(".js")) {
    contentType = "application/javascript; charset=utf-8";
  }
  response.writeHead(200, { "Content-Type": contentType });
  response.end(fs.readFileSync(assetPath));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/styles.css") {
    serveStaticAsset("styles.css", response);
    return;
  }

  if (url.pathname === "/app.js") {
    serveStaticAsset("app.js", response);
    return;
  }

  if (url.pathname === "/api/lessons") {
    jsonResponse(response, 200, { lessons: listLessons() });
    return;
  }

  if (url.pathname === "/lesson") {
    if (!APP_SECRET) {
      response.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderErrorPage("서버 설정이 아직 끝나지 않았어요.", "APP_SECRET을 설정한 뒤 다시 실행해 주세요."));
      return;
    }

    const result = verifyToken(url.searchParams.get("token"), APP_SECRET);

    if (!result.ok) {
      response.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderErrorPage("이 수업 링크는 더 이상 사용할 수 없어요.", "선생님에게 새 수업 링크를 요청해 주세요."));
      return;
    }

    const lesson = loadLesson(result.payload.lessonId);

    if (!lesson) {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderErrorPage("수업을 찾을 수 없어요.", "이 링크에 연결된 수업 자료를 불러오지 못했어요."));
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
