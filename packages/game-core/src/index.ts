import type {
  Badge,
  BossTask,
  ClueId,
  KnowledgeCardId,
  LevelConfig,
  LevelId,
  Question,
  QuestionId,
  ReviewAction,
  ReviewRule,
} from "@quest-academy/content-schema";

export interface AnswerResult {
  questionId: QuestionId;
  question: Question;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
  knowledgePointId: string;
  skillId: string;
  misconceptionId: string;
  levelId: string;
  stepId?: string;
}

export interface LevelResult {
  levelId: LevelId;
  total: number;
  correctCount: number;
  wrongCount: number;
  isPassed: boolean;
  unlockedClueIds: ClueId[];
  unlockedKnowledgeCardIds: KnowledgeCardId[];
}

export interface BossResult {
  bossTaskId: string;
  total: number;
  correctCount: number;
  wrongCount: number;
  isPassed: boolean;
  failedStepIds: string[];
  fallbackKnowledgeCardIds: KnowledgeCardId[];
}

export interface LearningProgress {
  passedLevelIds: LevelId[];
  unlockedClueIds: ClueId[];
  unlockedKnowledgeCardIds: KnowledgeCardId[];
  bossUnlocked: boolean;
  caseClosed: boolean;
}

export interface WrongRecord {
  questionId: QuestionId;
  levelId: string;
  stem: string;
  userAnswer: string;
  correctAnswer: string;
  knowledgePointId: string;
  skillId: string;
  misconceptionId: string;
  explanation: string;
  wrongCount: number;
  status: "open" | "reviewing" | "solved" | "archived";
  firstWrongAt: string;
  lastWrongAt: string;
}

export type WrongRecordMap = Record<QuestionId, WrongRecord>;

export interface BadgeRecord {
  badgeId: string;
  earnedAt: string;
  reason: string;
}

export type BadgeRecordMap = Record<string, BadgeRecord>;

export type MasteryDimension = "knowledgePoint" | "skill";
export type MasteryState = "not_started" | "learning" | "unstable" | "mastered" | "needs_review";

export interface MasteryRecord {
  dimension: MasteryDimension;
  id: string;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  score: number;
  state: MasteryState;
  lastPracticedAt: string;
}

export type MasteryRecordMap = Record<string, MasteryRecord>;

export interface SelectLevelQuestionsOptions {
  maxQuestions?: number;
  wrongRecords?: WrongRecordMap;
  supplementalQuestions?: Question[];
}

export type GameEvent =
  | { type: "first_level_passed"; caseId: string; passedLevelIds: LevelId[] }
  | { type: "all_clues_collected"; caseId: string; unlockedClueIds: ClueId[] }
  | { type: "first_wrong_review"; caseId: string }
  | { type: "wrong_question_solved"; caseId: string; questionId: QuestionId }
  | { type: "case_closed"; caseId: string };

export interface ReviewPlan {
  reviewRuleId: string;
  knowledgePointId: string;
  skillId: string;
  misconceptionId: string;
  actions: ReviewAction[];
  knowledgeCardIds: KnowledgeCardId[];
}

export function checkAnswer(question: Question, userAnswer: string, answeredAt = new Date().toISOString()): AnswerResult {
  return {
    questionId: question.questionId,
    question,
    userAnswer,
    correctAnswer: question.answer,
    isCorrect: normalizeAnswer(userAnswer) === normalizeAnswer(question.answer),
    answeredAt,
    knowledgePointId: question.knowledgePointId,
    skillId: question.skillId,
    misconceptionId: question.misconceptionId,
    levelId: question.levelId,
    stepId: question.stepId,
  };
}

export function finishLevel(level: LevelConfig, answerResults: AnswerResult[]): LevelResult {
  const total = level.passRule.total ?? answerResults.length;
  const correctCount = answerResults.filter((result) => result.isCorrect).length;
  const wrongCount = Math.max(0, total - correctCount);
  const isPassed =
    level.passRule.type === "min_correct"
      ? correctCount >= (level.passRule.minCorrect ?? total)
      : level.passRule.type === "all_required"
        ? correctCount === total
        : correctCount >= total;

  return {
    levelId: level.levelId,
    total,
    correctCount,
    wrongCount,
    isPassed,
    unlockedClueIds: isPassed ? [level.reward.clueId] : [],
    unlockedKnowledgeCardIds: isPassed ? level.reward.knowledgeCardIds : [],
  };
}

