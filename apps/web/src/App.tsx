import { useEffect, useMemo, useRef, useState } from "react";
import type { Badge, BossTask, CaseConfig, ContentPackageManifest, ContentPackageRegistryEntry, KnowledgeCard, LevelConfig, Question } from "@quest-academy/content-schema";
import type { ContentRuntime } from "@quest-academy/content-runtime";
import {
  addWrongRecord,
  applyBossResult,
  applyLevelResult,
  awardBadges,
  buildReviewRoute,
  checkAnswer,
  finishBoss,
  finishLevel,
  markWrongRecordSolved,
  type AnswerResult,
  type BadgeRecordMap,
  type LearningProgress,
  type WrongRecord,
  type WrongRecordMap,
} from "@quest-academy/game-core";
import { getBundledContentPackageEntry, getBundledContentRegistry, loadBundledContentRuntime } from "./contentPackage";
import {
  clearStoredState,
  createDefaultProgress,
  createDefaultUser,
  loadStoredState,
  saveStoredState,
  type LoadedStoredState,
  type UserState,
} from "./storage";

type View = "start" | "map" | "case" | "level" | "boss" | "clue" | "closing" | "wrongs" | "knowledge" | "badges" | "review" | "levelResult" | "bossResult";
type PlayerMode = "level" | "boss" | "review";

interface CourseConfig {
  courseId: string;
  courseTitle: string;
  emptyTitle: string;
  emptyDescription: string;
}

interface RuntimeModel {
  runtime: ContentRuntime;
  manifest: ContentPackageManifest;
  currentEntry: ContentPackageRegistryEntry;
  caseData: CaseConfig;
  bossTask: BossTask;
  levels: LevelConfig[];
  badges: Badge[];
  questions: Question[];
  reserveQuestions: Question[];
  knowledgeCards: KnowledgeCard[];
  knowledgeNameById: Map<string, string>;
}

interface PlayerState {
  mode: PlayerMode;
  levelId?: string;
  reviewQuestionId?: string;
  questionIds: string[];
  index: number;
  selectedAnswer: string;
  locked: boolean;
  feedback: string;
  feedbackTone: "idle" | "correct" | "wrong";
  results: AnswerResult[];
}

interface LevelResultView {
  levelId: string;
  correctCount: number;
  total: number;
  passed: boolean;
}

interface BossResultView {
  correctCount: number;
  total: number;
  passed: boolean;
}

const SUPPORTED_COURSES: CourseConfig[] = [
  {
    courseId: "chinese",
    courseTitle: "语文",
    emptyTitle: "语文路线待接入",
    emptyDescription: "后续接入语文内容包后，单元会按顺序出现在这里。",
  },
  {
    courseId: "math",
    courseTitle: "数学",
    emptyTitle: "数学路线待接入",
    emptyDescription: "数学内容包接入后，单元会按教材顺序串联成路线。",
  },
  {
    courseId: "english",
    courseTitle: "英语",
    emptyTitle: "英语路线待接入",
    emptyDescription: "后续接入英语内容包后，单元会按顺序出现在这里。",
  },
];

