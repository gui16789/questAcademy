const STORAGE_KEY = "animalDetectiveCityMvp";
const DATA_VERSION = "0.2.0";
const CONTENT_PACKAGE_PATH = "content/math/bsd/grade-2/semester-2/unit-1-division";
const CONTENT_LOAD_COMMAND = "python -m http.server 4173 --bind 127.0.0.1";
const storage = createSafeStorage();
let activeContentMeta = {
  contentPackageId: "math.bsd.g2.s2.unit-1-division",
  contentVersion: "0.1.0",
};

let badgeDefs = [
  { id: "rookie", icon: "🕵️", name: "新手小侦探", reason: "完成第一个普通关卡" },
  { id: "collector", icon: "🔎", name: "线索收集员", reason: "收集全部 4 条线索" },
  { id: "reviewer", icon: "📁", name: "悬案调查员", reason: "第一次进入悬案馆复习" },
  { id: "persistent", icon: "⭐", name: "坚持不放弃", reason: "错题重做并答对" },
  { id: "caseCloser", icon: "🏅", name: "破案小能手", reason: "完成 Boss 并结案" },
];

let levels = [
  {
    id: "level-1",
    order: 1,
    name: "仓库平均分",
    place: "兔仓管的徽章仓库",
    knowledgePoint: "平均分",
    clue: "仓库里的徽章原本可以平均分给 4 个侦探小队。",
    intro: "兔仓管把徽章盒打开了。先看看每个小队能不能分得一样多。",
  },
  {
    id: "level-2",
    order: 2,
    name: "分发记录表",
    place: "学院分发台",
    knowledgePoint: "除法算式含义",
    clue: "分发记录里有一组除法算式写错了。",
    intro: "狐狸配送员留下了一张记录表。小侦探要读懂每个除法算式。",
  },
  {
    id: "level-3",
    order: 3,
    name: "剩下的徽章",
    place: "运输路线口",
    knowledgePoint: "有余数除法",
    clue: "剩下的 3 枚徽章不是丢了，而是没有组成完整一队。",
    intro: "路口发现了几枚徽章。它们是不是线索，要用有余数除法判断。",
  },
  {
    id: "level-4",
    order: 4,
    name: "可疑的说法",
    place: "熊老师办公室",
    knowledgePoint: "余数小于除数",
    clue: "狐狸配送员说的余数太大，不符合除法规则。",
    intro: "嫌疑动物们开始解释。哪句话不合理？余数规则会帮忙。",
  },
];

let knowledgeCards = [
  {
    id: "level-1",
    title: "平均分线索卡",
    knowledgePoint: "平均分",
    summary: "平均分就是每一份一样多。",
    example: "12 枚徽章分给 3 队，每队 4 枚。",
    method: "先看总数，再看分成几份，最后让每份数量相同。",
    mistake: "只分完不够，还要每份一样多。",
    level: "第 1 关：仓库平均分",
  },
  {
    id: "level-2",
    title: "除法算式线索卡",
    knowledgePoint: "除法算式含义",
    summary: "除法可以表示平均分。",
    example: "18 ÷ 3 = 6，表示 18 个平均分成 3 份，每份 6 个。",
    method: "读算式时说清楚总数、份数和每份数量。",
    mistake: "把被除数、除数和商的位置看反。",
    level: "第 2 关：分发记录表",
  },
  {
    id: "level-3",
    title: "剩余徽章线索卡",
    knowledgePoint: "有余数除法",
    summary: "平均分后剩下不够再分一份的数，叫余数。",
    example: "17 ÷ 5 = 3 余 2，表示能分 3 份，还剩 2 个。",
    method: "先分完整份，再数剩下几个。",
    mistake: "忘记写剩下的数量。",
    level: "第 3 关：剩下的徽章",
  },
  {
    id: "level-4",
    title: "余数规则线索卡",
    knowledgePoint: "余数小于除数",
    summary: "余数一定要比除数小。",
    example: "23 ÷ 6 = 3 余 5 可以，余 6 就不可以。",
    method: "算完后检查余数，余数不能等于或大于除数。",
    mistake: "余数太大时没有继续再分一份。",
    level: "第 4 关：可疑的说法",
  },
];

let questions = [
  makeQuestion("q1", "level-1", "single", "兔仓管有 12 枚徽章，要平均分给 3 个小队。每队几枚？", ["3", "4", "6"], "4", "12 ÷ 3 = 4，每队 4 枚。"),
  makeQuestion("q2", "level-1", "judge", "把 10 枚徽章分成 5 份，每份 2 枚，这是平均分。", ["对", "错"], "对", "每份都是 2 枚，所以是平均分。"),
  makeQuestion("q3", "level-1", "fill", "16 枚徽章平均分给 4 队，每队 ___ 枚。", [], "4", "16 ÷ 4 = 4。"),
  makeQuestion("q4", "level-1", "single", "哪一种分法是平均分？", ["3 枚、4 枚、5 枚", "4 枚、4 枚、4 枚", "2 枚、5 枚、5 枚"], "4 枚、4 枚、4 枚", "平均分时每份数量一样。"),
  makeQuestion("q5", "level-2", "single", "18 ÷ 3 = 6 表示 18 枚徽章平均分给 3 队，每队几枚？", ["3", "6", "18"], "6", "商 6 表示每队 6 枚。"),
  makeQuestion("q6", "level-2", "fill", "24 枚徽章，每 6 枚装一盒，可以装 ___ 盒。", [], "4", "24 ÷ 6 = 4。"),
  makeQuestion("q7", "level-2", "single", "20 枚徽章平均分给 5 队，正确算式是？", ["20 + 5 = 25", "20 ÷ 5 = 4", "20 - 5 = 15"], "20 ÷ 5 = 4", "平均分用除法。"),
  makeQuestion("q8", "level-2", "judge", "15 ÷ 3 = 5 可以表示 15 枚徽章平均分成 3 份，每份 5 枚。", ["对", "错"], "对", "这个说法和算式意思一致。"),
  makeQuestion("q9", "level-3", "single", "17 枚徽章，每 5 枚装一袋，可以装几袋，还剩几枚？", ["3 袋余 2 枚", "4 袋余 3 枚", "2 袋余 7 枚"], "3 袋余 2 枚", "5 × 3 = 15，17 - 15 = 2。"),
  makeQuestion("q10", "level-3", "fill", "22 ÷ 4 = 5 余 ___。", [], "2", "4 × 5 = 20，22 - 20 = 2。"),
  makeQuestion("q11", "level-3", "judge", "19 枚徽章每 6 枚一组，能分 3 组，还剩 1 枚。", ["对", "错"], "对", "6 × 3 = 18，19 - 18 = 1。"),
  makeQuestion("q12", "level-3", "single", "29 枚徽章每 7 枚一队，可以分给几个完整小队？", ["3 个", "4 个", "5 个"], "4 个", "7 × 4 = 28，还剩 1 枚。"),
  makeQuestion("q13", "level-4", "single", "下面哪个余数不可能出现在 ÷ 5 的算式里？", ["1", "4", "5"], "5", "余数必须小于除数 5。"),
  makeQuestion("q14", "level-4", "judge", "26 ÷ 6 = 3 余 8，这个算式合理。", ["对", "错"], "错", "余数 8 比除数 6 大，还能继续分。"),
  makeQuestion("q15", "level-4", "fill", "如果除数是 7，余数最大是 ___。", [], "6", "余数要小于除数，最大是 6。"),
  makeQuestion("q16", "level-4", "single", "狐狸说：31 枚每 8 枚一组，分 3 组余 7 枚。这句话对吗？", ["对", "错", "还不能判断"], "对", "8 × 3 = 24，31 - 24 = 7，余数 7 小于 8。"),
  makeQuestion("b1", "boss", "single", "学院原来有 35 枚胡萝卜徽章，每队分 6 枚。可以分给几个完整小队，还剩几枚？", ["5 队余 5 枚", "6 队余 1 枚", "4 队余 11 枚"], "5 队余 5 枚", "6 × 5 = 30，35 - 30 = 5。"),
  makeQuestion("b2", "boss", "judge", "狐狸配送员说：剩下 5 枚还能再分给一个完整小队。这句话对吗？", ["对", "错"], "错", "每队要 6 枚，剩下 5 枚不够再分一个完整小队。"),
];

