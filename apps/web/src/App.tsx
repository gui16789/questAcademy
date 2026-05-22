import { useEffect, useMemo, useState } from "react";
import type { Badge, BossTask, CaseConfig, KnowledgeCard, LevelConfig, Question } from "@quest-academy/content-schema";
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
import { loadBundledContentRuntime } from "./contentPackage";

type View = "start" | "map" | "case" | "level" | "boss" | "clue" | "closing" | "wrongs" | "knowledge" | "badges" | "review" | "levelResult" | "bossResult";
type PlayerMode = "level" | "boss" | "review";

interface RuntimeModel {
  runtime: ContentRuntime;
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

const defaultProgress: LearningProgress = {
  passedLevelIds: [],
  unlockedClueIds: [],
  unlockedKnowledgeCardIds: [],
  bossUnlocked: false,
  caseClosed: false,
};

export function App() {
  const [model, setModel] = useState<RuntimeModel | null>(null);
  const [loadError, setLoadError] = useState<string>("");
  const [view, setView] = useState<View>("start");
  const [nickname, setNickname] = useState("");
  const [startedNickname, setStartedNickname] = useState("小侦探");
  const [progress, setProgress] = useState<LearningProgress>(defaultProgress);
  const [wrongRecords, setWrongRecords] = useState<WrongRecordMap>({});
  const [badgeRecords, setBadgeRecords] = useState<BadgeRecordMap>({});
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [toast, setToast] = useState("");
  const [levelResult, setLevelResult] = useState<LevelResultView | null>(null);
  const [bossResult, setBossResult] = useState<BossResultView | null>(null);
  const [lastClueLevelId, setLastClueLevelId] = useState<string>("");

  useEffect(() => {
    let active = true;
    loadBundledContentRuntime()
      .then((runtime) => {
        if (!active) return;
        setModel(buildRuntimeModel(runtime));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
    setStartedNickname(nickname.trim() || "小侦探");
    setView("map");
  };

  const resetProgress = () => {
    setProgress(defaultProgress);
    setWrongRecords({});
    setBadgeRecords({});
    setPlayer(null);
    setLevelResult(null);
    setBossResult(null);
    setLastClueLevelId("");
    setNickname("");
    setStartedNickname("小侦探");
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
      showToast("还差线索。集齐 4 条线索后再来挑战 Boss。");
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
        return <StartScreen nickname={nickname} onNicknameChange={setNickname} onStart={startGame} />;
      case "map":
        return <MapScreen model={model} nickname={startedNickname} progress={progress} wrongRecords={wrongRecords} badgeRecords={badgeRecords} onCase={() => openView("case")} onReset={resetProgress} onBoss={startBoss} onNavigate={openView} />;
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
        return <ClosingScreen progress={progress} wrongRecords={wrongRecords} onMap={() => openView("map")} onKnowledge={() => openView("knowledge")} onWrongs={() => openView("wrongs")} />;
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
    <AppShell view={view} started={view !== "start"} onNavigate={openView}>
      {screen}
      {toast ? <div className="toast">{toast}</div> : null}
    </AppShell>
  );
}

function AppShell({ children, view, started, onNavigate }: { children: React.ReactNode; view: View; started: boolean; onNavigate: (view: View) => void }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => onNavigate(started ? "map" : "start")}>
          <span className="brand-mark">探</span>
          <span>
            <strong>动物侦探城</strong>
            <small>除法 · 徽章失踪案</small>
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

function StartScreen({ nickname, onNicknameChange, onStart }: { nickname: string; onNicknameChange: (value: string) => void; onStart: () => void }) {
  return (
    <section className="screen hero">
      <div className="hero-copy">
        <p className="tag">北师大版二年级下册 · 第一单元 除法</p>
        <h1>
          动物侦探城：
          <br />
          徽章失踪案
        </h1>
        <p>你将成为新手小侦探，跟着鹿队长调查胡萝卜徽章为什么对不上。完成除法闯关，收集线索，破解最后的 Boss 谜题。</p>
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
  nickname,
  progress,
  wrongRecords,
  badgeRecords,
  onCase,
  onReset,
  onBoss,
  onNavigate,
}: {
  model: RuntimeModel;
  nickname: string;
  progress: LearningProgress;
  wrongRecords: WrongRecordMap;
  badgeRecords: BadgeRecordMap;
  onCase: () => void;
  onReset: () => void;
  onBoss: () => void;
  onNavigate: (view: View) => void;
}) {
  const openWrongCount = Object.values(wrongRecords).filter((item) => item.status === "open").length;
  return (
    <section className="screen">
      <div className="section-head">
        <div>
          <h1>欢迎，{nickname}</h1>
          <p>今天的目标：收集 4 条线索，找出徽章数量异常的真相。</p>
        </div>
        <button className="btn danger" type="button" onClick={onReset}>
          清空记录
        </button>
      </div>
      <ProgressStrip levels={model.levels} progress={progress} />
      <div className="map-grid">
        <div className="city-map">
          <div className="map-road" />
          <button className="map-node case" type="button" onClick={onCase}>
            <span>🏫</span>
            <strong>{model.caseData.name}</strong>
          </button>
          <button className="map-node wrongs" type="button" onClick={() => onNavigate("wrongs")}>
            <span>📁</span>
            <strong>悬案馆</strong>
          </button>
          <button className="map-node knowledge" type="button" onClick={() => onNavigate("knowledge")}>
            <span>📚</span>
            <strong>线索库</strong>
          </button>
          <button className="map-node badges" type="button" onClick={() => onNavigate("badges")}>
            <span>🏅</span>
            <strong>勋章馆</strong>
          </button>
          <button className="map-node boss" type="button" disabled={!progress.bossUnlocked} onClick={onBoss}>
            <span>🧩</span>
            <strong>{progress.bossUnlocked ? "Boss 挑战" : "Boss 未解锁"}</strong>
          </button>
        </div>
        <aside className="side-panel">
          <h2>{progress.caseClosed ? "案件已结案" : "调查进度"}</h2>
          <div className="stat-grid">
            <Stat label="已收集线索" value={`${progress.unlockedClueIds.length}/4`} />
            <Stat label="通过关卡" value={`${progress.passedLevelIds.length}/4`} />
            <Stat label="未侦破错题" value={openWrongCount} />
            <Stat label="已获勋章" value={`${Object.keys(badgeRecords).length}/5`} />
          </div>
          <p className="lead">{progress.caseClosed ? "你已经找出了真相，可以去线索库复习，也可以回到悬案馆清理错题。" : "先进入案件详情，鹿队长会带你继续当前关卡。"}</p>
          <div className="action-row">
            <button className="btn primary" type="button" onClick={onCase}>
              查看案件
            </button>
            <button className="btn secondary" type="button" onClick={() => onNavigate("knowledge")}>
              复习线索
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
          <h2>胡萝卜徽章数量对不上了</h2>
          <p className="lead">{model.caseData.story.summary}</p>
          <p>收集 4 条关键线索后，Boss 挑战会解锁。完成 Boss 就能结案，并获得“破案小能手”勋章。</p>
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
  const subtitle = player.mode === "boss" ? "把 4 条线索连起来，找出真相。" : isReview ? "这次只要答对，悬案就会变成已侦破。" : level?.intro ?? "";
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

function ClosingScreen({ progress, wrongRecords, onMap, onKnowledge, onWrongs }: { progress: LearningProgress; wrongRecords: WrongRecordMap; onMap: () => void; onKnowledge: () => void; onWrongs: () => void }) {
  const openWrongCount = Object.values(wrongRecords).filter((item) => item.status === "open").length;
  return (
    <section className="screen result-panel">
      <p className="tag">案件成功破解</p>
      <h1>真相：徽章没有丢</h1>
      <p className="lead">35 枚徽章每队分 6 枚，只能分给 5 个完整小队，还剩 5 枚。剩下的徽章不够再分一个完整小队，所以狐狸配送员的说法不对。</p>
      <div className="stat-grid">
        <Stat label="掌握知识点" value="4" />
        <Stat label="收集线索" value={progress.unlockedClueIds.length} />
        <Stat label="未侦破错题" value={openWrongCount} />
        <Stat label="新增勋章" value="🏅" />
      </div>
      <p>动物侦探学院为你颁发“破案小能手”勋章。</p>
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

function buildRuntimeModel(runtime: ContentRuntime): RuntimeModel {
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

function findQuestion(model: RuntimeModel, questionId?: string) {
  if (!questionId) return undefined;
  return [...model.questions, ...model.reserveQuestions].find((question) => question.questionId === questionId);
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
