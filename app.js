const GRADE_LABELS = { 3: '小学3年生', 4: '小学4年生', 5: '小学5年生', 6: '小学6年生', 7: '中学1年生', 8: '中学2年生', 9: '中学3年生' };
const STORAGE_KEY = 'japanese-compound-trainer-v1';
const XP_PER_LEVEL = 100;

const initialState = { mastered: {}, seen: {}, xp: 0 };
let state = loadState();
let currentGrade = null;
let currentWord = null;
let isAnswerVisible = false;

function loadState() {
  try {
    return { ...initialState, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch { return { ...initialState }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function level() { return Math.floor(state.xp / XP_PER_LEVEL) + 1; }
function levelProgress() { return state.xp % XP_PER_LEVEL; }
function gradeWords(grade) { return words.filter((item) => item.grade === grade); }
function gradeStats(grade) {
  const items = gradeWords(grade);
  const mastered = items.filter((item) => state.mastered[item.id]).length;
  return { total: items.length, mastered, percent: Math.round((mastered / items.length) * 100) };
}
function progressBar(percent) { return `<div class="progress-track" aria-label="${percent}% 完了"><span style="width:${percent}%"></span></div>`; }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }

function renderHome() {
  const current = levelProgress();
  document.title = '日本語 熟語トレーニング';
  app.innerHTML = `
    <div class="app-shell home-shell">
      <header class="hero">
        <div class="brand-mark" aria-hidden="true">語</div>
        <div><p class="eyebrow">JAPANESE COMPOUNDS</p><h1>日本語 熟語トレーニング</h1></div>
      </header>
      <section class="level-panel" aria-label="あなたのレベル">
        <div><p class="muted">あなたのレベル</p><strong>Lv. ${level()}</strong></div>
        <div class="xp-wrap"><div class="xp-label"><span>XP</span><span>${current} / ${XP_PER_LEVEL}</span></div>${progressBar(current)}</div>
      </section>
      <section class="grade-section"><div class="section-heading"><h2>学年をえらぶ</h2><p>できるところから始めよう</p></div><div class="grade-list">
        ${Object.keys(GRADE_LABELS).map((grade) => {
          const stats = gradeStats(Number(grade));
          return `<button class="grade-card" data-grade="${grade}"><span class="grade-name">${GRADE_LABELS[grade]}</span><span class="grade-progress">${stats.mastered === 0 ? '未開始' : `${stats.mastered} / ${stats.total} マスター`}</span>${progressBar(stats.percent)}<span class="percent">${stats.percent}%</span><span class="chevron" aria-hidden="true">›</span></button>`;
        }).join('')}
      </div></section>
      <p class="home-note">「分かった」を選ぶと +10 XP。進捗はこの端末に保存されます。</p>
    </div>`;
  app.querySelectorAll('[data-grade]').forEach((button) => button.addEventListener('click', () => startGrade(Number(button.dataset.grade))));
}

function startGrade(grade) {
  currentGrade = grade;
  pickNextWord();
  renderStudy();
}
function pickNextWord() {
  const pool = gradeWords(currentGrade).filter((item) => !state.mastered[item.id]);
  if (!pool.length) { currentWord = null; return; }
  const alternatives = pool.filter((item) => item.id !== currentWord?.id);
  currentWord = (alternatives.length ? alternatives : pool)[Math.floor(Math.random() * (alternatives.length ? alternatives.length : pool.length))];
  isAnswerVisible = false;
}
function renderStudy() {
  const stats = gradeStats(currentGrade);
  if (!currentWord) return renderComplete(stats);
  document.title = `${currentWord.word} | 日本語 熟語トレーニング`;
  const remaining = stats.total - stats.mastered;
  app.innerHTML = `
    <div class="app-shell study-shell">
      <header class="study-header"><button class="icon-button" id="home-button" aria-label="ホームへ戻る">‹</button><div><p class="eyebrow">${GRADE_LABELS[currentGrade]}</p><strong>${stats.mastered} / ${stats.total}</strong></div><button class="text-button" id="review-button">見直す</button></header>
      ${progressBar(stats.percent)}
      <section class="study-card ${isAnswerVisible ? 'revealed' : ''}">
        <p class="card-kicker">${isAnswerVisible ? '答え' : '熟語'}</p>
        <h1>${escapeHtml(currentWord.word)}</h1>
        ${isAnswerVisible ? `<div class="answer"><p class="reading">${escapeHtml(currentWord.reading)}</p><div class="meaning"><p>意味</p><strong>${escapeHtml(currentWord.meaning)}</strong></div></div>` : `<p class="hint">思い出せたら答えを見てみよう</p>`}
      </section>
      <div class="study-actions">${isAnswerVisible ? `<button class="know-button" id="know-button"><span>✓</span> 分かった <small>+10 XP</small></button><button class="unknown-button" id="unknown-button">まだ分からない</button>` : `<button class="reveal-button" id="reveal-button">答えを見る <span>→</span></button>`}</div>
      <p class="remaining">あと <strong>${remaining}</strong> 語！</p>
    </div>`;
  document.querySelector('#home-button').addEventListener('click', renderHome);
  document.querySelector('#review-button').addEventListener('click', () => renderReview());
  if (isAnswerVisible) {
    document.querySelector('#know-button').addEventListener('click', () => judge(true));
    document.querySelector('#unknown-button').addEventListener('click', () => judge(false));
  } else document.querySelector('#reveal-button').addEventListener('click', () => { isAnswerVisible = true; renderStudy(); });
}
function judge(mastered) {
  state.seen[currentWord.id] = true;
  if (mastered) {
    const previousLevel = level();
    state.mastered[currentWord.id] = true;
    state.xp += 10;
    saveState();
    if (level() > previousLevel) return showLevelUp();
  }
  saveState();
  pickNextWord();
  renderStudy();
}
function renderComplete(stats) {
  app.innerHTML = `<div class="app-shell study-shell"><header class="study-header"><button class="icon-button" id="home-button" aria-label="ホームへ戻る">‹</button><div><p class="eyebrow">${GRADE_LABELS[currentGrade]}</p><strong>${stats.total} / ${stats.total}</strong></div><span></span></header>${progressBar(100)}<section class="complete"><div class="complete-badge">★</div><p class="eyebrow">COMPLETE</p><h1>全問マスター！</h1><p>${GRADE_LABELS[currentGrade]}の熟語を全部覚えました。</p><button class="reveal-button" id="review-button">習得済みを見直す</button><button class="plain-button" id="home-link">ホームへ戻る</button></section></div>`;
  document.querySelector('#home-button').addEventListener('click', renderHome);
  document.querySelector('#home-link').addEventListener('click', renderHome);
  document.querySelector('#review-button').addEventListener('click', renderReview);
}
function renderReview() {
  const mastered = gradeWords(currentGrade).filter((item) => state.mastered[item.id]);
  app.innerHTML = `<div class="app-shell review-shell"><header class="study-header"><button class="icon-button" id="back-button" aria-label="学習に戻る">‹</button><div><p class="eyebrow">${GRADE_LABELS[currentGrade]}</p><strong>習得済み ${mastered.length} 語</strong></div><span></span></header><section class="review-intro"><h1>習得済みを見直す</h1><p>もう一度学習したい言葉を戻せます。</p></section><div class="review-list">${mastered.length ? mastered.map((item) => `<article><div><strong>${escapeHtml(item.word)}</strong><span>${escapeHtml(item.reading)}　${escapeHtml(item.meaning)}</span></div><button data-reset="${item.id}">戻す</button></article>`).join('') : '<p class="empty-state">まだ習得済みの熟語はありません。</p>'}</div></div>`;
  document.querySelector('#back-button').addEventListener('click', renderStudy);
  app.querySelectorAll('[data-reset]').forEach((button) => button.addEventListener('click', () => { delete state.mastered[button.dataset.reset]; saveState(); renderReview(); }));
}
function showLevelUp() {
  app.innerHTML = `<div class="levelup-overlay"><section class="levelup-card"><div class="sparkles">✦ ✧ ✦</div><p>LEVEL UP!</p><h1>レベル ${level()}</h1><span>おめでとう！ 新しいレベルになりました。</span><button id="continue-button">つづける</button></section></div>`;
  document.querySelector('#continue-button').addEventListener('click', () => { pickNextWord(); renderStudy(); });
}
renderHome();