let backupQuestions = [
  makeQuestion("r1", "reserve", "fill", "14 ÷ 2 = ___。", [], "7", "2 个 7 是 14。"),
  makeQuestion("r2", "reserve", "single", "21 枚每 4 枚一组，余数是？", ["1", "2", "3"], "1", "4 × 5 = 20，余 1。"),
  makeQuestion("r3", "reserve", "judge", "余数可以和除数一样大。", ["对", "错"], "错", "余数必须小于除数。"),
  makeQuestion("r4", "reserve", "single", "把 18 枚平均分成 6 份，每份是？", ["2", "3", "4"], "3", "18 ÷ 6 = 3。"),
  makeQuestion("r5", "reserve", "fill", "30 ÷ 5 = ___。", [], "6", "5 × 6 = 30。"),
  makeQuestion("r6", "reserve", "single", "25 ÷ 6 的余数是？", ["1", "5", "6"], "1", "6 × 4 = 24，余 1。"),
  makeQuestion("r7", "reserve", "judge", "8 枚和 8 枚是平均分。", ["对", "错"], "对", "每份一样多。"),
  makeQuestion("r8", "reserve", "single", "27 枚每 9 枚装一盒，可以装？", ["2 盒", "3 盒", "4 盒"], "3 盒", "27 ÷ 9 = 3。"),
  makeQuestion("r9", "reserve", "fill", "除数是 4，余数最大是 ___。", [], "3", "余数要小于 4。"),
  makeQuestion("r10", "reserve", "single", "18 ÷ 4 = 4 余 2 中，2 是什么？", ["商", "余数", "除数"], "余数", "分完后剩下的数是余数。"),
];

let state = null;
let activeLevelId = null;
let activeQuestionIds = [];
let activeQuestionIndex = 0;
let activeCorrectCount = 0;
let activeWrongCount = 0;
let lastAnswerLocked = false;
let selectedAnswer = "";
let selectedAnswerQuestionId = "";
let reviewQuestionId = null;
let nicknameDraft = "";

const app = document.querySelector("#app");

document.addEventListener("click", (event) => {
  const interactiveTarget = event.target.closest("button, input, textarea, select, a, [contenteditable='true']");
  if (!interactiveTarget || event.target.closest(".feedback")) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}, true);

document.addEventListener("input", (event) => {
  if (event.target.id === "nickname") nicknameDraft = event.target.value;
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "start-form") startGame();
});

function startGameFromForm(event) {
  event?.preventDefault();
  startGame();
  return false;
}

if (typeof window !== "undefined") {
  window.startGameFromForm = startGameFromForm;
}

bootApp();

async function bootApp() {
  renderLoading();
  try {
    const contentPackage = await loadContentPackage(CONTENT_PACKAGE_PATH);
    buildRuntimeContent(contentPackage);
  } catch (error) {
    console.error(error);
    renderContentLoadError(error);
    return;
  }

  state = loadState();
  nicknameDraft = state.user.nickname === "小侦探" ? "" : state.user.nickname;
  render(state.user?.started ? "map" : "start");
}

function renderLoading() {
  app.innerHTML = `
    <section class="screen result-panel">
      <p class="tag">内容包加载中</p>
      <h1>正在整理调查档案</h1>
      <p class="lead">请稍等，题目、线索和知识卡正在从内容包读取。</p>
    </section>
  `;
}

function renderContentLoadError(error) {
  app.innerHTML = `
    <section class="screen result-panel">
      <p class="tag warn">内容包加载失败</p>
      <h1>内容包没有加载成功</h1>
      <p class="lead">请使用本地静态服务打开项目，然后刷新页面。</p>
      <pre class="error-command">${escapeHtml(CONTENT_LOAD_COMMAND)}</pre>
      <p>${escapeHtml(error?.message ?? "无法读取 JSON 内容包。")}</p>
    </section>
  `;
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`读取失败：${path} (${response.status})`);
  return response.json();
}

async function loadContentPackage(basePath) {
  const manifest = await loadJson(`${basePath}/manifest.json`);
  const [
    textbook,
    knowledgeMap,
    caseData,
    knowledgeCardData,
    clueData,
    badgeData,
    ...questionGroups
  ] = await Promise.all([
    loadJson(`${basePath}/${manifest.files.textbook}`),
    loadJson(`${basePath}/${manifest.files.knowledgeMap}`),
    loadJson(`${basePath}/${manifest.files.cases[0]}`),
    loadJson(`${basePath}/${manifest.files.knowledgeCards}`),
    loadJson(`${basePath}/${manifest.files.clues}`),
    loadJson(`${basePath}/${manifest.files.badges}`),
    ...manifest.files.questions.map((file) => loadJson(`${basePath}/${file}`)),
  ]);

  return {
    manifest,
    textbook,
    knowledgeMap,
    caseData,
    knowledgeCardData,
    clueData,
    badgeData,
    questionGroups,
  };
}