export function selectLevelQuestions(level: LevelConfig, questions: Question[], options: SelectLevelQuestionsOptions = {}): Question[] {
  const maxQuestions = options.maxQuestions ?? level.passRule.total ?? questions.length;
  const wrongRecords = options.wrongRecords ?? {};
  const rankedQuestions = rankQuestions(questions, options.wrongRecords);
  const rankedSupplementalQuestions = rankQuestions(getLevelSupplementalQuestions(level, options.supplementalQuestions ?? []), wrongRecords);
  const selected: Question[] = [];
  const selectedIds = new Set<QuestionId>();

  for (const skillId of level.skillIds) {
    const supplementalQuestion = rankedSupplementalQuestions.find(
      (item) => item.skillId === skillId && questionPriority(item, wrongRecords) > 0 && !selectedIds.has(item.questionId),
    );
    const question = supplementalQuestion ?? rankedQuestions.find((item) => item.skillId === skillId && !selectedIds.has(item.questionId));
    if (question) addSelectedQuestion(question, selected, selectedIds);
  }

  for (const question of rankQuestions([...questions, ...rankedSupplementalQuestions.filter((item) => questionPriority(item, wrongRecords) > 0)], wrongRecords)) {
    if (selected.length >= maxQuestions) break;
    addSelectedQuestion(question, selected, selectedIds);
  }

  return selected.slice(0, maxQuestions);
}

export function canStartBoss(progress: Pick<LearningProgress, "passedLevelIds">, levels: LevelConfig[]): boolean {
  return levels.every((level) => progress.passedLevelIds.includes(level.levelId));
}

export function finishBoss(bossTask: BossTask, answerResults: AnswerResult[]): BossResult {
  const resultByStepId = new Map(answerResults.filter((result) => result.stepId).map((result) => [result.stepId as string, result]));
  const requiredStepIds = bossTask.passRule.requiredCorrectStepIds ?? bossTask.steps.map((step) => step.stepId);
  const failedStepIds = requiredStepIds.filter((stepId) => !resultByStepId.get(stepId)?.isCorrect);
  const correctCount = answerResults.filter((result) => result.isCorrect).length;

  return {
    bossTaskId: bossTask.bossTaskId,
    total: requiredStepIds.length,
    correctCount,
    wrongCount: Math.max(0, requiredStepIds.length - correctCount),
    isPassed: failedStepIds.length === 0,
    failedStepIds,
    fallbackKnowledgeCardIds: failedStepIds.length > 0 ? bossTask.failureReviewRoute.fallbackKnowledgeCardIds : [],
  };
}

export function addWrongRecord(records: WrongRecordMap, answerResult: AnswerResult): WrongRecordMap {
  if (answerResult.isCorrect) return records;

  const existing = records[answerResult.questionId];
  const wrongRecord: WrongRecord = {
    questionId: answerResult.questionId,
    levelId: answerResult.levelId,
    stem: answerResult.question.stem,
    userAnswer: answerResult.userAnswer,
    correctAnswer: answerResult.correctAnswer,
    knowledgePointId: answerResult.knowledgePointId,
    skillId: answerResult.skillId,
    misconceptionId: answerResult.misconceptionId,
    explanation: answerResult.question.explanation,
    wrongCount: (existing?.wrongCount ?? 0) + 1,
    status: "open",
    firstWrongAt: existing?.firstWrongAt ?? answerResult.answeredAt,
    lastWrongAt: answerResult.answeredAt,
  };

  return {
    ...records,
    [answerResult.questionId]: wrongRecord,
  };
}

export function markWrongRecordSolved(records: WrongRecordMap, questionId: QuestionId): WrongRecordMap {
  const existing = records[questionId];
  if (!existing) return records;
  return {
    ...records,
    [questionId]: {
      ...existing,
      status: "solved",
    },
  };
}

export function awardBadges(badges: Badge[], existingRecords: BadgeRecordMap, event: GameEvent, earnedAt = new Date().toISOString()): BadgeRecordMap {
  const nextRecords = { ...existingRecords };
  for (const badge of badges) {
    if (nextRecords[badge.badgeId] && !badge.isRepeatable) continue;
    if (!badgeEventMatches(badge, event)) continue;
    nextRecords[badge.badgeId] = {
      badgeId: badge.badgeId,
      earnedAt,
      reason: badge.description,
    };
  }
  return nextRecords;
}

export function buildReviewRoute(wrongRecord: WrongRecord, reviewRules: ReviewRule[]): ReviewPlan | null {
  const rule = reviewRules.find(
    (item) =>
      item.misconceptionId === wrongRecord.misconceptionId ||
      (item.skillId === wrongRecord.skillId && item.knowledgePointId === wrongRecord.knowledgePointId),
  );
  if (!rule) return null;

  return {
    reviewRuleId: rule.reviewRuleId,
    knowledgePointId: rule.knowledgePointId,
    skillId: rule.skillId,
    misconceptionId: rule.misconceptionId,
    actions: rule.actions,
    knowledgeCardIds: rule.actions.flatMap((action) => (action.knowledgeCardId ? [action.knowledgeCardId] : [])),
  };
}

export function applyLevelResult(progress: LearningProgress, levelResult: LevelResult, levels: LevelConfig[]): LearningProgress {
  if (!levelResult.isPassed) return progress;
  const passedLevelIds = unique([...progress.passedLevelIds, levelResult.levelId]);
  const unlockedClueIds = unique([...progress.unlockedClueIds, ...levelResult.unlockedClueIds]);
  const unlockedKnowledgeCardIds = unique([...progress.unlockedKnowledgeCardIds, ...levelResult.unlockedKnowledgeCardIds]);
  return {
    ...progress,
    passedLevelIds,
    unlockedClueIds,
    unlockedKnowledgeCardIds,
    bossUnlocked: canStartBoss({ passedLevelIds }, levels),
  };
}

