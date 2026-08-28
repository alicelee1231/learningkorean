(function () {
  const roleplayScript = document.getElementById("roleplay-data");
  const root = document.querySelector("[data-roleplay-root]");

  if (!roleplayScript || !root) {
    return;
  }

  const roleplay = JSON.parse(roleplayScript.textContent);
  const chatLog = root.querySelector("[data-chat-log]");
  const input = root.querySelector("[data-chat-input]");
  const sendButton = root.querySelector("[data-send-button]");
  const speechButton = root.querySelector("[data-speech-button]");
  const coachMessage = root.querySelector("[data-coach-message]");
  const coachExamples = root.querySelector("[data-coach-examples]");

  let currentTurn = 0;
  let speechRecognition = null;

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

  function handleStudentTurn(rawText) {
    const text = rawText.trim();
    if (!text) {
      return;
    }

    appendMessage("학생", text, "student");
    input.value = "";

    const turn = roleplay.turns[currentTurn] || roleplay.turns[roleplay.turns.length - 1];
    const normalized = normalize(text);
    const matched = turn.expectedKeywords.some((keyword) => normalized.includes(normalize(keyword)));

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

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    speechButton.disabled = true;
    speechButton.textContent = "음성 입력 미지원";
  } else {
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = "ko-KR";
    speechRecognition.interimResults = false;
    speechRecognition.maxAlternatives = 1;

    speechRecognition.addEventListener("result", function (event) {
      const transcript = event.results[0][0].transcript || "";
      input.value = transcript;
      handleStudentTurn(transcript);
    });

    speechRecognition.addEventListener("end", function () {
      speechButton.dataset.active = "false";
      speechButton.textContent = "음성 입력";
    });

    speechButton.addEventListener("click", function () {
      if (speechButton.dataset.active === "true") {
        speechRecognition.stop();
        return;
      }

      speechButton.dataset.active = "true";
      speechButton.textContent = "듣는 중...";
      speechRecognition.start();
    });
  }

  if (roleplay.openingMessage) {
    appendMessage(roleplay.teacherRole, roleplay.openingMessage, "teacher");
  }
  setCoachFeedback(roleplay.initialCoachMessage, roleplay.initialExamples || []);
})();
