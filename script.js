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
let words = []; // 現在のカテゴリの単語リスト
let wordsQueue = []; // 出題される単語のキュー（シャッフルされたリスト）
let currentWord = null;
let timeLimit = null;
let timer = null;
let secondsLeft = 0;
let score = 0;
let correctWordCount = 0;
let mistypeCount = 0;
// --- ヘルパー関数 ---
/**
* 指定された要素にhiddenクラスを追加・削除する
* @param {HTMLElement} element - 対象のDOM要素
* @param {boolean} hide - trueなら隠す、falseなら表示する
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
* 指定されたカテゴリの単語データを読み込む
* @param {string} categoryFile - JSONファイルのパス
*/ async function fetchData(categoryFile) { kanjiEl.textContent = "データ読み込み中..."; kanaEl.textContent = ""; words = []; // 既存のデータをクリア wordsQueue = [];`
try {
const res = await fetch(categoryFile);
if (!res.ok) {
throw new Error(\HTTP error! status: ${res.status}`); } const data = await res.json(); words = data;// 初期表示時に設定パネルが開いていない場合のみ表示を更新 if (settingsPanel.classList.contains("hidden")) { kanjiEl.textContent = "スタートボタンを押して開始！"; kanaEl.textContent = ""; } inputEl.disabled = true; // 初期状態では入力無効 } catch (err) { kanjiEl.textContent = "データ読み込み失敗"; kanaEl.textContent = `${categoryFile} が読み込めません`; console.error(`Error loading ${categoryFile}:`, err); inputEl.disabled = true; } }`
// --- ゲームの管理 ---
/**
* ゲームを開始する
*/ function startGame() { if (words.length === 0) { kanjiEl.textContent = "単語データが読み込めてないよ"; kanaEl.textContent = "カテゴリーを選択して！"; return; }`
// 設定パネルが開いていたら閉じる
if (!settingsPanel.classList.contains("hidden")) {
toggleSettings(false); // 設定パネルを閉じる
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
// 単語キューをシャッフルしてセット
wordsQueue = [...words].sort(() => Math.random() - 0.5);
setNewWord(); // 最初の単語を設定
// 時間制限の設定
const mode = timeModeSettingsEl.value; // 設定パネルの値を使用
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
clearInterval(timer);
secondsLeft = timeLimit;
timerDisplay.textContent = \残り: ${secondsLeft} 秒`;`
timer = setInterval(() => {
secondsLeft--;
timerDisplay.textContent = \残り: ${secondsLeft} 秒`; if (secondsLeft <= 0) { stopGame(); } }, 1000); } else { clearInterval(timer); timerDisplay.textContent = "制限なし"; // 制限なしモードの表示 } }`
/**
* 次の単語を設定する
*/ function setNewWord() { if (wordsQueue.length === 0) { stopGame(); // 全ての単語を打ち終えたらゲーム終了 return; } currentWord = wordsQueue.shift(); // キューから単語を取り出す kanjiEl.textContent = currentWord.kanji; kanaEl.textContent = currentWord.kana; inputEl.value = ""; // 入力欄をクリア typedFeedbackEl.innerHTML = ''; // フィードバックもクリア inputEl.classList.remove("correct-input", "incorrect-input"); // 色をリセット }`
/**
* ゲームを終了する
*/ function stopGame() { clearInterval(timer); kanjiEl.textContent = "終了！"; kanaEl.textContent = ""; inputEl.disabled = true; inputEl.value = ""; typedFeedbackEl.innerHTML = ''; timerDisplay.textContent = "終了！"; inputEl.classList.remove("correct-input", "incorrect-input");`
showResultModal();
// ゲーム終了後、単語リストをリセット（次のゲームに備える）
WorkspaceData(wordCategorySettingsEl.value);
}
/**
* スコア表示を更新する
*/ function updateScoreDisplay() { scoreDisplay.textContent = `スコア: ${score}`; }`
// --- UI/UXインタラクション ---
/**
* 設定パネルの表示/非表示を切り替える
* @param {boolean} show - trueなら表示、falseなら非表示 (省略時はトグル)
*/ function toggleSettings(show = null) { const isHidden = settingsPanel.classList.contains("hidden"); const shouldShow = show !== null ? show : isHidden;`
toggleHidden(settingsPanel, !shouldShow);
toggleHidden(gameCard, shouldShow);
toggleHidden(overlay, !resultModal.classList.contains("hidden") || shouldShow); // モーダルが開いていなければオーバーレイを表示
if (shouldShow) {
clearInterval(timer); // 設定パネルが開いたらタイマーを停止
// 設定パネルが開いたときに現在の設定値を反映
wordCategorySettingsEl.value = wordCategorySettingsEl.value; // 現在の設定値をそのまま保持
timeModeSettingsEl.value = timeModeSettingsEl.value; // 現在の設定値をそのまま保持
customSecondsSettingsEl.value = customSecondsSettingsEl.value; // 現在の設定値をそのまま保持
// 設定画面の時間制限のselect要素のchangeイベントをトリガーして、カスタム秒数入力欄の表示を更新
timeModeSettingsEl.dispatchEvent(new Event('change'));
}
}
/**
* リザルトモーダルを表示する
*/ function showResultModal() { finalScoreEl.textContent = score; correctWordsEl.textContent = correctWordCount; mistypedCharsEl.textContent = mistypeCount;`
toggleHidden(resultModal, false);
toggleHidden(overlay, false);
}
// --- イベントリスナー ---
// ゲームスタートボタン
startGameButton.addEventListener("click", startGame);
// 設定ボタン
settingsButton.addEventListener("click", () => toggleSettings(true)); // 設定パネルを表示
// 設定保存ボタン
saveSettingsButton.addEventListener("click", () => {
// ゲームパネルのカテゴリ/時間制限の選択肢を、設定パネルの選択肢に合わせて更新
// これは、設定パネルの選択がゲームに反映されるようにするため
document.getElementById("wordCategory").value = wordCategorySettingsEl.value;
document.getElementById("timeMode").value = timeModeSettingsEl.value;
document.getElementById("customSeconds").value = customSecondsSettingsEl.value;
toggleSettings(false); // 設定パネルを閉じる
stopGame(); // ゲームを停止状態に戻す
WorkspaceData(wordCategorySettingsEl.value); // 新しいカテゴリで単語データを読み込み直す
});
// 設定閉じるボタン
closeSettingsButton.addEventListener("click", () => {
toggleSettings(false); // 設定パネルを閉じる
});
});
// 設定パネルの時間制限モードの変更時にカスタム秒数入力欄の表示を切り替える
timeModeSettingsEl.addEventListener("change", () => {
toggleHidden(customSecondsWrapperSettings, !(timeModeSettingsEl.value === "custom" || timeModeSettingsEl.value === "reset"));
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
// 入力中の文字と目標の文字を比較（大文字小文字を無視）
if (typedValue[i].toLowerCase() === targetRomaji[i].toLowerCase()) {
feedbackHtml += \<span class="correct">${typedValue[i]}</span>`; } else { feedbackHtml += `<span class="incorrect">${typedValue[i]}</span>`; isCorrectSoFar = false; } } else { // 未入力部分 feedbackHtml += `<span class="placeholder">${targetRomaji[i]}</span>`; } } typedFeedbackEl.innerHTML = feedbackHtml;`
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
const typedRomaji = inputEl.value.toLowerCase().trim();
const targetRomaji = currentWord.romaji.toLowerCase();
const altRomajiLower = currentWord.altRomaji ? currentWord.altRomaji.map(alt => alt.toLowerCase()) : [];
const isAltRomajiMatch = altRomajiLower.includes(typedRomaji);
if (typedRomaji === targetRomaji || isAltRomajiMatch) {
score++;
correctWordCount++;
updateScoreDisplay();
setNewWord();
// 制限時間リセットモード
if (timeModeSettingsEl.value === "reset" && timeLimit !== null) {
secondsLeft = timeLimit;
timerDisplay.textContent = \残り: ${secondsLeft} 秒`; }`
// 正解時の視覚フィードバック
kanjiEl.classList.add('correct-word-animation');
kanaEl.classList.add('correct-word-animation');
inputEl.classList.remove("incorrect-input");
inputEl.classList.add("correct-input");
setTimeout(() => {
kanjiEl.classList.remove('correct-word-animation');
kanaEl.classList.remove('correct-word-animation');
inputEl.classList.remove("correct-input");
}, 300);
} else {
// 不正解時の処理
mistypeCount++;
inputEl.classList.add("incorrect-input");
// 不正解時にも入力欄とフィードバックをリセットすることで、再入力を促す
inputEl.value = ""; 
typedFeedbackEl.innerHTML = '';
}
}
});
// リザルトモーダルを閉じる
closeResultButton.addEventListener("click", () => {
toggleHidden(resultModal, true);
toggleHidden(overlay, true);
// ゲームを初期状態に戻す
kanjiEl.textContent = "スタートボタンを押して開始！";
kanaEl.textContent = "";
timerDisplay.textContent = "";
scoreDisplay.textContent = "スコア: 0";
});
// --- 初期化 ---
// ページ読み込み時にデフォルトのカテゴリの単語を読み込む
WorkspaceData(wordCategorySettingsEl.value);
// 初期状態でカスタム秒数入力欄の表示を更新（設定パネル用）
timeModeSettingsEl.dispatchEvent(new Event('change'));
});