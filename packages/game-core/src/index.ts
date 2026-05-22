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