export function App() {
  const [activeContentPackageId, setActiveContentPackageId] = useState(() => getInitialContentPackageId());
  const [model, setModel] = useState<RuntimeModel | null>(null);
  const [loadError, setLoadError] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("start");
  const [selectedCourseId, setSelectedCourseId] = useState("math");
  const [nickname, setNickname] = useState("");
  const [user, setUser] = useState<UserState>(() => createDefaultUser());
  const [progress, setProgress] = useState<LearningProgress>(() => createDefaultProgress());
  const [wrongRecords, setWrongRecords] = useState<WrongRecordMap>({});
  const [badgeRecords, setBadgeRecords] = useState<BadgeRecordMap>({});
  const [answerRecords, setAnswerRecords] = useState<unknown[]>([]);
  const [migratedFromDataVersion, setMigratedFromDataVersion] = useState("");
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [toast, setToast] = useState("");
  const [levelResult, setLevelResult] = useState<LevelResultView | null>(null);
  const [bossResult, setBossResult] = useState<BossResultView | null>(null);
  const [lastClueLevelId, setLastClueLevelId] = useState<string>("");
  const userRef = useRef(user);
  const internalPackageSwitchRef = useRef(false);

  useEffect(() => {
    let active = true;
    setHydrated(false);
    setLoadError("");
    setPlayer(null);
    setLevelResult(null);
    setBossResult(null);
    setLastClueLevelId("");

    let currentEntry: ContentPackageRegistryEntry;
    try {
      currentEntry = getBundledContentPackageEntry(activeContentPackageId);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : String(error));
      return () => {
        active = false;
      };
    }

    loadBundledContentRuntime(currentEntry.contentPackageId)
      .then((runtime) => {
        if (!active) return;
        const nextModel = buildRuntimeModel(runtime, currentEntry);
        const storedState = loadStoredState(toStorageModel(nextModel));
        setModel(nextModel);
        setSelectedCourseId(getEntryCourseId(currentEntry));
        hydrateState(storedState, { preserveStartedUser: internalPackageSwitchRef.current });
        internalPackageSwitchRef.current = false;
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : String(error));
        internalPackageSwitchRef.current = false;
      });

    return () => {
      active = false;
    };
  }, [activeContentPackageId]);

  useEffect(() => {
    if (!model || !hydrated) return;
    saveStoredState(toStorageModel(model), {
      user,
      progress,
      wrongRecords,
      badgeRecords,
      answerRecords,
      migratedFromDataVersion,
    });
  }, [answerRecords, badgeRecords, hydrated, migratedFromDataVersion, model, progress, user, wrongRecords]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handlePopState = () => {
      internalPackageSwitchRef.current = true;
      setActiveContentPackageId(getInitialContentPackageId());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activeQuestion = useMemo(() => {
    if (!model || !player) return null;
    return findQuestion(model, player.questionIds[player.index]);
  }, [model, player]);

  if (loadError) {
    return (
      <AppShell view={view} started={false} onNavigate={setView}>
        <section className="screen result-panel">
          <p className="tag warn">内容包加载失败</p>
          <h1>内容包没有加载成功</h1>
          <p className="lead">{loadError}</p>
        </section>
      </AppShell>
    );
  }

  if (!model) {
    return (
      <AppShell view={view} started={false} onNavigate={setView}>
        <section className="screen result-panel">
          <p className="tag">内容包加载中</p>
          <h1>正在整理调查档案</h1>
          <p className="lead">请稍等，题目、线索和知识卡正在从内容包读取。</p>
        </section>
      </AppShell>
    );
  }

  const openView = (nextView: View) => {
    if (nextView === "wrongs" && Object.keys(wrongRecords).length > 0) {
      setBadgeRecords((records) =>
        awardBadges(model.badges, records, { type: "first_wrong_review", caseId: model.caseData.caseId }, new Date().toISOString()),
      );
    }
    setView(nextView);
  };

  const showToast = (message: string) => setToast(message);

  const startGame = () => {
    setUser((current) => ({
      ...current,
      nickname: nickname.trim() || "小侦探",
      started: true,
      lastLoginAt: new Date().toISOString(),
    }));
    setView("map");
  };

  const openContentPackage = (contentPackageId: string) => {
    if (contentPackageId === model.currentEntry.contentPackageId) {
      openView("case");
      return;
    }
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("contentPackageId", contentPackageId);
    window.history.pushState(null, "", nextUrl.toString());
    internalPackageSwitchRef.current = true;
    setActiveContentPackageId(contentPackageId);
  };

  const resetProgress = () => {
    clearStoredState(model ? toStorageModel(model) : undefined);
    setProgress(createDefaultProgress());
    setWrongRecords({});
    setBadgeRecords({});
    setAnswerRecords([]);
    setMigratedFromDataVersion("");
    setPlayer(null);
    setLevelResult(null);
    setBossResult(null);
    setLastClueLevelId("");
    setNickname("");
    setUser(createDefaultUser());
    setView("start");
  };

  const startLevel = (levelId: string) => {
    const level = model.levels.find((item) => item.levelId === levelId) ?? model.levels[0];
    const previousLevel = model.levels[level.order - 2];
    if (previousLevel && !progress.passedLevelIds.includes(previousLevel.levelId)) {
      showToast("先完成上一关，线索会更清楚。");
      return;
    }

    setPlayer({
      mode: "level",
      levelId: level.levelId,
      questionIds: model.runtime.getQuestionsByLevel(level.levelId).map((question) => question.questionId),
      index: 0,
      selectedAnswer: "",
      locked: false,
      feedback: "选择或填写答案后，点击提交。",
      feedbackTone: "idle",
      results: [],
    });
    setView("level");
  };

  const startNextLevel = () => {
    startLevel(nextPlayableLevelId(model.levels, progress));
  };

  const startBoss = () => {
    if (!progress.bossUnlocked) {
      showToast(`还差线索。集齐 ${model.levels.length} 条线索后再来挑战 Boss。`);
      return;
    }

    setPlayer({
      mode: "boss",
      questionIds: model.runtime.getQuestionsByLevel("boss").map((question) => question.questionId),
      index: 0,
      selectedAnswer: "",
      locked: false,
      feedback: "选择或填写答案后，点击提交。",
      feedbackTone: "idle",
      results: [],
    });
    setView("boss");
  };

  const startReview = (questionId: string) => {
    const question = findQuestion(model, questionId);
    if (!question) {
      showToast("这道旧题暂时不能重做。");
      setView("wrongs");
      return;
    }

    setPlayer({
      mode: "review",
      reviewQuestionId: question.questionId,
      questionIds: [question.questionId],
      index: 0,
      selectedAnswer: "",
      locked: false,
      feedback: "重新推理一次。",
      feedbackTone: "idle",
      results: [],
    });
    setView("review");
  };

  const selectAnswer = (answer: string) => {
    setPlayer((current) => (current && !current.locked ? { ...current, selectedAnswer: answer } : current));
  };

  const appendDigit = (digit: string) => {
    setPlayer((current) => {
      if (!current || current.locked) return current;
      return { ...current, selectedAnswer: digit === "clear" ? "" : `${current.selectedAnswer}${digit}` };
    });
  };

  const submitAnswer = () => {
    if (!player || !activeQuestion || player.locked) return;
    if (!player.selectedAnswer) {
      showToast(player.mode === "review" ? "先写下你的复习答案。" : "先写下你的推理答案。");
      return;
    }

    const answerResult = checkAnswer(activeQuestion, player.selectedAnswer);
    setAnswerRecords((records) => [...records, answerResult]);
    if (!answerResult.isCorrect) {
      setWrongRecords((records) => addWrongRecord(records, answerResult));
    }

    if (player.mode === "review") {
      submitReviewResult(answerResult);
      return;
    }

    setPlayer((current) => {
      if (!current) return current;
      return {
        ...current,
        locked: true,
        feedback: answerResult.isCorrect ? `太棒了！${activeQuestion.explanation}` : `${activeQuestion.wrongHint} 正确线索：${activeQuestion.explanation}`,
        feedbackTone: answerResult.isCorrect ? "correct" : "wrong",
        results: [...current.results, answerResult],
      };
    });
  };

  const submitReviewResult = (answerResult: AnswerResult) => {
    if (answerResult.isCorrect) {
      setWrongRecords((records) => markWrongRecordSolved(records, answerResult.questionId));
      setBadgeRecords((records) =>
        awardBadges(model.badges, records, { type: "wrong_question_solved", caseId: model.caseData.caseId, questionId: answerResult.questionId }, new Date().toISOString()),
      );
      setPlayer((current) =>
        current
          ? {
              ...current,
              locked: true,
              feedback: `悬案已侦破！${answerResult.question.explanation}`,
              feedbackTone: "correct",
              results: [...current.results, answerResult],
            }
          : current,
      );
      return;
    }

    setPlayer((current) =>
      current
        ? {
            ...current,
            locked: true,
            feedback: `还差一点点。${answerResult.question.explanation}`,
            feedbackTone: "wrong",
            results: [...current.results, answerResult],
          }
        : current,
    );
  };

  const nextQuestion = () => {
    setPlayer((current) =>
      current
        ? {
            ...current,
            index: current.index + 1,
            selectedAnswer: "",
            locked: false,
            feedback: "选择或填写答案后，点击提交。",
            feedbackTone: "idle",
          }
        : current,
    );
  };

  const finishCurrentLevel = () => {
    if (!player?.levelId) return;
    const level = model.runtime.getLevel(player.levelId);
    const result = finishLevel(level, player.results);
    setLevelResult({
      levelId: result.levelId,
      correctCount: result.correctCount,
      total: result.total,
      passed: result.isPassed,
    });

    if (!result.isPassed) {
      setView("levelResult");
      return;
    }

    const nextProgress = applyLevelResult(progress, result, model.levels);
    setProgress(nextProgress);
    setLastClueLevelId(level.levelId);
    setBadgeRecords((records) => {
      let nextRecords = awardBadges(
        model.badges,
        records,
        { type: "first_level_passed", caseId: model.caseData.caseId, passedLevelIds: nextProgress.passedLevelIds },
        new Date().toISOString(),
      );
      nextRecords = awardBadges(
        model.badges,
        nextRecords,
        { type: "all_clues_collected", caseId: model.caseData.caseId, unlockedClueIds: nextProgress.unlockedClueIds },
        new Date().toISOString(),
      );
      return nextRecords;
    });
    setView("clue");
  };

  const finishCurrentBoss = () => {
    if (!player) return;
    const result = finishBoss(model.bossTask, player.results);
    setBossResult({
      correctCount: result.correctCount,
      total: result.total,
      passed: result.isPassed,
    });

    if (!result.isPassed) {
      setView("bossResult");
      return;
    }

    setProgress((current) => applyBossResult(current, result));
    setBadgeRecords((records) => awardBadges(model.badges, records, { type: "case_closed", caseId: model.caseData.caseId }, new Date().toISOString()));
    setView("closing");
  };

  const screen = (() => {
    switch (view) {
      case "start":
        return <StartScreen model={model} nickname={nickname} onNicknameChange={setNickname} onStart={startGame} />;
      case "map":
        return (
          <MapScreen
            model={model}
            selectedCourseId={selectedCourseId}
            nickname={user.nickname}
            progress={progress}
            wrongRecords={wrongRecords}
            badgeRecords={badgeRecords}
            onCourseChange={setSelectedCourseId}
            onOpenPackage={openContentPackage}
            onCase={() => openView("case")}
            onReset={resetProgress}
            onBoss={startBoss}
            onNavigate={openView}
          />
        );
      case "case":
        return <CaseDetail model={model} progress={progress} onMap={() => openView("map")} onStartLevel={startLevel} onStartNext={startNextLevel} onBoss={startBoss} />;
      case "level":
      case "boss":
      case "review":
        return activeQuestion && player ? (
          <QuestionScreen
            model={model}
            player={player}
            question={activeQuestion}
            onBack={view === "review" ? () => openView("wrongs") : () => openView("case")}
            onSelect={selectAnswer}
            onDigit={appendDigit}
            onSubmit={submitAnswer}
            onNext={nextQuestion}
            onFinish={player.mode === "boss" ? finishCurrentBoss : finishCurrentLevel}
            onReviewAgain={() => startReview(activeQuestion.questionId)}
          />
        ) : null;
      case "levelResult":
        return levelResult ? <LevelResultScreen result={levelResult} onRetry={() => startLevel(levelResult.levelId)} onKnowledge={() => openView("knowledge")} /> : null;
      case "bossResult":
        return bossResult ? <BossResultScreen onRetry={startBoss} onKnowledge={() => openView("knowledge")} /> : null;
      case "clue":
        return <ClueScreen model={model} progress={progress} levelId={lastClueLevelId} onContinue={progress.bossUnlocked ? startBoss : startNextLevel} onKnowledge={() => openView("knowledge")} />;
      case "closing":
        return <ClosingScreen model={model} progress={progress} wrongRecords={wrongRecords} onMap={() => openView("map")} onKnowledge={() => openView("knowledge")} onWrongs={() => openView("wrongs")} />;
      case "wrongs":
        return <WrongCaseHall model={model} wrongRecords={wrongRecords} onMap={() => openView("map")} onReview={startReview} />;
      case "knowledge":
        return <ClueLibrary model={model} progress={progress} onMap={() => openView("map")} onLevel={startLevel} />;
      case "badges":
        return <BadgeHall model={model} badgeRecords={badgeRecords} onMap={() => openView("map")} />;
      default:
        return null;
    }
  })();

  return (
    <AppShell subtitle={getShellSubtitle(model)} view={view} started={user.started} onNavigate={openView}>
      {screen}
      {toast ? <div className="toast">{toast}</div> : null}
    </AppShell>
  );

  function hydrateState(storedState: LoadedStoredState, options: { preserveStartedUser?: boolean } = {}) {
    const currentUser = userRef.current;
    const nextUser =
      options.preserveStartedUser && currentUser.started
        ? {
            ...storedState.user,
            nickname: currentUser.nickname,
            avatar: currentUser.avatar,
            started: true,
            lastLoginAt: new Date().toISOString(),
          }
        : storedState.user;

    setUser(nextUser);
    setNickname(nextUser.started && nextUser.nickname !== "小侦探" ? nextUser.nickname : "");
    setProgress(storedState.progress);
    setWrongRecords(storedState.wrongRecords);
    setBadgeRecords(storedState.badgeRecords);
    setAnswerRecords(storedState.answerRecords);
    setMigratedFromDataVersion(storedState.migratedFromDataVersion);
    setView(nextUser.started ? "map" : "start");
    setHydrated(true);
  }
}

function AppShell({
  children,
  subtitle = "内容包加载中",
  view,
  started,
  onNavigate,
}: {
  children: React.ReactNode;
  subtitle?: string;
  view: View;
  started: boolean;
  onNavigate: (view: View) => void;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => onNavigate(started ? "map" : "start")}>
          <span className="brand-mark">探</span>
          <span>
            <strong>动物侦探城</strong>
            <small>{subtitle}</small>
          </span>
        </button>
        {started ? (
          <nav className="quick-nav" aria-label="快捷导航">
            <button className={view === "map" ? "is-active" : ""} type="button" onClick={() => onNavigate("map")}>
              地图
            </button>
            <button className={view === "wrongs" ? "is-active" : ""} type="button" onClick={() => onNavigate("wrongs")}>
              悬案馆
            </button>
            <button className={view === "knowledge" ? "is-active" : ""} type="button" onClick={() => onNavigate("knowledge")}>
              线索库
            </button>
            <button className={view === "badges" ? "is-active" : ""} type="button" onClick={() => onNavigate("badges")}>
              勋章馆
            </button>
          </nav>
        ) : null}
      </header>
      <main>{children}</main>
    </div>
  );
}