function buildRuntimeContent(contentPackage) {
  const { manifest, knowledgeMap, caseData, knowledgeCardData, clueData, badgeData, questionGroups } = contentPackage;
  activeContentMeta = {
    contentPackageId: manifest.contentPackageId,
    contentVersion: manifest.contentVersion,
  };
  const knowledgePointById = new Map(knowledgeMap.knowledgePoints.map((item) => [item.knowledgePointId, item]));
  const clueByLevelId = new Map(clueData.clues.map((item) => [item.levelId, item]));
  const levelIdToRuntimeId = new Map(caseData.levels.map((item) => [item.levelId, item.legacyRuntimeId ?? item.levelId]));

  levels = caseData.levels
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((level) => {
      const knowledgePoint = knowledgePointById.get(level.knowledgePointId);
      const clue = clueByLevelId.get(level.levelId);
      return {
        id: level.legacyRuntimeId ?? level.levelId,
        contentLevelId: level.levelId,
        order: level.order,
        name: level.name,
        place: level.place,
        knowledgePoint: knowledgePoint?.shortName ?? knowledgePoint?.name ?? level.knowledgePointId,
        clue: clue?.text ?? "",
        intro: level.intro,
      };
    });

  knowledgeCards = knowledgeCardData.knowledgeCards.map((card) => {
    const level = levels.find((item) => item.contentLevelId === card.levelId);
    const knowledgePoint = knowledgePointById.get(card.knowledgePointId);
    return {
      id: card.legacyRuntimeId ?? level?.id ?? card.levelId,
      knowledgeCardId: card.knowledgeCardId,
      title: card.title,
      knowledgePoint: knowledgePoint?.shortName ?? knowledgePoint?.name ?? card.knowledgePointId,
      summary: card.summary,
      example: card.example,
      method: card.method,
      mistake: card.commonMistake,
      level: level ? `第 ${level.order} 关：${level.name}` : card.levelId,
    };
  });

  badgeDefs = badgeData.badges.map((badge) => ({
    id: badge.legacyRuntimeId ?? badge.badgeId,
    badgeId: badge.badgeId,
    icon: badgeIcon(badge.icon),
    name: badge.name,
    reason: badge.description.replace(/。$/, ""),
  }));

  const flattenedQuestions = questionGroups.flatMap((group) =>
    group.questions.map((question) => toRuntimeQuestion(question, group, knowledgePointById, levelIdToRuntimeId)),
  );

  questions = flattenedQuestions.filter((question) => question.levelId !== "reserve");
  backupQuestions = flattenedQuestions.filter((question) => question.levelId === "reserve");
}

function toRuntimeQuestion(question, group, knowledgePointById, levelIdToRuntimeId) {
  const isBossQuestion = question.levelId === "boss" || Boolean(question.bossTaskId);
  const runtimeLevelId = isBossQuestion ? "boss" : question.levelId === "reserve" ? "reserve" : levelIdToRuntimeId.get(question.levelId) ?? group.legacyRuntimeLevelId ?? question.levelId;
  const knowledgePoint = knowledgePointById.get(question.knowledgePointId);
  return {
    ...question,
    levelId: runtimeLevelId,
    contentLevelId: question.levelId,
    grade: "二年级",
    textbookVersion: "北师大版",
    semester: "下册",
    unit: "第一单元：除法",
    knowledgePoint: knowledgePoint?.shortName ?? knowledgePoint?.name ?? question.knowledgePointId,
    difficulty: question.difficultyBand === "integrated" ? "综合" : question.difficultyBand === "application" ? "应用" : "基础",
    wrongHint: question.wrongHint ?? "这条线索还不够清楚，我们先放进悬案馆，稍后再调查。",
    isBossQuestion,
    wrongCategory: knowledgePoint?.shortName ?? knowledgePoint?.name ?? question.knowledgePointId,
  };
}

function badgeIcon(iconId) {
  const icons = {
    "badge-detective-rookie": "🕵️",
    "badge-clue-collector": "🔎",
    "badge-reviewer": "📁",
    "badge-persistent": "⭐",
    "badge-detective-gold": "🏅",
  };
  return icons[iconId] ?? "🏅";
}

function makeQuestion(id, levelId, questionType, stem, options, answer, explanation) {
  const level = levels.find((item) => item.id === levelId);
  const isBossQuestion = levelId === "boss";
  return {
    questionId: id,
    grade: "二年级",
    textbookVersion: "北师大版",
    semester: "下册",
    unit: "第一单元：除法",
    knowledgePoint: isBossQuestion ? "除法解决实际问题" : level?.knowledgePoint ?? "除法",
    levelId,
    questionType,
    difficulty: isBossQuestion ? "综合" : "基础",
    stem,
    options,
    answer,
    explanation,
    wrongHint: "这条线索还不够清楚，我们先放进悬案馆，稍后再调查。",
    isBossQuestion,
    wrongCategory: isBossQuestion ? "综合应用" : level?.knowledgePoint ?? "除法",
  };
}

function defaultState() {
  return {
    dataVersion: DATA_VERSION,
    contentPackageId: activeContentMeta.contentPackageId,
    contentVersion: activeContentMeta.contentVersion,
    user: {
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
      nickname: "小侦探",
      avatar: "🦊",
      started: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      dataVersion: DATA_VERSION,
    },
    progress: {
      contentPackageId: activeContentMeta.contentPackageId,
      contentVersion: activeContentMeta.contentVersion,
      caseId: "case-carrot-badge",
      currentLevel: "level-1",
      passedLevels: [],
      clues: [],
      bossUnlocked: false,
      caseClosed: false,
      lastStudyAt: "",
    },
    answerRecords: [],
    wrongQuestions: {},
    badges: {},
  };
}

function loadState() {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    return saved ? mergeState(defaultState(), saved) : defaultState();
  } catch {
    return defaultState();
  }
}

function mergeState(base, saved) {
  const merged = {
    ...base,
    ...saved,
    user: { ...base.user, ...saved.user },
    progress: { ...base.progress, ...saved.progress },
    answerRecords: (saved.answerRecords ?? []).map(migrateAnswerRecord),
    wrongQuestions: migrateWrongQuestions(saved.wrongQuestions ?? {}),
    badges: migrateBadges(saved.badges ?? {}),
  };
  return stampStateVersions(merged, saved.dataVersion ? DATA_VERSION : "0.1.0");
}

function saveState() {
  stampStateVersions(state);
  state.progress.bossUnlocked = state.progress.clues.length >= 4;
  state.progress.lastStudyAt = new Date().toISOString();
  state.user.lastLoginAt = new Date().toISOString();
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateActiveNav();
}

