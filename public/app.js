(function () {
  const durationScript = document.getElementById("duration-plan-data");
  const durationRoot = document.querySelector("[data-duration-root]");
  const roleplayScript = document.getElementById("roleplay-data");
  const root = document.querySelector("[data-roleplay-root]");

  if (durationScript && durationRoot) {
    const durationPlan = JSON.parse(durationScript.textContent);
    const summary = durationRoot.querySelector("[data-duration-summary]");
    const options = Array.from(durationRoot.querySelectorAll("[data-duration-option]"));

    function applyDuration(value) {
      const plan = durationPlan[value] || durationPlan["50"];
      document.documentElement.dataset.lessonDuration = value;
      if (summary) {
        summary.textContent = plan.summary;
      }

      document.querySelectorAll("[data-section]").forEach((section) => {
        const sectionName = section.getAttribute("data-section");
        const hidden = (plan.hiddenSections || []).includes(sectionName);
        section.hidden = hidden;
      });

      document.querySelectorAll("[data-item-index]").forEach((item) => {
        item.hidden = false;
      });

      Object.entries(plan.limits || {}).forEach(([sectionName, limit]) => {
        const section = document.querySelector(`[data-section="${sectionName}"]`);
        if (!section) {
          return;
        }
        section.querySelectorAll("[data-item-index]").forEach((item) => {
          const index = Number(item.getAttribute("data-item-index"));
          item.hidden = index >= limit;
        });
      });
    }

    options.forEach((option) => {
      option.addEventListener("change", function () {
        if (option.checked) {
          applyDuration(option.value);
        }
      });
    });

    const selected = options.find((option) => option.checked)?.value || "50";
    applyDuration(selected);
  }

  if (!roleplayScript || !root) {
    return;
  }

  const roleplay = JSON.parse(roleplayScript.textContent);
  const chatLog = root.querySelector("[data-chat-log]");
  const input = root.querySelector("[data-chat-input]");
  const sendButton = root.querySelector("[data-send-button]");
  const coachMessage = root.querySelector("[data-coach-message]");
  const coachExamples = root.querySelector("[data-coach-examples]");

  let currentTurn = 0;

  function setCoachFeedback(message, examples) {
    coachMessage.textContent = message;
    coachExamples.innerHTML = "";
    (examples || []).forEach((example) => {
      const item = document.createElement("li");
      item.textContent = example;
      coachExamples.appendChild(item);
    });
  }

  function appendMessage(speaker, text, type) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${type}`;
    bubble.innerHTML = `<strong>${speaker}</strong><span>${text}</span>`;
    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function normalize(text) {
    return text.replace(/\s+/g, "").toLowerCase();
  }

  function matchesTurn(turn, normalizedText) {
    if (Array.isArray(turn.expectedKeywordGroups) && turn.expectedKeywordGroups.length > 0) {
      return turn.expectedKeywordGroups.every((group) =>
        group.some((keyword) => normalizedText.includes(normalize(keyword)))
      );
    }

    return turn.expectedKeywords.some((keyword) => normalizedText.includes(normalize(keyword)));
  }

  function advanceTurn() {
    currentTurn = Math.min(currentTurn + 1, roleplay.turns.length - 1);
  }

  function handleStudentTurn(rawText) {
    const text = rawText.trim();
    if (!text) {
      return;
    }

    appendMessage("학생", text, "student");
    input.value = "";

    const turn = roleplay.turns[currentTurn] || roleplay.turns[roleplay.turns.length - 1];
    const normalized = normalize(text);
    const matched = matchesTurn(turn, normalized);

    if (matched) {
      setCoachFeedback(turn.successMessage || roleplay.successMessage, turn.extraExamples || []);
    } else {
      setCoachFeedback(
        turn.coachTip || "좋아요. 의미는 전달됐어요. 아래 예시처럼 더 자연스럽게도 말할 수 있어요.",
        turn.extraExamples || []
      );
      if (turn.repairExample) {
        appendMessage("코치", `이렇게도 말할 수 있어요: ${turn.repairExample}`, "coach");
      }
    }

    advanceTurn();
  }

  sendButton.addEventListener("click", function () {
    handleStudentTurn(input.value);
  });

  input.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      handleStudentTurn(input.value);
    }
  });

  if (roleplay.openingMessage) {
    appendMessage(roleplay.teacherRole, roleplay.openingMessage, "teacher");
  }
  setCoachFeedback(roleplay.initialCoachMessage, roleplay.initialExamples || []);
})();
