document.addEventListener("DOMContentLoaded", () => {
    // UI要素の取得
    const kanjiEl = document.getElementById("kanji");
    const kanaEl = document.getElementById("kana");
    const inputEl = document.getElementById("romajiInput");
    const typedFeedbackEl = document.getElementById("typedFeedback");
    const timerDisplay = document.getElementById("timerDisplay");
    const scoreDisplay = document.getElementById("scoreDisplay");
    const startGameButton = document.getElementById("startGameButton");
    const settingsButton = document.getElementById("settingsButton");
    const gameCard = document.getElementById("gameCard");

    // 設定パネルの要素
    const settingsPanel = document.getElementById("settingsPanel");
    const wordCategorySettingsEl = document.getElementById("wordCategorySettings");
    const timeModeSettingsEl = document.getElementById("timeModeSettings");
    const customSecondsWrapperSettings = document.getElementById("customSecondsWrapperSettings");
    const customSecondsSettingsEl = document.getElementById("customSecondsSettings");
    const saveSettingsButton = document.getElementById("saveSettingsButton");
    const closeSettingsButton = document.getElementById("closeSettingsButton");

    // 結果モーダルの要素
    const resultModal = document.getElementById("resultModal");
    const finalScoreEl = document.getElementById("finalScore");
    const correctWordsEl = document.getElementById("correctWords");
    const mistypedCharsEl = document.getElementById("mistypedChars");
    const closeResultButton = document.getElementById("closeResultButton");

    // オーバーレイ
    const overlay = document.getElementById("overlay");

    // ゲームの状態変数
    let words = []; // 現在のカテゴリの全単語リスト
    let wordsQueue = []; // 出題される単語のキュー（シャッフルされたリスト）
    let currentWord = null;
    let timeLimit = null;
    let timer = null;
    let secondsLeft = 0;
    let score = 0;
    let correctWordCount = 0;
    let mistypeCount = 0; // 不正解の単語数として使用

    // --- ヘルパー関数 ---

    /**
     * 指定された要素にhiddenクラスを追加・削除します。
     * `hidden`クラスはCSSで`display: none;`を設定しています。
     * @param {HTMLElement} element - 対象のDOM要素
     * @param {boolean} hide - trueなら隠す (hiddenクラスを追加)、falseなら表示 (hiddenクラスを削除)
     */
    const toggleHidden = (element, hide) => {
        if (hide) {
            element.classList.add("hidden");
        } else {
            element.classList.remove("hidden");
        }
    };

    // --- データ読み込み ---

    /**
     * 指定されたカテゴリの単語データを読み込みます。
     * JSONファイルが最高ディレクトリに配置されていることを想定しています。
     * @param {string} categoryFile - JSONファイルのファイル名（例: "general.json"）
     */
    async function fetchData(categoryFile) {
        kanjiEl.textContent = "データ読み込み中...";
        kanaEl.textContent = "";
        words = []; // 既存のデータをクリア
        wordsQueue = []; // キューもクリア

        try {
            // JSONファイルが最高ディレクトリにあるため、ファイル名のみでfetchします
            const res = await fetch(categoryFile);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            words = data;
            // データ読み込み後、ゲーム開始前の初期表示状態に戻します
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

    // --- ゲームの管理 ---

    /**
     * ゲームを開始します。
     * 単語データの確認、ゲーム状態のリセット、タイマーの設定、最初の単語の表示を行います。
     */
    function startGame() {
        if (words.length === 0) {
            kanjiEl.textContent = "単語データが読み込めてないよ";
            kanaEl.textContent = "カテゴリーを選択して！";
            return;
        }

        // 設定パネルが開いていたら閉じます
        if (!settingsPanel.classList.contains("hidden")) {
            toggleSettings(false); // 設定パネルを閉じる
        }

        // ゲーム状態をリセット
        score = 0;
        correctWordCount = 0;
        mistypeCount = 0;
        updateScoreDisplay();
        inputEl.value = "";
        inputEl.classList.remove("correct-input", "incorrect-input");
        typedFeedbackEl.innerHTML = '';
        inputEl.disabled = false;
        inputEl.focus(); // 入力欄にフォーカス

        // 単語キューをシャッフルしてセット
        wordsQueue = [...words].sort(() => Math.random() - 0.5);

        setNewWord(); // 最初の単語を設定

        // 時間制限の設定 (設定パネルで選択された値を使用)
        const mode = timeModeSettingsEl.value;
        if (mode === "custom" || mode === "reset") {
            timeLimit = parseInt(customSecondsSettingsEl.value) || 30;
        } else if (mode === "30") {
            timeLimit = 30;
        } else if (mode === "60") {
            timeLimit = 60;
        } else {
            timeLimit = null; // 制限なし
        }

        if (timeLimit !== null) {
            clearInterval(timer); // 既存のタイマーがあればクリア
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

    /**
     * 次の単語をキューから取得し、画面に表示します。
     * キューが空の場合、ゲームを終了します。
     */
    function setNewWord() {
        if (wordsQueue.length === 0) {
            // 全ての単語を打ち終えたらゲーム終了
            stopGame();
            return;
        }
        currentWord = wordsQueue.shift(); // キューの先頭から単語を取り出す
        kanjiEl.textContent = currentWord.kanji;
        kanaEl.textContent = currentWord.kana;
        inputEl.value = ""; // 入力欄をクリア
        typedFeedbackEl.innerHTML = ''; // フィードバックもクリア
        inputEl.classList.remove("correct-input", "incorrect-input"); // 入力欄のスタイルをリセット
        inputEl.focus(); // 次の単語で自動的に入力欄にフォーカス
    }

    /**
     * ゲームを終了します。
     * タイマーの停止、入力の無効化、結果モーダルの表示、単語リストのリセットを行います。
     */
    function stopGame() {
        clearInterval(timer); // タイマーを停止
        kanjiEl.textContent = "終了！";
        kanaEl.textContent = "";
        inputEl.disabled = true; // 入力無効
        inputEl.value = ""; // 入力欄をクリア
        typedFeedbackEl.innerHTML = ''; // フィードバックをクリア
        timerDisplay.textContent = "終了！";
        inputEl.classList.remove("correct-input", "incorrect-input"); // 入力欄のスタイルをリセット

        showResultModal(); // 結果モーダルを表示

        // ここでは、ゲーム終了後に自動的に単語をリセットしない
        // 設定保存時にのみ新しいカテゴリをロードするように変更
    }

    /**
     * スコア表示を更新します。
     */
    function updateScoreDisplay() {
        scoreDisplay.textContent = `スコア: ${score}`;
    }

    // --- UI/UXインタラクション ---

    /**
     * 設定パネルの表示/非表示を切り替えます。
     * ゲームカードとオーバーレイの表示状態も同時に管理します。
     * @param {boolean} show - trueなら設定パネルを表示、falseなら非表示
     */
    function toggleSettings(show) {
        toggleHidden(settingsPanel, !show); // 設定パネルを表示/非表示
        toggleHidden(gameCard, show);       // ゲームカードを非表示/表示（設定パネルと排他的）

        // オーバーレイは、設定パネルが表示されている、または結果モーダルが表示されている場合に表示
        const shouldShowOverlay = show || !resultModal.classList.contains("hidden");
        toggleHidden(overlay, !shouldShowOverlay);

        if (show) { // 設定パネルを表示する場合
            clearInterval(timer); // ゲームタイマーを停止（ゲーム中の場合）
            // ゲーム中の単語表示を初期状態に戻す
            kanjiEl.textContent = "設定を変更してね！";
            kanaEl.textContent = "";
            inputEl.disabled = true;

            // 設定パネルの入力要素に現在のゲーム設定値を反映
            // HTMLのwordCategorySettingsEl, timeModeSettingsEl, customSecondsSettingsElは、
            // ゲーム設定を反映させるために直接更新する必要がある。
            // 逆に、saveSettingsButtonでこれらの値を読み取ってゲーム側の設定に適用する。
            wordCategorySettingsEl.value = wordCategorySettingsEl.value; // 初期値または保存された値
            timeModeSettingsEl.value = timeModeSettingsEl.value;         // 初期値または保存された値
            customSecondsSettingsEl.value = customSecondsSettingsEl.value; // 初期値または保存された値

            // カスタム秒数入力欄の表示/非表示を更新 (設定パネル内の要素に対して)
            timeModeSettingsEl.dispatchEvent(new Event('change'));
        } else { // 設定パネルを閉じる場合
            // ゲームカードの表示を再開し、タイマー表示をリセット
            kanjiEl.textContent = "スタートボタンを押して開始！";
            kanaEl.textContent = "";
            timerDisplay.textContent = ""; // タイマー表示もクリア
            scoreDisplay.textContent = "スコア: 0"; // スコアもリセット
        }
    }

    /**
     * ゲーム結果モーダルを表示します。
     * 最終スコア、正解数、ミスタイプ数を表示します。
     */
    function showResultModal() {
        finalScoreEl.textContent = score;
        correctWordsEl.textContent = correctWordCount;
        mistypedCharsEl.textContent = mistypeCount;

        toggleHidden(resultModal, false); // 結果モーダルを表示
        toggleHidden(overlay, false);     // オーバーレイを表示
    }

    // --- イベントリスナー ---

    // ゲームスタートボタンクリックでゲームを開始
    startGameButton.addEventListener("click", startGame);

    // 設定ボタンクリックで設定パネルを表示
    settingsButton.addEventListener("click", () => toggleSettings(true));

    // 設定保存ボタンクリックで設定を保存し、ゲームをリセット
    saveSettingsButton.addEventListener("click", async () => { // async を追加
        // 選択されたカテゴリのJSONファイル名を直接取得
        const selectedCategoryFile = wordCategorySettingsEl.value;

        // 新しいカテゴリの単語データを確実に読み込む
        await fetchData(selectedCategoryFile); // await を追加してデータ読み込み完了を待つ

        // 設定パネルを閉じ、ゲームカードを表示
        toggleSettings(false);

        // ゲームの初期状態表示に戻す
        kanjiEl.textContent = "スタートボタンを押して開始！";
        kanaEl.textContent = "";
        inputEl.value = "";
        typedFeedbackEl.innerHTML = "";
        inputEl.disabled = true;
        timerDisplay.textContent = "";
        scoreDisplay.textContent = "スコア: 0";
        score = 0; // スコアをリセット
        correctWordCount = 0;
        mistypeCount = 0;
    });

    // 設定閉じるボタンクリックで設定パネルを閉じる（保存なし）
    closeSettingsButton.addEventListener("click", () => {
        toggleSettings(false); // 設定パネルを閉じる
        // 既存の単語データがあれば、そのままゲーム開始待機状態にする
        if (words.length > 0) {
            kanjiEl.textContent = "スタートボタンを押して開始！";
            kanaEl.textContent = "";
            inputEl.disabled = true;
        } else {
            // 単語データがない場合 (初回ロード時など) は、読み込みを促す
            kanjiEl.textContent = "単語データが読み込めてないよ";
            kanaEl.textContent = "カテゴリーを選択して！";
        }
    });

    // 設定パネルの時間制限モード変更時、カスタム秒数入力欄の表示を切り替える
    timeModeSettingsEl.addEventListener("change", () => {
        toggleHidden(customSecondsWrapperSettings, !(timeModeSettingsEl.value === "custom" || timeModeSettingsEl.value === "reset"));
    });

    // 入力イベント（リアルタイムフィードバックと正誤判定）
    inputEl.addEventListener("input", () => {
        if (!currentWord || inputEl.disabled) return; // 単語が設定されていない、または入力無効なら何もしない

        const typedValue = inputEl.value;
        const targetRomaji = currentWord.romaji;
        let feedbackHtml = '';
        let isCorrectSoFar = true;

        for (let i = 0; i < targetRomaji.length; i++) {
            if (i < typedValue.length) {
                // 入力中の文字と目標の文字を比較（大文字小文字を無視）
                if (typedValue[i].toLowerCase() === targetRomaji[i].toLowerCase()) {
                    feedbackHtml += `<span class="correct">${typedValue[i]}</span>`;
                } else {
                    feedbackHtml += `<span class="incorrect">${typedValue[i]}</span>`;
                    isCorrectSoFar = false;
                }
            } else {
                // 未入力部分
                feedbackHtml += `<span class="placeholder">${targetRomaji[i]}</span>`;
            }
        }
        typedFeedbackEl.innerHTML = feedbackHtml;

        // 入力欄のボーダー色変更（視覚フィードバック）
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
        if (inputEl.disabled) return; // 入力無効なら何もしない

        if (e.key === "Enter") {
            const typedRomaji = inputEl.value.toLowerCase().trim(); // 入力値を小文字にし、空白を除去
            const targetRomaji = currentWord.romaji.toLowerCase();
            // altRomajiがあれば、それも小文字にして配列に変換
            const altRomajiLower = currentWord.altRomaji ? currentWord.altRomaji.map(alt => alt.toLowerCase()) : [];
            const isAltRomajiMatch = altRomajiLower.includes(typedRomaji); // 代替ローマ字との一致を確認

            if (typedRomaji === targetRomaji || isAltRomajiMatch) {
                // 正解の場合
                score++;
                correctWordCount++;
                updateScoreDisplay();
                setNewWord(); // 次の単語へ

                // 制限時間リセットモードの場合、タイマーをリセット
                if (timeModeSettingsEl.value === "reset" && timeLimit !== null) {
                    secondsLeft = timeLimit;
                    timerDisplay.textContent = `残り: ${secondsLeft} 秒`;
                }

                // 正解時の視覚フィードバックアニメーション
                kanjiEl.classList.add('correct-word-animation');
                kanaEl.classList.add('correct-word-animation');
                inputEl.classList.remove("incorrect-input"); // 不正解の赤枠を消す
                inputEl.classList.add("correct-input"); // 正解の緑枠にする
                setTimeout(() => {
                    kanjiEl.classList.remove('correct-word-animation');
                    kanaEl.classList.remove('correct-word-animation');
                    inputEl.classList.remove("correct-input"); // 次の単語に備えて緑枠も消す
                }, 300); // 300ミリ秒後にアニメーションクラスと色を削除
            } else {
                // 不正解の場合
                mistypeCount++; // 不正解単語数をカウント
                inputEl.classList.add("incorrect-input"); // 入力欄を赤枠にする
                // 不正解時にも入力欄とフィードバックをリセットすることで、再入力を促すUX
                inputEl.value = "";
                typedFeedbackEl.innerHTML = '';
            }
        }
    });

    // リザルトモーダルを閉じる
    closeResultButton.addEventListener("click", () => {
        toggleHidden(resultModal, true); // 結果モーダルを非表示
        toggleHidden(overlay, true);     // オーバーレイを非表示
        // ゲームを初期状態に戻す表示
        kanjiEl.textContent = "スタートボタンを押して開始！";
        kanaEl.textContent = "";
        timerDisplay.textContent = "";
        scoreDisplay.textContent = "スコア: 0";
    });

    // --- 初期化 ---
    // ページ読み込み時に、設定パネルで現在選択されているカテゴリの単語を読み込みます。
    // デフォルトでは"general.json"が選択されているはずです。
    fetchData(wordCategorySettingsEl.value);

    // ページの初期表示状態を設定します。
    // ゲームカードは最初から表示され、設定パネル、結果モーダル、オーバーレイは非表示です。
    toggleHidden(gameCard, false);      // ゲームカードは最初に表示
    toggleHidden(settingsPanel, true);  // 設定パネルは最初から非表示
    toggleHidden(resultModal, true);    // 結果モーダルは最初から非表示
    toggleHidden(overlay, true);        // オーバーレイは最初から非表示

    // 設定パネルのカスタム秒数入力欄の初期表示を更新します。
    // (例: "カスタム"が選択されていれば表示、そうでなければ非表示)
    timeModeSettingsEl.dispatchEvent(new Event('change'));
});