function StartScreen({
  model,
  nickname,
  onNicknameChange,
  onStart,
}: {
  model: RuntimeModel;
  nickname: string;
  onNicknameChange: (value: string) => void;
  onStart: () => void;
}) {
  return (
    <section className="screen hero">
      <div className="hero-copy">
        <p className="tag">{model.manifest.title}</p>
        <h1>
          动物侦探城：
          <br />
          {model.caseData.name}
        </h1>
        <p>{model.caseData.story.summary} 完成闯关，收集线索，破解最后的 Boss 谜题。</p>
        <form
          className="name-row"
          onSubmit={(event) => {
            event.preventDefault();
            onStart();
          }}
        >
          <input maxLength={8} placeholder="输入侦探昵称" value={nickname} autoComplete="nickname" onChange={(event) => onNicknameChange(event.target.value)} />
          <button className="btn primary" type="submit">
            开始调查
          </button>
        </form>
      </div>
      <div className="city-illustration" aria-label="动物侦探城插画">
        <div className="building one" />
        <div className="building two" />
        <div className="building three" />
        <div className="street" />
        <div className="detective">🦌</div>
      </div>
    </section>
  );
}

function MapScreen({
  model,
  selectedCourseId,
  nickname,
  progress,
  wrongRecords,
  badgeRecords,
  onCourseChange,
  onOpenPackage,
  onCase,
  onReset,
  onBoss,
  onNavigate,
}: {
  model: RuntimeModel;
  selectedCourseId: string;
  nickname: string;
  progress: LearningProgress;
  wrongRecords: WrongRecordMap;
  badgeRecords: BadgeRecordMap;
  onCourseChange: (courseId: string) => void;
  onOpenPackage: (contentPackageId: string) => void;
  onCase: () => void;
  onReset: () => void;
  onBoss: () => void;
  onNavigate: (view: View) => void;
}) {
  const openWrongCount = Object.values(wrongRecords).filter((item) => item.status === "open").length;
  const selectedCourse = getCourseConfig(selectedCourseId);
  const routeEntries = getCourseRouteEntries(selectedCourseId);
  const activePackageId = model.currentEntry.contentPackageId;
  return (
    <section className="screen">
      <div className="section-head">
        <div>
          <h1>欢迎，{nickname}</h1>
          <p>
            选择学科后沿单元路线推进；每个单元进入后继续完成案件、知识点和错题复习。
          </p>
        </div>
        <button className="btn danger" type="button" onClick={onReset}>
          清空记录
        </button>
      </div>
      <div className="course-switcher" aria-label="学科切换">
        {SUPPORTED_COURSES.map((course) => (
          <button className={selectedCourseId === course.courseId ? "is-active" : ""} type="button" key={course.courseId} onClick={() => onCourseChange(course.courseId)}>
            {course.courseTitle}
          </button>
        ))}
      </div>
      <div className="map-grid">
        <div className="route-map" aria-label={`${selectedCourse.courseTitle}单元路线`}>
          <div className="route-map-head">
            <div>
              <p className="tag">{selectedCourse.courseTitle}</p>
              <h2>{routeEntries[0]?.routeTitle ?? selectedCourse.emptyTitle}</h2>
            </div>
            <span>{routeEntries.length ? `${routeEntries.length} 个单元` : "待接入"}</span>
          </div>
          {routeEntries.length ? (
            <div className="unit-route">
              {routeEntries.map((entry, index) => {
                const isActive = entry.contentPackageId === activePackageId;
                const isCompleted = isActive && progress.caseClosed;
                return (
                  <button
                    className={`unit-node ${isActive ? "is-active" : ""} ${isCompleted ? "is-complete" : ""}`}
                    type="button"
                    key={entry.contentPackageId}
                    onClick={() => onOpenPackage(entry.contentPackageId)}
                  >
                    <span className="unit-index">{entry.locationOrder ?? index + 1}</span>
                    <span>
                      <strong>{entry.locationTitle ?? entry.title}</strong>
                      <small>{isActive ? `${model.caseData.name} · 当前单元` : "进入该单元学习"}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state route-empty">
              <h2>{selectedCourse.emptyTitle}</h2>
              <p>{selectedCourse.emptyDescription}</p>
            </div>
          )}
        </div>
        <aside className="side-panel">
          <h2>{progress.caseClosed ? "当前单元已完成" : "当前单元进度"}</h2>
          <p className="current-unit">{model.currentEntry.locationTitle ?? model.manifest.title}</p>
          <ProgressStrip levels={model.levels} progress={progress} />
          <div className="stat-grid">
            <Stat label="已收集线索" value={`${progress.unlockedClueIds.length}/${model.levels.length}`} />
            <Stat label="通过关卡" value={`${progress.passedLevelIds.length}/${model.levels.length}`} />
            <Stat label="未侦破错题" value={openWrongCount} />
            <Stat label="已获勋章" value={`${Object.keys(badgeRecords).length}/${model.badges.length}`} />
          </div>
          <p className="lead">{progress.caseClosed ? "这个单元已经完成，可以复习知识点，也可以切到路线上的下一个单元。" : `继续推进「${model.caseData.name}」，检查本单元知识点是否掌握。`}</p>
          <div className="action-row">
            <button className="btn primary" type="button" onClick={onCase}>
              进入当前单元
            </button>
            <button className="btn secondary" type="button" onClick={() => onNavigate("knowledge")}>
              复习知识点
            </button>
            <button className="btn secondary" type="button" onClick={() => onNavigate("wrongs")}>
              查看错题
            </button>
            <button className="btn secondary" type="button" onClick={() => onNavigate("badges")}>
              查看勋章
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function CaseDetail({
  model,
  progress,
  onMap,
  onStartLevel,
  onStartNext,
  onBoss,
}: {
  model: RuntimeModel;
  progress: LearningProgress;
  onMap: () => void;
  onStartLevel: (levelId: string) => void;
  onStartNext: () => void;
  onBoss: () => void;
}) {
  return (
    <section className="screen">
      <div className="section-head">
        <div>
          <h1>{model.caseData.name}</h1>
          <p>鹿队长正在等待你的调查报告。</p>
        </div>
        <button className="btn secondary" type="button" onClick={onMap}>
          返回地图
        </button>
      </div>
      <ProgressStrip levels={model.levels} progress={progress} />
      <div className="case-layout">
        <article className="content-card story-box">
          <p className="tag">案件背景</p>
          <h2>{model.caseData.story.setting}</h2>
          <p className="lead">{model.caseData.story.summary}</p>
          <p>收集 {model.levels.length} 条关键线索后，Boss 挑战会解锁。完成 Boss 就能结案，并获得案件勋章。</p>
          <div className="action-row">
            <button className="btn primary" type="button" onClick={onStartNext}>
              {progress.caseClosed ? "重新练习当前关卡" : "开始调查"}
            </button>
            <button className="btn secondary" type="button" disabled={!progress.bossUnlocked} onClick={onBoss}>
              挑战 Boss
            </button>
          </div>
        </article>
        <aside className="content-card">
          <h2>关卡记录</h2>
          <div className="level-list">
            {model.levels.map((level) => {
              const passed = progress.passedLevelIds.includes(level.levelId);
              const previousLevel = model.levels[level.order - 2];
              const unlocked = !previousLevel || progress.passedLevelIds.includes(previousLevel.levelId);
              return (
                <div className={`level-item ${unlocked ? "" : "locked"}`} key={level.levelId}>
                  <div>
                    <strong>
                      第 {level.order} 关 · {level.name}
                    </strong>
                    <div>{model.knowledgeNameById.get(level.knowledgePointId) ?? level.knowledgePointId}</div>
                  </div>
                  <button className={`btn ${passed ? "secondary" : "primary"}`} type="button" disabled={!unlocked} onClick={() => onStartLevel(level.levelId)}>
                    {passed ? "再练一次" : "进入"}
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

function QuestionScreen({
  model,
  player,
  question,
  onBack,
  onSelect,
  onDigit,
  onSubmit,
  onNext,
  onFinish,
  onReviewAgain,
}: {
  model: RuntimeModel;
  player: PlayerState;
  question: Question;
  onBack: () => void;
  onSelect: (answer: string) => void;
  onDigit: (digit: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onFinish: () => void;
  onReviewAgain: () => void;
}) {
  const level = player.levelId ? model.runtime.getLevel(player.levelId) : null;
  const isReview = player.mode === "review";
  const title = player.mode === "boss" ? "Boss 综合推理" : isReview ? "重新调查" : `${level?.name ?? ""} · ${level?.place ?? ""}`;
  const subtitle = player.mode === "boss" ? `把 ${model.levels.length} 条线索连起来，找出真相。` : isReview ? "这次只要答对，悬案就会变成已侦破。" : level?.intro ?? "";
  const correctCount = player.results.filter((result) => result.isCorrect).length;
  const isLastQuestion = player.index + 1 >= player.questionIds.length;

  return (
    <section className="screen">
      <div className="section-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <button className="btn secondary" type="button" onClick={onBack}>
          {isReview ? "返回悬案馆" : "返回案件"}
        </button>
      </div>
      <section className="question-panel">
        <div className="question-meta">
          <span className="tag">{model.knowledgeNameById.get(question.knowledgePointId) ?? question.knowledgePointId}</span>
          <span className="tag warn">{isReview ? "错题复习" : `第 ${player.index + 1}/${player.questionIds.length} 题`}</span>
          {!isReview ? <span className="tag">已答对 {correctCount} 题</span> : null}
        </div>
        <h2>{question.stem}</h2>
        <AnswerInput question={question} selectedAnswer={player.selectedAnswer} locked={player.locked} onSelect={onSelect} onDigit={onDigit} />
        <div className={`feedback ${player.feedbackTone === "idle" ? "" : player.feedbackTone}`} role="status">
          {player.feedback}
        </div>
        <div className="panel-actions">
          {!player.locked ? (
            <button className="btn primary" type="button" disabled={!player.selectedAnswer} onClick={onSubmit}>
              {isReview ? "提交复习答案" : "提交答案"}
            </button>
          ) : isReview ? (
            player.feedbackTone === "correct" ? (
              <button className="btn primary" type="button" onClick={onBack}>
                回悬案馆
              </button>
            ) : (
              <>
                <button className="btn primary" type="button" onClick={onReviewAgain}>
                  再试一次
                </button>
                <button className="btn secondary" type="button" onClick={onBack}>
                  回悬案馆
                </button>
              </>
            )
          ) : (
            <button className="btn primary" type="button" onClick={isLastQuestion ? onFinish : onNext}>
              {isLastQuestion ? "查看结果" : "下一题"}
            </button>
          )}
        </div>
      </section>
    </section>
  );
}

function AnswerInput({
  question,
  selectedAnswer,
  locked,
  onSelect,
  onDigit,
}: {
  question: Question;
  selectedAnswer: string;
  locked: boolean;
  onSelect: (answer: string) => void;
  onDigit: (digit: string) => void;
}) {
  if (question.questionType === "fill") {
    return (
      <div className="answer-zone fill-answer" aria-label="填空答案">
        <div className="fill-display">{selectedAnswer || "点数字作答"}</div>
        <div className="number-pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
            <button className="number-key" type="button" disabled={locked} key={digit} onClick={() => onDigit(digit)}>
              {digit}
            </button>
          ))}
          <button className="number-key clear" type="button" disabled={locked} onClick={() => onDigit("clear")}>
            清空
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="answer-zone option-grid">
      {question.options.map((option) => (
        <button className={`option ${selectedAnswer === option ? "is-selected" : ""}`} type="button" disabled={locked} aria-pressed={selectedAnswer === option} key={option} onClick={() => onSelect(option)}>
          <span className="option-marker" />
          <span>{option}</span>
        </button>
      ))}
    </div>
  );
}

function LevelResultScreen({ result, onRetry, onKnowledge }: { result: LevelResultView; onRetry: () => void; onKnowledge: () => void }) {
  return (
    <section className="screen result-panel">
      <h1>这一轮线索还不够清楚</h1>
      <p className="lead">
        你答对了 {result.correctCount}/{result.total} 题。先整理一下思路，再重新调查这一关。
      </p>
      <div className="action-row">
        <button className="btn primary" type="button" onClick={onRetry}>
          重新挑战
        </button>
        <button className="btn secondary" type="button" onClick={onKnowledge}>
          去线索库
        </button>
      </div>
    </section>
  );
}

function ClueScreen({ model, progress, levelId, onContinue, onKnowledge }: { model: RuntimeModel; progress: LearningProgress; levelId: string; onContinue: () => void; onKnowledge: () => void }) {
  const level = model.runtime.getLevel(levelId || model.levels[0].levelId);
  const clue = model.runtime.getClues().find((item) => item.levelId === level.levelId);
  return (
    <section className="screen result-panel">
      <p className="tag">调查完成</p>
      <h1>你获得了一条新线索</h1>
      <div className="clue-card">
        <strong>{level.name}</strong>
        <p>{clue?.text ?? "这张知识线索卡已经收入线索库。"}</p>
      </div>
      <p className="lead">这张知识线索卡已经收入线索库。</p>
      <div className="action-row">
        <button className="btn primary" type="button" onClick={onContinue}>
          {progress.bossUnlocked ? "挑战 Boss" : "继续下一关"}
        </button>
        <button className="btn secondary" type="button" onClick={onKnowledge}>
          查看线索库
        </button>
      </div>
    </section>
  );
}

function BossResultScreen({ onRetry, onKnowledge }: { onRetry: () => void; onKnowledge: () => void }) {
  return (
    <section className="screen result-panel">
      <h1>Boss 的谜题还没有完全破解</h1>
      <p className="lead">你可以先去线索库看看提示，也可以马上再挑战一次。</p>
      <div className="action-row">
        <button className="btn primary" type="button" onClick={onRetry}>
          再挑战一次
        </button>
        <button className="btn secondary" type="button" onClick={onKnowledge}>
          去线索库复习
        </button>
      </div>
    </section>
  );
}

function ClosingScreen({
  model,
  progress,
  wrongRecords,
  onMap,
  onKnowledge,
  onWrongs,
}: {
  model: RuntimeModel;
  progress: LearningProgress;
  wrongRecords: WrongRecordMap;
  onMap: () => void;
  onKnowledge: () => void;
  onWrongs: () => void;
}) {
  const openWrongCount = Object.values(wrongRecords).filter((item) => item.status === "open").length;
  const closingBadge = model.badges.find((badge) => model.caseData.badgeRewardIds.includes(badge.badgeId)) ?? model.badges[model.badges.length - 1];
  return (
    <section className="screen result-panel">
      <p className="tag">案件成功破解</p>
      <h1>真相：{model.caseData.name}已破解</h1>
      <p className="lead">{model.bossTask.scenario}</p>
      <div className="stat-grid">
        <Stat label="掌握知识点" value={model.caseData.targetKnowledgePointIds.length} />
        <Stat label="收集线索" value={progress.unlockedClueIds.length} />
        <Stat label="未侦破错题" value={openWrongCount} />
        <Stat label="新增勋章" value="🏅" />
      </div>
      <p>动物侦探学院为你颁发“{closingBadge?.name ?? "破案小能手"}”勋章。</p>
      <div className="action-row">
        <button className="btn primary" type="button" onClick={onMap}>
          返回地图
        </button>
        <button className="btn secondary" type="button" onClick={onKnowledge}>
          去线索库复习
        </button>
        <button className="btn secondary" type="button" onClick={onWrongs}>
          去悬案馆调查
        </button>
      </div>
    </section>
  );
}

function WrongCaseHall({ model, wrongRecords, onMap, onReview }: { model: RuntimeModel; wrongRecords: WrongRecordMap; onMap: () => void; onReview: (questionId: string) => void }) {
  const wrongs = Object.values(wrongRecords).sort((a, b) => new Date(b.lastWrongAt).getTime() - new Date(a.lastWrongAt).getTime());
  return (
    <section className="screen">
      <div className="section-head">
        <div>
          <h1>悬案馆</h1>
          <p>答错的题会来到这里。重新答对一次，就能标记为已侦破。</p>
        </div>
        <button className="btn secondary" type="button" onClick={onMap}>
          返回地图
        </button>
      </div>
      {wrongs.length ? (
        <div className="cards-grid">
          {wrongs.map((item) => (
            <WrongCard model={model} item={item} key={item.questionId} onReview={onReview} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>这里还没有悬案</h2>
          <p>如果之后遇到错题，它会自动来到这里。</p>
        </div>
      )}
    </section>
  );
}

function WrongCard({ model, item, onReview }: { model: RuntimeModel; item: WrongRecord; onReview: (questionId: string) => void }) {
  const question = findQuestion(model, item.questionId);
  const reviewPlan = buildReviewRoute(item, model.runtime.getReviewRules());
  return (
    <article className="wrong-card">
      <p className={`tag ${item.status === "open" ? "warn" : ""}`}>{item.status === "open" ? "未侦破" : "已侦破"}</p>
      <h3>{item.stem}</h3>
      <dl>
        <div>
          <dt>你的答案</dt>
          <dd>{item.userAnswer}</dd>
        </div>
        <div>
          <dt>正确答案</dt>
          <dd>{item.correctAnswer}</dd>
        </div>
        <div>
          <dt>知识点</dt>
          <dd>{model.knowledgeNameById.get(item.knowledgePointId) ?? item.knowledgePointId}</dd>
        </div>
        <div>
          <dt>错误次数</dt>
          <dd>{item.wrongCount}</dd>
        </div>
        <div>
          <dt>最近错误时间</dt>
          <dd>{formatTime(item.lastWrongAt)}</dd>
        </div>
        <div>
          <dt>解析</dt>
          <dd>{item.explanation}</dd>
        </div>
        {reviewPlan ? (
          <div>
            <dt>复习建议</dt>
            <dd>{reviewPlan.knowledgeCardIds.length ? "先看关联知识卡，再重新调查。" : "重新读题并核对关键数量关系。"}</dd>
          </div>
        ) : null}
      </dl>
      <button className="btn primary" type="button" disabled={!question} onClick={() => onReview(item.questionId)}>
        {question ? (item.status === "open" ? "重新调查" : "再练一次") : "题目已下线"}
      </button>
    </article>
  );
}

function ClueLibrary({ model, progress, onMap, onLevel }: { model: RuntimeModel; progress: LearningProgress; onMap: () => void; onLevel: (levelId: string) => void }) {
  return (
    <section className="screen">
      <div className="section-head">
        <div>
          <h1>线索库</h1>
          <p>每通过一个普通关卡，就会解锁一张知识线索卡。</p>
        </div>
        <button className="btn secondary" type="button" onClick={onMap}>
          返回地图
        </button>
      </div>
      <div className="cards-grid">
        {model.knowledgeCards.map((card) => {
          const unlocked = progress.unlockedKnowledgeCardIds.includes(card.knowledgeCardId);
          const level = model.runtime.getLevel(card.levelId);
          return (
            <article className={`knowledge-card ${unlocked ? "" : "locked"}`} key={card.knowledgeCardId}>
              <p className="tag">{unlocked ? "已解锁" : "未解锁"}</p>
              <h3>{card.title}</h3>
              <dl>
                <div>
                  <dt>知识点</dt>
                  <dd>{model.knowledgeNameById.get(card.knowledgePointId) ?? card.knowledgePointId}</dd>
                </div>
                <div>
                  <dt>一句话解释</dt>
                  <dd>{unlocked ? card.summary : "完成对应关卡后解锁。"}</dd>
                </div>
                <div>
                  <dt>例题</dt>
                  <dd>{unlocked ? card.example : "线索还藏在案件里。"}</dd>
                </div>
                <div>
                  <dt>方法</dt>
                  <dd>{unlocked ? card.method : "先去调查关卡。"}</dd>
                </div>
                <div>
                  <dt>常见错误</dt>
                  <dd>{unlocked ? card.commonMistake : "解锁后可以查看。"}</dd>
                </div>
                <div>
                  <dt>关联关卡</dt>
                  <dd>
                    第 {level.order} 关：{level.name}
                  </dd>
                </div>
              </dl>
              <button className="btn secondary" type="button" onClick={() => onLevel(card.levelId)}>
                {unlocked ? "返回练习" : "去解锁"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BadgeHall({ model, badgeRecords, onMap }: { model: RuntimeModel; badgeRecords: BadgeRecordMap; onMap: () => void }) {
  return (
    <section className="screen">
      <div className="section-head">
        <div>
          <h1>勋章馆</h1>
          <p>勋章记录每一次认真调查。</p>
        </div>
        <button className="btn secondary" type="button" onClick={onMap}>
          返回地图
        </button>
      </div>
      <div className="badge-grid">
        {model.badges.map((badge) => {
          const record = badgeRecords[badge.badgeId];
          return (
            <article className={`badge-card ${record ? "" : "locked"}`} key={badge.badgeId}>
              <div className="badge-icon">{badgeIcon(badge.icon)}</div>
              <h3>{badge.name}</h3>
              <p>{badge.description.replace(/。$/, "")}</p>
              <p className="tag">{record ? `获得于 ${formatTime(record.earnedAt)}` : "尚未获得"}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProgressStrip({ levels, progress }: { levels: LevelConfig[]; progress: LearningProgress }) {
  return (
    <div className="progress-strip" aria-label="线索进度">
      {levels.map((level) => (
        <span className={`progress-step ${progress.passedLevelIds.includes(level.levelId) ? "done" : ""}`} key={level.levelId} />
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function buildRuntimeModel(runtime: ContentRuntime, currentEntry: ContentPackageRegistryEntry): RuntimeModel {
  const manifest = runtime.getManifest();
  const caseData = runtime.getCase();
  const levels = runtime.getLevels(caseData.caseId).slice().sort((a, b) => a.order - b.order);
  const bossTask = runtime.getBossTask(caseData.bossTaskId);
  const questions = [...levels.flatMap((level) => runtime.getQuestionsByLevel(level.levelId)), ...runtime.getQuestionsByLevel("boss")];
  const knowledgeCards = runtime.getKnowledgeCards();
  const knowledgeIds = new Set([
    ...caseData.targetKnowledgePointIds,
    ...levels.map((level) => level.knowledgePointId),
    ...questions.map((question) => question.knowledgePointId),
    ...knowledgeCards.map((card) => card.knowledgePointId),
  ]);
  const knowledgeNameById = new Map(
    [...knowledgeIds].map((id) => {
      const knowledgePoint = runtime.getKnowledgePoint(id);
      return [id, knowledgePoint.shortName || knowledgePoint.name];
    }),
  );

  return {
    runtime,
    manifest,
    currentEntry,
    caseData,
    bossTask,
    levels,
    badges: runtime.getBadges(),
    questions,
    reserveQuestions: runtime.getReserveQuestions(),
    knowledgeCards,
    knowledgeNameById,
  };
}

function getShellSubtitle(model: RuntimeModel) {
  return `${model.manifest.title.replace(/^北师大版二年级下册/, "")} · ${model.caseData.name}`.replace(/^：/, "");
}

function getEntryCourseId(entry: ContentPackageRegistryEntry) {
  return entry.courseId || entry.subjectId;
}

function getCourseConfig(courseId: string) {
  return SUPPORTED_COURSES.find((course) => course.courseId === courseId) ?? SUPPORTED_COURSES[0];
}

function getCourseRouteEntries(courseId: string) {
  return getBundledContentRegistry()
    .packages.filter((entry) => getEntryCourseId(entry) === courseId)
    .slice()
    .sort((a, b) => (a.locationOrder ?? 0) - (b.locationOrder ?? 0));
}

function getInitialContentPackageId() {
  return new URLSearchParams(window.location.search).get("contentPackageId") ?? getBundledContentRegistry().defaultContentPackageId;
}

function findQuestion(model: RuntimeModel, questionId?: string) {
  if (!questionId) return undefined;
  return [...model.questions, ...model.reserveQuestions].find((question) => question.questionId === questionId);
}

function toStorageModel(model: RuntimeModel) {
  return {
    manifest: model.runtime.getManifest(),
    caseId: model.caseData.caseId,
    levels: model.levels,
    badges: model.badges,
    questions: model.questions,
    reserveQuestions: model.reserveQuestions,
  };
}

function nextPlayableLevelId(levels: LevelConfig[], progress: LearningProgress) {
  return levels.find((level) => !progress.passedLevelIds.includes(level.levelId))?.levelId ?? levels[levels.length - 1].levelId;
}

function badgeIcon(iconId: string) {
  const icons: Record<string, string> = {
    "badge-detective-rookie": "🕵️",
    "badge-clue-collector": "🔎",
    "badge-reviewer": "📁",
    "badge-persistent": "⭐",
    "badge-detective-gold": "🏅",
  };
  return icons[iconId] ?? "🏅";
}

function formatTime(value: string) {
  if (!value) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