export function applyBossResult(progress: LearningProgress, bossResult: BossResult): LearningProgress {
  return {
    ...progress,
    caseClosed: progress.caseClosed || bossResult.isPassed,
  };
}

export function updateMasteryRecords(existingRecords: MasteryRecordMap, answerResults: AnswerResult[], practicedAt = new Date().toISOString()): MasteryRecordMap {
  const nextRecords = { ...existingRecords };
  const groupedResults = [
    ...groupAnswerResults(answerResults, "knowledgePoint", (result) => result.knowledgePointId),
    ...groupAnswerResults(answerResults, "skill", (result) => result.skillId),
  ];

  for (const group of groupedResults) {
    const key = masteryRecordKey(group.dimension, group.id);
    const existing = nextRecords[key];
    const correctCount = (existing?.correctCount ?? 0) + group.correctCount;
    const totalCount = (existing?.totalCount ?? 0) + group.totalCount;
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const score = Math.round(accuracy * 100);
    nextRecords[key] = {
      dimension: group.dimension,
      id: group.id,
      correctCount,
      totalCount,
      accuracy,
      score,
      state: toMasteryState(score, totalCount),
      lastPracticedAt: practicedAt,
    };
  }

  return nextRecords;
}

export function getMasteryRecord(records: MasteryRecordMap, dimension: MasteryDimension, id: string): MasteryRecord | undefined {
  return records[masteryRecordKey(dimension, id)];
}

export function normalizeAnswer(value: string): string {
  return String(value).trim().replace(/\s+/g, "").replace(/。/g, "").toLowerCase();
}

function badgeEventMatches(badge: Badge, event: GameEvent): boolean {
  if (badge.triggerRule.caseId !== event.caseId) return false;
  if (badge.triggerRule.type !== event.type) return false;

  if (event.type === "all_clues_collected") {
    return (badge.triggerRule.requiredClueIds ?? []).every((clueId) => event.unlockedClueIds.includes(clueId));
  }

  if (event.type === "first_level_passed") {
    return event.passedLevelIds.length >= 1;
  }

  return true;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function rankQuestions(questions: Question[], wrongRecords: WrongRecordMap = {}): Question[] {
  return questions
    .slice()
    .sort((left, right) => questionPriority(right, wrongRecords) - questionPriority(left, wrongRecords) || left.questionId.localeCompare(right.questionId));
}

function questionPriority(question: Question, wrongRecords: WrongRecordMap): number {
  const wrongs = Object.values(wrongRecords).filter((record) => record.status === "open");
  let score = 0;
  if (wrongs.some((record) => record.questionId === question.questionId)) score += 4;
  if (wrongs.some((record) => record.misconceptionId === question.misconceptionId)) score += 3;
  if (wrongs.some((record) => record.skillId === question.skillId)) score += 2;
  if (question.difficultyBand === "application" || question.difficultyBand === "integrated") score += 1;
  return score;
}

function getLevelSupplementalQuestions(level: LevelConfig, questions: Question[]): Question[] {
  const skillIds = new Set(level.skillIds);
  return questions.filter(
    (question) =>
      question.caseId === level.caseId &&
      question.levelId === "reserve" &&
      (question.knowledgePointId === level.knowledgePointId || skillIds.has(question.skillId)),
  );
}

function addSelectedQuestion(question: Question, selected: Question[], selectedIds: Set<QuestionId>): void {
  if (selectedIds.has(question.questionId)) return;
  selected.push(question);
  selectedIds.add(question.questionId);
}

function groupAnswerResults(answerResults: AnswerResult[], dimension: MasteryDimension, getId: (result: AnswerResult) => string) {
  const groups = new Map<string, { correctCount: number; totalCount: number }>();
  for (const result of answerResults) {
    const id = getId(result);
    if (!id) continue;
    const group = groups.get(id) ?? { correctCount: 0, totalCount: 0 };
    groups.set(id, {
      correctCount: group.correctCount + (result.isCorrect ? 1 : 0),
      totalCount: group.totalCount + 1,
    });
  }

  return [...groups.entries()].map(([id, group]) => ({
    dimension,
    id,
    correctCount: group.correctCount,
    totalCount: group.totalCount,
  }));
}

function masteryRecordKey(dimension: MasteryDimension, id: string): string {
  return `${dimension}:${id}`;
}

function toMasteryState(score: number, totalCount: number): MasteryState {
  if (totalCount === 0) return "not_started";
  if (totalCount < 3) {
    if (score >= 70) return "learning";
    if (score >= 50) return "unstable";
    return "needs_review";
  }
  if (score >= 90) return "mastered";
  if (score >= 70) return "learning";
  if (score >= 50) return "unstable";
  return "needs_review";
}
