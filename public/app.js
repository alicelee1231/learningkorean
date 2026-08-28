(function () {
  const durationScript = document.getElementById("duration-plan-data");
  const durationRoot = document.querySelector("[data-duration-root]");
  const orderingScript = document.getElementById("ordering-data");
  const orderingRoot = document.querySelector("[data-ordering-root]");
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

  document.querySelectorAll("[data-check-blank]").forEach((button) => {
    button.addEventListener("click", function () {
      const card = button.closest(".exercise-card");
      const input = card.querySelector("[data-blank-input]");
      const feedback = card.querySelector("[data-blank-feedback]");
      const answer = (input.dataset.answer || "").trim().replace(/\s+/g, "");
      const typed = input.value.trim().replace(/\s+/g, "");

      if (!typed) {
        feedback.textContent = "먼저 정답을 입력해 보세요.";
        feedback.dataset.state = "idle";
        return;
      }

      if (typed === answer) {
        feedback.textContent = "좋아요. 정답이에요.";
        feedback.dataset.state = "correct";
      } else {
        feedback.textContent = `다시 생각해 보세요. 정답: ${input.dataset.answer}`;
        feedback.dataset.state = "incorrect";
      }
    });
  });

  if (orderingScript && orderingRoot) {
    const orderingItems = JSON.parse(orderingScript.textContent);
    const list = orderingRoot.querySelector("[data-ordering-list]");
    const shuffleButton = orderingRoot.querySelector("[data-ordering-shuffle]");
    const answerButton = orderingRoot.querySelector("[data-ordering-answer]");

    function renderOrdering(items) {
      list.innerHTML = "";
      items.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "ordering-item";
        row.innerHTML = `<span class="ordering-number">${index + 1}</span><span>${item}</span>`;
        list.appendChild(row);
      });
    }

    function shuffled(items) {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    shuffleButton.addEventListener("click", function () {
      renderOrdering(shuffled(orderingItems));
    });

    answerButton.addEventListener("click", function () {
      renderOrdering(orderingItems);
    });

    renderOrdering(shuffled(orderingItems));
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
      if (turn.teacherReply) {
        appendMessage(roleplay.teacherRole, turn.teacherReply, "teacher");
      }
      currentTurn = Math.min(currentTurn + 1, roleplay.turns.length - 1);
      return;
    }

    setCoachFeedback(turn.coachTip, turn.extraExamples || []);
    appendMessage("코치", turn.repairExample, "coach");
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
