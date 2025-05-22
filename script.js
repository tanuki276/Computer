document.addEventListener("DOMContentLoaded", () => {
    const kanjiEl = document.getElementById("kanji");
    const kanaEl = document.getElementById("kana");
    const inputEl = document.getElementById("romajiInput");
    const typedFeedbackEl = document.getElementById("typedFeedback"); // 新しい要素
    const timeModeEl = document.getElementById("timeMode");
    const customSecondsWrapper = document.getElementById("customSecondsWrapper");
    const customSecondsEl = document.getElementById("customSeconds");
    const timerDisplay = document.getElementById("timerDisplay");
    const scoreDisplay = document.getElementById("scoreDisplay");
    const wordCategoryEl = document.getElementById("wordCategory");
    const startGameButton = document.getElementById("startGameButton");
    const settingsButton = document.getElementById("settingsButton");
    const settingsPanel = document.getElementById("settingsPanel");
    const gameCard = document.getElementById("gameCard");
    const overlay = document.getElementById("overlay");
    const saveSettingsButton = document.getElementById("saveSettingsButton");
    const resultModal = document.getElementById("resultModal");
    const finalScoreEl = document.getElementById("finalScore");
    const correctWordsEl = document.getElementById("correctWords");
    const mistypedCharsEl = document.getElementById("mistypedChars");
    const closeResultButton = document.getElementById("closeResultButton");

    let words = [];
    let currentWord = null;
    let currentRomajiIndex = 0; // 現在入力すべきローマ字のインデックス
    let timeLimit = null;
    let timer = null;
    let secondsLeft = 0;
    let score = 0;
    let correctWordCount = 0;
    let mistypeCount = 0;

    // --- イベントリスナー ---

    // 制限時間モードの変更時にカスタム秒数入力欄の表示を切り替える
    timeModeEl.addEventListener("change", () => {
        customSecondsWrapper.style.display = (timeModeEl.value === "custom" || timeModeEl.value === "reset") ? "block" : "none";
    });

    // ゲームスタートボタン
    startGameButton.addEventListener("click", startGame);

    // 設定ボタン
    settingsButton.addEventListener("click", toggleSettings);

    // 設定保存ボタン
    saveSettingsButton.addEventListener("click", () => {
        toggleSettings();
        // 設定を保存した後にゲームを停止状態に戻す
        stopGame();
        // 新しいカテゴリで単語データを読み込み直す
        fetchData(wordCategoryEl.value);
    });

    // カテゴリ変更時
    wordCategoryEl.addEventListener("change", () => {
        // カテゴリ変更時はゲームを停止状態に戻す
        stopGame();
        // 新しいカテゴリで単語データを読み込み直す (saveSettingsButtonで再読み込みされるため、ここでは不要だが念のため)
        // fetchData(wordCategoryEl.value);
    });

    // 入力イベント (リアルタイムフィードバックと正誤判定)
    inputEl.addEventListener("input", () => {
        if (!currentWord || inputEl.disabled) return;

        const typedValue = inputEl.value;
        const targetRomaji = currentWord.romaji;
        let feedbackHtml = '';
        let isCorrectSoFar = true;

        for (let i = 0; i < targetRomaji.length; i++) {
            if (i < typedValue.length) {
                if (typedValue[i] === targetRomaji[i]) {
                    feedbackHtml += `<span class="correct">${typedValue[i]}</span>`;
                } else {
                    feedbackHtml += `<span class="incorrect">${typedValue[i]}</span>`;
                    isCorrectSoFar = false; // ミスタイプがあったらフラグを立てる
                }
            } else {
                feedbackHtml += `<span class="placeholder">${targetRomaji[i]}</span>`; // 未入力部分
            }
        }
        typedFeedbackEl.innerHTML = feedbackHtml;

        // 入力欄のボーダー色変更
        if (typedValue.length === 0) {
            inputEl.classList.remove("correct-input", "incorrect-input");
        } else if (isCorrectSoFar && typedValue.length > 0) {
            inputEl.classList.add("correct-input");
            inputEl.classList.remove("incorrect-input");
        } else {
            inputEl.classList.add("incorrect-input");
            inputEl.classList.remove("correct-input");
        }
    });

    // Enterキーでの判定
    inputEl.addEventListener("keydown", (e) => {
        if (inputEl.disabled) return;

        if (e.key === "Enter") {
            const typedRomaji = inputEl.value.toLowerCase().trim(); // 余分なスペースを削除

            // AltRomajiも考慮
            const isAltRomajiMatch = currentWord.altRomaji && Array.isArray(currentWord.altRomaji) && currentWord.altRomaji.includes(typedRomaji);

            if (typedRomaji === currentWord.romaji || isAltRomajiMatch) {
                score++;
                correctWordCount++;
                updateScoreDisplay();
                setNewWord(); // 次の単語へ

                // 制限時間リセットモード
                if (timeModeEl.value === "reset" && timeLimit !== null) {
                    secondsLeft = timeLimit;
                    timerDisplay.textContent = `残り: ${secondsLeft} 秒`;
                }

                // 正解時の視覚フィードバック
                kanjiEl.classList.add('correct-word-animation');
                kanaEl.classList.add('correct-word-animation');
                inputEl.classList.remove("incorrect-input"); // 正解したら赤枠を消す
                inputEl.classList.add("correct-input"); // 正解したら緑枠にする
                setTimeout(() => {
                    kanjiEl.classList.remove('correct-word-animation');
                    kanaEl.classList.remove('correct-word-animation');
                    inputEl.classList.remove("correct-input"); // 次の単語で緑枠も消す
                }, 300); // アニメーション時間に合わせて調整
            } else {
                // 不正解時の処理 (ミスタイプ数をカウント)
                mistypeCount++;
                inputEl.classList.add("incorrect-input"); // 不正解時に赤枠にする
                // 不正解時のアニメーション（例：少し揺らすなど）を追加しても良い
            }
        }
    });

    // リザルトモーダルを閉じる
    closeResultButton.addEventListener("click", () => {
        resultModal.classList.add("hidden");
        overlay.classList.add("hidden");
        // ゲームを初期状態に戻す
        kanjiEl.textContent = "スタートボタンを押して開始！";
        kanaEl.textContent = "";
        timerDisplay.textContent = "";
        scoreDisplay.textContent = "スコア: 0";
    });

    // --- 主要な関数 ---

    // JSONデータ読み込み
    function fetchData(categoryFile) {
        kanjiEl.textContent = "データ読み込み中...";
        kanaEl.textContent = "";
        words = []; // 既存のデータをクリア

        fetch(categoryFile)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                words = data;
                if (settingsPanel.classList.contains("hidden")) { // 設定パネルが開いていない場合のみ表示を更新
                    kanjiEl.textContent = "スタートボタンを押して開始！";
                    kanaEl.textContent = "";
                }
                inputEl.disabled = true; // 初期状態では入力無効
            })
            .catch(err => {
                kanjiEl.textContent = "データ読み込み失敗";
                kanaEl.textContent = `${categoryFile} が見つからないか、形式が正しくありません。`;
                console.error(`Error loading ${categoryFile}:`, err);
                inputEl.disabled = true; // エラー時は入力無効
            });
    }

    // ゲーム開始
    function startGame() {
        if (words.length === 0) {
            kanjiEl.textContent = "単語データが読み込まれていません。";
            kanaEl.textContent = "カテゴリを選択するか、JSONファイルを確認してください。";
            return;
        }

        if (!settingsPanel.classList.contains("hidden")) {
            toggleSettings(); // 設定パネルが開いていたら閉じる
        }

        // ゲーム状態のリセット
        score = 0;
        correctWordCount = 0;
        mistypeCount = 0;
        updateScoreDisplay();
        inputEl.value = "";
        inputEl.classList.remove("correct-input", "incorrect-input");
        typedFeedbackEl.innerHTML = '';
        inputEl.disabled = false;
        inputEl.focus();

        setNewWord(); // 最初の単語を設定

        const mode = timeModeEl.value;
        if (mode === "custom" || mode === "reset") {
            timeLimit = parseInt(customSecondsEl.value) || 30;
        } else if (mode === "30") {
            timeLimit = 30;
        } else if (mode === "60") {
            timeLimit = 60;
        } else {
            timeLimit = null; // 制限なし
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
            timerDisplay.textContent = "制限なし"; // 制限なしモードの表示
        }
    }

    // 次の単語を設定
    function setNewWord() {
        currentWord = words[Math.floor(Math.random() * words.length)];
        kanjiEl.textContent = currentWord.kanji;
        kanaEl.textContent = currentWord.kana;
        inputEl.value = ""; // 入力欄をクリア
        typedFeedbackEl.innerHTML = ''; // フィードバックもクリア
        inputEl.classList.remove("correct-input", "incorrect-input"); // 色をリセット
        currentRomajiIndex = 0; // ローマ字インデックスをリセット
    }

    // ゲーム終了
    function stopGame() {
        clearInterval(timer);
        kanjiEl.textContent = "終了！";
        kanaEl.textContent = "";
        inputEl.disabled = true;
        inputEl.value = "";
        typedFeedbackEl.innerHTML = '';
        timerDisplay.textContent = "終了！";
        inputEl.classList.remove("correct-input", "incorrect-input"); // 色をリセット

        // リザルト画面を表示
        showResultModal();
    }

    // スコア表示を更新
    function updateScoreDisplay() {
        scoreDisplay.textContent = `スコア: ${score}`;
    }

    // 設定パネルの表示/非表示を切り替える
    function toggleSettings() {
        settingsPanel.classList.toggle("hidden");
        gameCard.classList.toggle("hidden");
        overlay.classList.toggle("hidden");

        if (!settingsPanel.classList.contains("hidden")) {
            // 設定パネルが開いたらタイマーを停止
            clearInterval(timer);
        }
    }

    // リザルトモーダルを表示
    function showResultModal() {
        finalScoreEl.textContent = score;
        correctWordsEl.textContent = correctWordCount;
        mistypedCharsEl.textContent = mistypeCount; // 必要に応じてミスタイプ文字数をカウントするロジックを追加

        resultModal.classList.remove("hidden");
        overlay.classList.remove("hidden");
    }

    // --- 初期化 ---
    // ページ読み込み時にデフォルトのカテゴリの単語を読み込む
    fetchData(wordCategoryEl.value);
    // 初期状態でカスタム秒数入力欄の表示を更新
    timeModeEl.dispatchEvent(new Event('change'));
});