function stampStateVersions(target, sourceDataVersion = DATA_VERSION) {
  target.dataVersion = DATA_VERSION;
  target.contentPackageId = activeContentMeta.contentPackageId;
  target.contentVersion = activeContentMeta.contentVersion;
  target.user = {
    ...target.user,
    dataVersion: DATA_VERSION,
  };
  target.progress = {
    ...target.progress,
    contentPackageId: activeContentMeta.contentPackageId,
    contentVersion: activeContentMeta.contentVersion,
    caseId: target.progress?.caseId === "carrot-badge-case" ? "case-carrot-badge" : target.progress?.caseId ?? "case-carrot-badge",
  };
  target.migratedFromDataVersion = sourceDataVersion === DATA_VERSION ? target.migratedFromDataVersion ?? "" : sourceDataVersion;
  return target;
}

function dataStamp(extra = {}) {
  return {
    dataVersion: DATA_VERSION,
    contentPackageId: activeContentMeta.contentPackageId,
    contentVersion: activeContentMeta.contentVersion,
    ...extra,
  };
}

function migrateAnswerRecord(record) {
  return {
    ...dataStamp({
      questionVersion: record.questionVersion ?? activeContentMeta.contentVersion,
    }),
    ...record,
    dataVersion: record.dataVersion ?? "0.1.0",
    contentPackageId: record.contentPackageId ?? activeContentMeta.contentPackageId,
    contentVersion: record.contentVersion ?? activeContentMeta.contentVersion,
  };
}

function migrateWrongQuestions(wrongQuestions) {
  return Object.fromEntries(
    Object.entries(wrongQuestions).map(([questionId, item]) => [
      questionId,
      {
        ...dataStamp({
          questionVersion: item.questionVersion ?? activeContentMeta.contentVersion,
          questionMigrated: Boolean(!item.knowledgePointId),
        }),
        ...item,
        dataVersion: item.dataVersion ?? "0.1.0",
        contentPackageId: item.contentPackageId ?? activeContentMeta.contentPackageId,
        contentVersion: item.contentVersion ?? activeContentMeta.contentVersion,
      },
    ]),
  );
}

function migrateBadges(badges) {
  return Object.fromEntries(
    Object.entries(badges).map(([badgeId, item]) => [
      badgeId,
      {
        ...dataStamp(),
        ...item,
        dataVersion: item.dataVersion ?? "0.1.0",
        contentPackageId: item.contentPackageId ?? activeContentMeta.contentPackageId,
        contentVersion: item.contentVersion ?? activeContentMeta.contentVersion,
        caseId: item.caseId === "carrot-badge-case" ? "case-carrot-badge" : item.caseId ?? "case-carrot-badge",
      },
    ]),
  );
}

function handleAction(action, data) {
  if (action === "start") {
    startGame();
  }

  if (action === "go-map") render(state.user.started ? "map" : "start");
  if (action === "case") render("case");
  if (action === "start-level") startLevel(nextPlayableLevel());
  if (action === "open-level") startLevel(data.levelId);
  if (action === "submit-answer") submitAnswer();
  if (action === "next-question") nextQuestion();
  if (action === "finish-level") finishLevel();
  if (action === "boss") startBoss();
  if (action === "finish-boss") finishBoss();
  if (action === "retry-boss") startBoss();
  if (action === "review") startReview(data.questionId);
  if (action === "submit-review") submitReview();
  if (action === "reset") resetProgress();
}

function render(view) {
  app.dataset.view = view;
  const renderers = {
    start: renderStart,
    map: renderMap,
    case: renderCase,
    level: renderQuestion,
    clue: renderClue,
    boss: renderQuestion,
    closing: renderClosing,
    wrongs: renderWrongs,
    knowledge: renderKnowledge,
    badges: renderBadges,
    review: renderReview,
  };
  renderers[view]();
  updateActiveNav();
  bindInteractiveButtons();
}

function openView(view) {
  if (!state.user.started) {
    render("start");
    showToast("先输入昵称，成为小侦探再出发。");
    return;
  }
  render(view);
}

function bindInteractiveButtons() {
  document.querySelectorAll(".feedback").forEach((feedback) => {
    feedback.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      return false;
    };
  });

  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled || lastAnswerLocked) return false;
      selectedAnswer = button.dataset.answer;
      selectedAnswerQuestionId = button.dataset.questionId;
      document.querySelectorAll("[data-answer]").forEach((option) => {
        const isSelected = option === button;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
      });
      updateSubmitButtons();
      return false;
    };
  });

  document.querySelectorAll("[data-fill-key]").forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled || lastAnswerLocked) return false;
      const questionId = button.dataset.questionId;
      const key = button.dataset.fillKey;
      selectedAnswerQuestionId = questionId;
      selectedAnswer = key === "clear" ? "" : `${selectedAnswer}${key}`.slice(0, 3);
      const display = document.querySelector(`[data-fill-display='${questionId}']`);
      if (display) display.textContent = selectedAnswer || "点数字作答";
      updateSubmitButtons();
      return false;
    };
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleAction(button.dataset.action, button.dataset);
      return false;
    };
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const view = button.dataset.view;
      openView(view);
      return false;
    };
  });
}

function updateSubmitButtons() {
  const questionId = app.dataset.view === "review" ? reviewQuestionId : activeQuestionIds[activeQuestionIndex];
  const hasChoice = Boolean(selectedAnswer && selectedAnswerQuestionId === questionId);
  const canSubmit = !lastAnswerLocked && hasChoice;

  document.querySelectorAll("[data-action='submit-answer'], [data-action='submit-review']").forEach((button) => {
    button.disabled = !canSubmit;
  });
}

function renderStart() {
  app.innerHTML = `
    <section class="screen hero">
      <div class="hero-copy">
        <p class="tag">北师大版二年级下册 · 第一单元 除法</p>
        <h1>动物侦探城：<br />徽章失踪案</h1>
        <p>你将成为新手小侦探，跟着鹿队长调查胡萝卜徽章为什么对不上。完成除法闯关，收集线索，破解最后的 Boss 谜题。</p>
        <form id="start-form" class="name-row" action="javascript:void(0)" novalidate onsubmit="return window.startGameFromForm ? window.startGameFromForm(event) : false">
          <input id="nickname" name="nickname" maxlength="8" placeholder="输入侦探昵称" value="${escapeHtml(nicknameDraft)}" autocomplete="nickname" />
          <button class="btn primary" type="submit" onclick="return window.startGameFromForm ? window.startGameFromForm(event) : false">开始调查</button>
        </form>
      </div>
      <div class="city-illustration" aria-label="动物侦探城插画">
        <div class="building one"></div>
        <div class="building two"></div>
        <div class="building three"></div>
        <div class="street"></div>
        <div class="detective">🦌</div>
      </div>
    </section>
  `;
}

