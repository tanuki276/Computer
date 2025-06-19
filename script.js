document.addEventListener("DOMContentLoaded", () => {
  const kanjiEl = document.getElementById("kanji");
  const kanaEl = document.getElementById("kana");
  const inputEl = document.getElementById("romajiInput");
  const typedFeedbackEl = document.getElementById("typedFeedback");
  const timerDisplay = document.getElementById("timerDisplay");
  const scoreDisplay = document.getElementById("scoreDisplay");
  const highScoreDisplay = document.getElementById("highScoreDisplay");
  const startGameButton = document.getElementById("startGameButton");
  const settingsButton = document.getElementById("settingsButton");
  const gameCard = document.getElementById("gameCard");

  const settingsPanel = document.getElementById("settingsPanel");
  const wordCategorySettingsEl = document.getElementById("wordCategorySettings");
  const timeModeSettingsEl = document.getElementById("timeModeSettings");
  const customSecondsWrapperSettings = document.getElementById("customSecondsWrapperSettings");
  const customSecondsSettingsEl = document.getElementById("customSecondsSettings");
  const saveSettingsButton = document.getElementById("saveSettingsButton");
  const closeSettingsButton = document.getElementById("closeSettingsButton");

  const resultModal = document.getElementById("resultModal");
  const finalScoreEl = document.getElementById("finalScore");
  const correctWordsEl = document.getElementById("correctWords");
  const mistypedCharsEl = document.getElementById("mistypedChars");
  const closeResultButton = document.getElementById("closeResultButton");

  const overlay = document.getElementById("overlay");

  let words = [];
  let wordsQueue = [];
  let currentWord = null;
  let timeLimit = null;
  let timer = null;
  let secondsLeft = 0;
  let score = 0;
  let correctWordCount = 0;
  let mistypeCount = 0;

  const getHighScore = () => {
    const stored = localStorage.getItem("typingGameHighScore");
    if (!stored) return 0;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const setHighScore = (newScore) => {
    if (newScore > getHighScore()) {
      localStorage.setItem("typingGameHighScore", String(newScore));
      highScoreDisplay.textContent = `最高スコア: ${newScore}`;
    }
  };

  highScoreDisplay.textContent = `最高スコア: ${getHighScore()}`;

  const toggleHidden = (element, hide) => {
    if (hide) {
      element.classList.add("hidden");
    } else {
      element.classList.remove("hidden");
    }
  };

  async function fetchData(categoryFile) {
    kanjiEl.textContent = "データ読み込み中...";
    kanaEl.textContent = "";
    words = [];
    wordsQueue = [];

    try {
      const res = await fetch(categoryFile);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      words = data;
      kanjiEl.textContent = "スタートボタンを押して開始！";
      kanaEl.textContent = "";
      inputEl.disabled = true;
    } catch (err) {
      kanjiEl.textContent = "データ読み込み失敗";
      kanaEl.textContent = `${categoryFile} が読み込めません`;
      console.error(`Error loading ${categoryFile}:`, err);
      inputEl.disabled = true;
    }
  }

  function startGame() {
    if (words.length === 0) {
      kanjiEl.textContent = "単語データが読み込めてないよ";
      kanaEl.textContent = "カテゴリーを選択して！";
      return;
    }

    if (!settingsPanel.classList.contains("hidden")) {
      toggleSettings(false);
    }

    score = 0;
    correctWordCount = 0;
    mistypeCount = 0;
    updateScoreDisplay();
    inputEl.value = "";
    inputEl.classList.remove("correct-input", "incorrect-input");
    typedFeedbackEl.innerHTML = '';
    inputEl.disabled = false;
    inputEl.focus();

    wordsQueue = [...words].sort(() => Math.random() - 0.5);

    setNewWord();

    const mode = timeModeSettingsEl.value;
    if (mode === "custom" || mode === "reset") {
      timeLimit = parseInt(customSecondsSettingsEl.value) || 30;
      if(mode === "reset") timeLimit = null;
    } else if (mode === "30") {
      timeLimit = 30;
    } else if (mode === "60") {
      timeLimit = 60;
    } else {
      timeLimit = null;
    }

    if (timeLimit !== null) {
      clearInterval(timer);
      secondsLeft = timeLimit;
      timerDisplay.textContent = `残り: ${secondsLeft} 秒`;

      timer = setInterval(() => {
        secondsLeft--;
        timerDisplay.textContent = `残り: ${secondsLeft} 秒`;
        if (secondsLeft <= 0) {
          stopGame();
        }
      }, 1000);
    } else {
      clearInterval(timer);
      timerDisplay.textContent = "制限なし";
    }
  }

  function setNewWord() {
    if (wordsQueue.length === 0) {
      stopGame();
      return;
    }
    currentWord = wordsQueue.shift();
    kanjiEl.textContent = currentWord.kanji;
    kanaEl.textContent = currentWord.kana;
    inputEl.value = "";
    typedFeedbackEl.innerHTML = '';
    inputEl.classList.remove("correct-input", "incorrect-input");
    inputEl.focus();
  }

  function stopGame() {
    clearInterval(timer);
    kanjiEl.textContent = "終了！";
    kanaEl.textContent = "";
    inputEl.disabled = true;
    inputEl.value = "";
    typedFeedbackEl.innerHTML = '';
    timerDisplay.textContent = "終了！";
    inputEl.classList.remove("correct-input", "incorrect-input");

    setHighScore(score);

    showResultModal();
  }

  function updateScoreDisplay() {
    scoreDisplay.textContent = `スコア: ${score}`;
  }

  function toggleSettings(show) {
    toggleHidden(settingsPanel, !show);
    toggleHidden(gameCard, show);

    const shouldShowOverlay = show || !resultModal.classList.contains("hidden");
    toggleHidden(overlay, !shouldShowOverlay);

    if (show) {
      clearInterval(timer);
      kanjiEl.textContent = "設定を変更してね！";
      kanaEl.textContent = "";
      inputEl.disabled = true;

      wordCategorySettingsEl.value = wordCategorySettingsEl.value;
      timeModeSettingsEl.value = timeModeSettingsEl.value;
      customSecondsSettingsEl.value = customSecondsSettingsEl.value;

      timeModeSettingsEl.dispatchEvent(new Event('change'));
    } else {
      kanjiEl.textContent = "スタートボタンを押して開始！";
      kanaEl.textContent = "";
      timerDisplay.textContent = "";
      scoreDisplay.textContent = `スコア: 0`;
      score = 0;
    }
  }

  function showResultModal() {
    finalScoreEl.textContent = score;
    correctWordsEl.textContent = correctWordCount;
    mistypedCharsEl.textContent = mistypeCount;

    toggleHidden(resultModal, false);
    toggleHidden(overlay, false);
  }

  startGameButton.addEventListener("click", startGame);

  settingsButton.addEventListener("click", () => toggleSettings(true));

  saveSettingsButton.addEventListener("click", async () => {
    const selectedCategoryFile = wordCategorySettingsEl.value;

    await fetchData(selectedCategoryFile);

    toggleSettings(false);

    kanjiEl.textContent = "スタートボタンを押して開始！";
    kanaEl.textContent = "";
    inputEl.value = "";
    typedFeedbackEl.innerHTML = "";
    inputEl.disabled = true;
    timerDisplay.textContent = "";
    scoreDisplay.textContent = "スコア: 0";
    score = 0;
    correctWordCount = 0;
    mistypeCount = 0;
  });

  closeSettingsButton.addEventListener("click", () => {
    toggleSettings(false);
  });

  inputEl.addEventListener("input", () => {
    const inputText = inputEl.value;
    if (!currentWord) return;

    const expected = currentWord.kana;
    let feedback = '';
    let allCorrect = true;

    for (let i = 0; i < inputText.length; i++) {
      if (inputText[i] === expected[i]) {
        feedback += `<span class="correct">${inputText[i]}</span>`;
      } else {
        feedback += `<span class="incorrect">${inputText[i]}</span>`;
        allCorrect = false;
        mistypeCount++;
      }
    }

    for (let i = inputText.length; i < expected.length; i++) {
      feedback += expected[i];
      allCorrect = false;
    }

    typedFeedbackEl.innerHTML = feedback;

    inputEl.classList.toggle("correct-input", allCorrect && inputText.length === expected.length);
    inputEl.classList.toggle("incorrect-input", !allCorrect);

    if (inputText === expected) {
      score += 10;
      correctWordCount++;
      updateScoreDisplay();
      setNewWord();
    }
  });

  closeResultButton.addEventListener("click", () => {
    toggleHidden(resultModal, true);
    toggleHidden(overlay, true);
  });

  timeModeSettingsEl.addEventListener('change', function() {
    const selectedMode = this.value;
    const showCustomSeconds = selectedMode === 'custom' || selectedMode === 'reset';
    toggleHidden(customSecondsWrapperSettings, !showCustomSeconds);
  });

  fetchData("general.json");

  inputEl.addEventListener("blur", () => {
    setTimeout(() => {
      if (!inputEl.disabled && document.activeElement !== inputEl) {
        inputEl.focus();
      }
    }, 100);
  });
});