function startGame() {
  const input = document.querySelector("#nickname");
  state.user.nickname = (input?.value || nicknameDraft).trim() || "小侦探";
  state.user.started = true;
  saveState();
  render("map");
}

function renderMap() {
  const openWrongCount = Object.values(state.wrongQuestions).filter((item) => item.status === "open").length;
  app.innerHTML = `
    <section class="screen">
      <div class="section-head">
        <div>
          <h1>欢迎，${escapeHtml(state.user.nickname)}</h1>
          <p>今天的目标：收集 4 条线索，找出徽章数量异常的真相。</p>
        </div>
        <button class="btn danger" type="button" data-action="reset">清空记录</button>
      </div>
      ${progressStrip()}
      <div class="map-grid">
        <div class="city-map">
          <div class="map-road"></div>
          <button class="map-node case" type="button" data-action="case"><span>🏫</span><strong>徽章失踪案</strong></button>
          <button class="map-node wrongs" type="button" data-view="wrongs"><span>📁</span><strong>悬案馆</strong></button>
          <button class="map-node knowledge" type="button" data-view="knowledge"><span>📚</span><strong>线索库</strong></button>
          <button class="map-node badges" type="button" data-view="badges"><span>🏅</span><strong>勋章馆</strong></button>
          <button class="map-node boss" type="button" data-action="boss" ${state.progress.bossUnlocked ? "" : "disabled"}><span>🧩</span><strong>${state.progress.bossUnlocked ? "Boss 挑战" : "Boss 未解锁"}</strong></button>
        </div>
        <aside class="side-panel">
          <h2>${state.progress.caseClosed ? "案件已结案" : "调查进度"}</h2>
          <div class="stat-grid">
            <div class="stat"><small>已收集线索</small><strong>${state.progress.clues.length}/4</strong></div>
            <div class="stat"><small>通过关卡</small><strong>${state.progress.passedLevels.length}/4</strong></div>
            <div class="stat"><small>未侦破错题</small><strong>${openWrongCount}</strong></div>
            <div class="stat"><small>已获勋章</small><strong>${Object.keys(state.badges).length}/5</strong></div>
          </div>
          <p class="lead">${state.progress.caseClosed ? "你已经找出了真相，可以去线索库复习，也可以回到悬案馆清理错题。" : "先进入案件详情，鹿队长会带你继续当前关卡。"}</p>
          <div class="action-row">
            <button class="btn primary" type="button" data-action="case">查看案件</button>
            <button class="btn secondary" type="button" data-view="knowledge">复习线索</button>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderCase() {
  app.innerHTML = `
    <section class="screen">
      <div class="section-head">
        <div>
          <h1>徽章失踪案</h1>
          <p>鹿队长正在等待你的调查报告。</p>
        </div>
        <button class="btn secondary" type="button" data-action="go-map">返回地图</button>
      </div>
      ${progressStrip()}
      <div class="case-layout">
        <article class="content-card story-box">
          <p class="tag">案件背景</p>
          <h2>胡萝卜徽章数量对不上了</h2>
          <p class="lead">动物侦探学院准备给新手小侦探发放胡萝卜徽章。正式分发前，兔仓管发现记录和徽章数量不一样。你需要调查仓库、记录、运输路线和嫌疑说法。</p>
          <p>收集 4 条关键线索后，Boss 挑战会解锁。完成 Boss 就能结案，并获得“破案小能手”勋章。</p>
          <div class="action-row">
            <button class="btn primary" type="button" data-action="start-level">${state.progress.caseClosed ? "重新练习当前关卡" : "开始调查"}</button>
            <button class="btn secondary" type="button" data-action="boss" ${state.progress.bossUnlocked ? "" : "disabled"}>挑战 Boss</button>
          </div>
        </article>
        <aside class="content-card">
          <h2>关卡记录</h2>
          <div class="level-list">
            ${levels.map(renderLevelItem).join("")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderLevelItem(level) {
  const passed = state.progress.passedLevels.includes(level.id);
  const unlocked = level.order === 1 || state.progress.passedLevels.includes(levels[level.order - 2].id);
  return `
    <div class="level-item ${unlocked ? "" : "locked"}">
      <div>
        <strong>第 ${level.order} 关 · ${level.name}</strong>
        <div>${level.knowledgePoint}</div>
      </div>
      <button class="btn ${passed ? "secondary" : "primary"}" type="button" data-action="open-level" data-level-id="${level.id}" ${unlocked ? "" : "disabled"}>${passed ? "再练一次" : "进入"}</button>
    </div>
  `;
}

function progressStrip() {
  return `<div class="progress-strip" aria-label="线索进度">${levels.map((level) => `<span class="progress-step ${state.progress.clues.includes(level.id) ? "done" : ""}"></span>`).join("")}</div>`;
}

function nextPlayableLevel() {
  return levels.find((level) => !state.progress.passedLevels.includes(level.id))?.id ?? "level-4";
}

function startLevel(levelId) {
  const level = levels.find((item) => item.id === levelId) ?? levels[0];
  const previous = levels[level.order - 2];
  if (previous && !state.progress.passedLevels.includes(previous.id)) {
    showToast("先完成上一关，线索会更清楚。");
    return;
  }
  activeLevelId = level.id;
  activeQuestionIds = questions.filter((item) => item.levelId === level.id).map((item) => item.questionId);
  activeQuestionIndex = 0;
  activeCorrectCount = 0;
  activeWrongCount = 0;
  lastAnswerLocked = false;
  selectedAnswer = "";
  selectedAnswerQuestionId = "";
  render("level");
}

function startBoss() {
  if (!state.progress.bossUnlocked) {
    showToast("还差线索。集齐 4 条线索后再来挑战 Boss。");
    return;
  }
  activeLevelId = "boss";
  activeQuestionIds = questions.filter((item) => item.levelId === "boss").map((item) => item.questionId);
  activeQuestionIndex = 0;
  activeCorrectCount = 0;
  activeWrongCount = 0;
  lastAnswerLocked = false;
  selectedAnswer = "";
  selectedAnswerQuestionId = "";
  render("boss");
}

function renderQuestion() {
  const question = questions.find((item) => item.questionId === activeQuestionIds[activeQuestionIndex]);
  const level = levels.find((item) => item.id === activeLevelId);
  if (!question) {
    activeLevelId === "boss" ? finishBoss() : finishLevel();
    return;
  }

  const total = activeQuestionIds.length;
  const title = activeLevelId === "boss" ? "Boss 综合推理" : `${level.name} · ${level.place}`;
  app.innerHTML = `
    <section class="screen">
      <div class="section-head">
        <div>
          <h1>${title}</h1>
          <p>${activeLevelId === "boss" ? "把 4 条线索连起来，找出真相。" : level.intro}</p>
        </div>
        <button class="btn secondary" type="button" data-action="case">返回案件</button>
      </div>
      <section class="question-panel">
        <div class="question-meta">
          <span class="tag">${question.knowledgePoint}</span>
          <span class="tag warn">第 ${activeQuestionIndex + 1}/${total} 题</span>
          <span class="tag">已答对 ${activeCorrectCount} 题</span>
        </div>
        <h2>${escapeHtml(question.stem)}</h2>
        <div class="answer-zone">${renderAnswerInput(question)}</div>
        <div class="feedback" role="status">选择或填写答案后，点击提交。</div>
        <div class="panel-actions">
          <button class="btn primary" type="button" data-action="submit-answer" disabled>提交答案</button>
        </div>
      </section>
    </section>
  `;
}

function renderAnswerInput(question) {
  if (question.questionType === "fill") {
    return `
      <div class="fill-answer" aria-label="填空答案">
        <div class="fill-display" data-fill-display="${question.questionId}">点数字作答</div>
        <div class="number-pad">
          ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
            .map((digit) => `<button class="number-key" type="button" data-fill-key="${digit}" data-question-id="${question.questionId}">${digit}</button>`)
            .join("")}
          <button class="number-key clear" type="button" data-fill-key="clear" data-question-id="${question.questionId}">清空</button>
        </div>
      </div>
    `;
  }
  return `
    <div class="option-grid">
      ${question.options
        .map(
          (option) => `
            <button class="option answer-option" type="button" data-answer="${escapeHtml(option)}" data-question-id="${question.questionId}" aria-pressed="false">
              <span class="option-marker"></span>
              <span>${escapeHtml(option)}</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function findQuestion(questionId) {
  return questions.find((question) => question.questionId === questionId) ?? backupQuestions.find((question) => question.questionId === questionId);
}

function submitAnswer() {
  if (lastAnswerLocked) return;
  const question = questions.find((item) => item.questionId === activeQuestionIds[activeQuestionIndex]);
  const userAnswer = readAnswer(question);
  if (!userAnswer) {
    showToast("先写下你的推理答案。");
    return;
  }
  lastAnswerLocked = true;
  document.querySelector("[data-action='submit-answer']")?.setAttribute("disabled", "");
  const isCorrect = normalize(userAnswer) === normalize(question.answer);
  activeCorrectCount += isCorrect ? 1 : 0;
  activeWrongCount += isCorrect ? 0 : 1;
  recordAnswer(question, userAnswer, isCorrect);
  if (!isCorrect) addWrongQuestion(question, userAnswer);
  saveState();

  const feedback = document.querySelector(".feedback");
  const actions = document.querySelector(".panel-actions");
  feedback.className = `feedback ${isCorrect ? "correct" : "wrong"}`;
  feedback.textContent = isCorrect ? `太棒了！${question.explanation}` : `${question.wrongHint} 正确线索：${question.explanation}`;
  actions.innerHTML = `<button class="btn primary" type="button" data-action="${activeQuestionIndex + 1 >= activeQuestionIds.length ? (activeLevelId === "boss" ? "finish-boss" : "finish-level") : "next-question"}">${activeQuestionIndex + 1 >= activeQuestionIds.length ? "查看结果" : "下一题"}</button>`;
  bindInteractiveButtons();
  document.querySelectorAll("input").forEach((input) => {
    input.disabled = true;
  });
  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.disabled = true;
  });
  document.querySelectorAll("[data-fill-key]").forEach((button) => {
    button.disabled = true;
  });
}

function readAnswer(question) {
  return selectedAnswerQuestionId === question.questionId ? selectedAnswer : "";
}

function nextQuestion() {
  activeQuestionIndex += 1;
  lastAnswerLocked = false;
  selectedAnswer = "";
  selectedAnswerQuestionId = "";
  render(activeLevelId === "boss" ? "boss" : "level");
}

function finishLevel() {
  const passed = activeCorrectCount >= 3;
  const level = levels.find((item) => item.id === activeLevelId);
  if (!passed) {
    app.innerHTML = `
      <section class="screen result-panel">
        <h1>这一轮线索还不够清楚</h1>
        <p class="lead">你答对了 ${activeCorrectCount}/4 题。先整理一下思路，再重新调查这一关。</p>
        <div class="action-row">
          <button class="btn primary" type="button" data-action="open-level" data-level-id="${activeLevelId}">重新挑战</button>
          <button class="btn secondary" type="button" data-view="knowledge">去线索库</button>
        </div>
      </section>
    `;
    bindInteractiveButtons();
    return;
  }

  if (!state.progress.passedLevels.includes(level.id)) state.progress.passedLevels.push(level.id);
  if (!state.progress.clues.includes(level.id)) state.progress.clues.push(level.id);
  state.progress.currentLevel = nextPlayableLevel();
  awardBadge("rookie");
  if (state.progress.clues.length >= 4) awardBadge("collector");
  saveState();
  render("clue");
}

function renderClue() {
  const level = levels.find((item) => item.id === activeLevelId) ?? levels[0];
  app.innerHTML = `
    <section class="screen result-panel">
      <p class="tag">调查完成</p>
      <h1>你获得了一条新线索</h1>
      <div class="clue-card">
        <strong>${level.name}</strong>
        <p>${level.clue}</p>
      </div>
      <p class="lead">这张知识线索卡已经收入线索库。</p>
      <div class="action-row">
        <button class="btn primary" type="button" data-action="${state.progress.bossUnlocked ? "boss" : "start-level"}">${state.progress.bossUnlocked ? "挑战 Boss" : "继续下一关"}</button>
        <button class="btn secondary" type="button" data-view="knowledge">查看线索库</button>
      </div>
    </section>
  `;
}

function finishBoss() {
  const passed = activeCorrectCount >= 2;
  if (!passed) {
    app.innerHTML = `
      <section class="screen result-panel">
        <h1>Boss 的谜题还没有完全破解</h1>
        <p class="lead">你可以先去线索库看看提示，也可以马上再挑战一次。</p>
        <div class="action-row">
          <button class="btn primary" type="button" data-action="retry-boss">再挑战一次</button>
          <button class="btn secondary" type="button" data-view="knowledge">去线索库复习</button>
        </div>
      </section>
    `;
    bindInteractiveButtons();
    return;
  }
  state.progress.caseClosed = true;
  awardBadge("caseCloser");
  saveState();
  render("closing");
}

function renderClosing() {
  const newWrongs = Object.values(state.wrongQuestions).filter((item) => item.status === "open").length;
  app.innerHTML = `
    <section class="screen result-panel">
      <p class="tag">案件成功破解</p>
      <h1>真相：徽章没有丢</h1>
      <p class="lead">35 枚徽章每队分 6 枚，只能分给 5 个完整小队，还剩 5 枚。剩下的徽章不够再分一个完整小队，所以狐狸配送员的说法不对。</p>
      <div class="stat-grid">
        <div class="stat"><small>掌握知识点</small><strong>4</strong></div>
        <div class="stat"><small>收集线索</small><strong>${state.progress.clues.length}</strong></div>
        <div class="stat"><small>未侦破错题</small><strong>${newWrongs}</strong></div>
        <div class="stat"><small>新增勋章</small><strong>🏅</strong></div>
      </div>
      <p>动物侦探学院为你颁发“破案小能手”勋章。</p>
      <div class="action-row">
        <button class="btn primary" type="button" data-action="go-map">返回地图</button>
        <button class="btn secondary" type="button" data-view="knowledge">去线索库复习</button>
        <button class="btn secondary" type="button" data-view="wrongs">去悬案馆调查</button>
      </div>
    </section>
  `;
}

function renderWrongs() {
  const wrongs = Object.values(state.wrongQuestions).sort((a, b) => new Date(b.lastWrongAt) - new Date(a.lastWrongAt));
  if (wrongs.length > 0) {
    awardBadge("reviewer");
    saveState();
  }
  app.innerHTML = `
    <section class="screen">
      <div class="section-head">
        <div>
          <h1>悬案馆</h1>
          <p>答错的题会来到这里。重新答对一次，就能标记为已侦破。</p>
        </div>
        <button class="btn secondary" type="button" data-action="go-map">返回地图</button>
      </div>
      ${
        wrongs.length
          ? `<div class="cards-grid">${wrongs.map(renderWrongCard).join("")}</div>`
          : `<div class="empty-state"><h2>这里还没有悬案</h2><p>如果之后遇到错题，它会自动来到这里。</p></div>`
      }
    </section>
  `;
}

function renderWrongCard(item) {
  const question = findQuestion(item.questionId);
  const canReview = Boolean(question);
  return `
    <article class="wrong-card">
      <p class="tag ${item.status === "open" ? "warn" : ""}">${item.status === "open" ? "未侦破" : "已侦破"}</p>
      <h3>${escapeHtml(item.stem)}</h3>
      <dl>
        <div><dt>你的答案</dt><dd>${escapeHtml(item.userAnswer)}</dd></div>
        <div><dt>原错误答案</dt><dd>${escapeHtml(item.originalAnswer ?? item.userAnswer)}</dd></div>
        <div><dt>正确答案</dt><dd>${escapeHtml(item.answer)}</dd></div>
        <div><dt>知识点</dt><dd>${escapeHtml(item.knowledgePoint)}</dd></div>
        <div><dt>错误次数</dt><dd>${item.errorCount}</dd></div>
        <div><dt>最近错误时间</dt><dd>${formatTime(item.lastWrongAt)}</dd></div>
        <div><dt>解析</dt><dd>${escapeHtml(item.explanation)}</dd></div>
      </dl>
      <button class="btn primary" type="button" data-action="review" data-question-id="${escapeHtml(item.questionId)}" ${canReview ? "" : "disabled"}>${canReview ? (item.status === "open" ? "重新调查" : "再练一次") : "题目已下线"}</button>
    </article>
  `;
}

function startReview(questionId) {
  if (!findQuestion(questionId)) {
    showToast("这道旧题暂时不能重做。");
    render("wrongs");
    return;
  }
  reviewQuestionId = questionId;
  lastAnswerLocked = false;
  selectedAnswer = "";
  selectedAnswerQuestionId = "";
  render("review");
}

function renderReview() {
  const question = findQuestion(reviewQuestionId);
  if (!question) {
    render("wrongs");
    return;
  }
  app.innerHTML = `
    <section class="screen">
      <div class="section-head">
        <div>
          <h1>重新调查</h1>
          <p>这次只要答对，悬案就会变成已侦破。</p>
        </div>
        <button class="btn secondary" type="button" data-view="wrongs">返回悬案馆</button>
      </div>
      <section class="question-panel">
        <div class="question-meta">
          <span class="tag">${question.knowledgePoint}</span>
          <span class="tag warn">错题复习</span>
        </div>
        <h2>${escapeHtml(question.stem)}</h2>
        <div class="answer-zone">${renderAnswerInput(question)}</div>
        <div class="feedback" role="status">重新推理一次。</div>
        <div class="panel-actions">
          <button class="btn primary" type="button" data-action="submit-review" disabled>提交复习答案</button>
        </div>
      </section>
    </section>
  `;
}

function submitReview() {
  if (lastAnswerLocked) return;
  const question = findQuestion(reviewQuestionId);
  if (!question) {
    showToast("这道旧题暂时不能重做。");
    render("wrongs");
    return;
  }
  const userAnswer = readAnswer(question);
  if (!userAnswer) {
    showToast("先写下你的复习答案。");
    return;
  }
  const isCorrect = normalize(userAnswer) === normalize(question.answer);
  const feedback = document.querySelector(".feedback");
  feedback.className = `feedback ${isCorrect ? "correct" : "wrong"}`;
  lastAnswerLocked = true;
  document.querySelector("[data-action='submit-review']")?.setAttribute("disabled", "");
  if (isCorrect) {
    state.wrongQuestions[question.questionId].status = "solved";
    state.wrongQuestions[question.questionId].solvedAt = new Date().toISOString();
    recordAnswer(question, userAnswer, true);
    awardBadge("persistent");
    saveState();
    feedback.textContent = `悬案已侦破！${question.explanation}`;
    document.querySelectorAll("[data-answer], [data-fill-key]").forEach((button) => {
      button.disabled = true;
    });
    document.querySelector(".panel-actions").innerHTML = `<button class="btn primary" type="button" data-view="wrongs">回悬案馆</button>`;
    bindInteractiveButtons();
  } else {
    addWrongQuestion(question, userAnswer);
    recordAnswer(question, userAnswer, false);
    saveState();
    feedback.textContent = `还差一点点。${question.explanation}`;
    document.querySelectorAll("[data-answer], [data-fill-key]").forEach((button) => {
      button.disabled = true;
    });
    document.querySelector(".panel-actions").innerHTML = `
      <button class="btn primary" type="button" data-action="review" data-question-id="${question.questionId}">再试一次</button>
      <button class="btn secondary" type="button" data-view="wrongs">回悬案馆</button>
    `;
    bindInteractiveButtons();
  }
}

function renderKnowledge() {
  app.innerHTML = `
    <section class="screen">
      <div class="section-head">
        <div>
          <h1>线索库</h1>
          <p>每通过一个普通关卡，就会解锁一张知识线索卡。</p>
        </div>
        <button class="btn secondary" type="button" data-action="go-map">返回地图</button>
      </div>
      <div class="cards-grid">
        ${knowledgeCards.map(renderKnowledgeCard).join("")}
      </div>
    </section>
  `;
}

function renderKnowledgeCard(card) {
  const unlocked = state.progress.clues.includes(card.id);
  return `
    <article class="knowledge-card ${unlocked ? "" : "locked"}">
      <p class="tag">${unlocked ? "已解锁" : "未解锁"}</p>
      <h3>${card.title}</h3>
      <dl>
        <div><dt>知识点</dt><dd>${card.knowledgePoint}</dd></div>
        <div><dt>一句话解释</dt><dd>${unlocked ? card.summary : "完成对应关卡后解锁。"}</dd></div>
        <div><dt>例题</dt><dd>${unlocked ? card.example : "线索还藏在案件里。"}</dd></div>
        <div><dt>方法</dt><dd>${unlocked ? card.method : "先去调查关卡。"}</dd></div>
        <div><dt>常见错误</dt><dd>${unlocked ? card.mistake : "解锁后可以查看。"}</dd></div>
        <div><dt>关联关卡</dt><dd>${card.level}</dd></div>
      </dl>
      <button class="btn secondary" type="button" data-action="open-level" data-level-id="${card.id}">${unlocked ? "返回练习" : "去解锁"}</button>
    </article>
  `;
}

function renderBadges() {
  app.innerHTML = `
    <section class="screen">
      <div class="section-head">
        <div>
          <h1>勋章馆</h1>
          <p>勋章记录每一次认真调查。</p>
        </div>
        <button class="btn secondary" type="button" data-action="go-map">返回地图</button>
      </div>
      <div class="badge-grid">
        ${badgeDefs.map(renderBadgeCard).join("")}
      </div>
    </section>
  `;
}

function renderBadgeCard(badge) {
  const record = state.badges[badge.id];
  return `
    <article class="badge-card ${record ? "" : "locked"}">
      <div class="badge-icon">${record?.icon ?? badge.icon}</div>
      <h3>${badge.name}</h3>
      <p>${badge.reason}</p>
      <p class="tag">${record ? `获得于 ${formatTime(record.earnedAt)}` : "尚未获得"}</p>
    </article>
  `;
}

function recordAnswer(question, userAnswer, isCorrect) {
  state.answerRecords.push({
    ...dataStamp({
      questionVersion: question.contentVersion ?? activeContentMeta.contentVersion,
    }),
    userId: state.user.id,
    questionId: question.questionId,
    caseId: question.caseId ?? state.progress.caseId,
    levelId: question.levelId,
    contentLevelId: question.contentLevelId ?? question.levelId,
    subjectId: question.subjectId,
    textbookVersionId: question.textbookVersionId,
    unitId: question.unitId,
    knowledgePointId: question.knowledgePointId,
    skillId: question.skillId,
    misconceptionId: question.misconceptionId,
    userAnswer,
    correctAnswer: question.answer,
    isCorrect,
    answeredAt: new Date().toISOString(),
    isFirstAnswer: !state.answerRecords.some((record) => record.questionId === question.questionId),
  });
}

function addWrongQuestion(question, userAnswer) {
  const existing = state.wrongQuestions[question.questionId];
  state.wrongQuestions[question.questionId] = {
    ...dataStamp({
      questionVersion: question.contentVersion ?? activeContentMeta.contentVersion,
      questionMigrated: false,
    }),
    userId: state.user.id,
    questionId: question.questionId,
    caseId: question.caseId ?? state.progress.caseId,
    levelId: question.levelId,
    contentLevelId: question.contentLevelId ?? question.levelId,
    knowledgePointId: question.knowledgePointId,
    skillId: question.skillId,
    misconceptionId: question.misconceptionId,
    stem: question.stem,
    userAnswer,
    originalAnswer: existing?.originalAnswer ?? existing?.userAnswer ?? userAnswer,
    answer: question.answer,
    knowledgePoint: question.knowledgePoint,
    explanation: question.explanation,
    errorCount: (existing?.errorCount ?? 0) + 1,
    lastWrongAt: new Date().toISOString(),
    status: "open",
  };
}

function awardBadge(id) {
  if (state.badges[id]) return;
  const badge = badgeDefs.find((item) => item.id === id);
  if (!badge) return;
  state.badges[id] = {
    ...dataStamp(),
    userId: state.user.id,
    badgeId: id,
    contentBadgeId: badge.badgeId ?? id,
    name: badge.name,
    icon: badge.icon,
    earnedAt: new Date().toISOString(),
    reason: badge.reason,
    caseId: state.progress.caseId,
  };
  showToast(`获得勋章：${badge.name}`);
}

function resetProgress() {
  if (!confirm("确定清空本地学习记录吗？")) return;
  storage.removeItem(STORAGE_KEY);
  state = defaultState();
  activeLevelId = null;
  render("start");
}

function createSafeStorage() {
  const memoryStore = new Map();
  let persistentStorage = null;
  try {
    const testKey = `${STORAGE_KEY}:test`;
    globalThis.localStorage.setItem(testKey, "1");
    globalThis.localStorage.removeItem(testKey);
    persistentStorage = globalThis.localStorage;
  } catch {
  }

  return {
    getItem(key) {
      try {
        return persistentStorage?.getItem(key) ?? (memoryStore.has(key) ? memoryStore.get(key) : null);
      } catch {
        return memoryStore.has(key) ? memoryStore.get(key) : null;
      }
    },
    setItem(key, value) {
      const stringValue = String(value);
      memoryStore.set(key, stringValue);
      try {
        persistentStorage?.setItem(key, stringValue);
      } catch {
        persistentStorage = null;
      }
    },
    removeItem(key) {
      memoryStore.delete(key);
      try {
        persistentStorage?.removeItem(key);
      } catch {
        persistentStorage = null;
      }
    },
  };
}

function normalize(value) {
  return String(value).trim().replace(/\s+/g, "").replace(/。/g, "").toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(value) {
  if (!value) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function updateActiveNav() {
  const current = app.dataset.view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === current);
  });
}
