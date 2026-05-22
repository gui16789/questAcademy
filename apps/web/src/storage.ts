import type { Badge, ContentPackageManifest, LevelConfig, Question } from "@quest-academy/content-schema";
import type { AnswerResult, BadgeRecordMap, LearningProgress, WrongRecord, WrongRecordMap } from "@quest-academy/game-core";

export const STORAGE_KEY = "animalDetectiveCityMvp";
export const DATA_VERSION = "1.0.0";

export interface UserState {
  id: string;
  nickname: string;
  avatar: string;
  started: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface LoadedStoredState {
  user: UserState;
  progress: LearningProgress;
  wrongRecords: WrongRecordMap;
  badgeRecords: BadgeRecordMap;
  answerRecords: unknown[];
  migratedFromDataVersion: string;
}

export interface StorageModel {
  manifest: ContentPackageManifest;
  caseId: string;
  levels: LevelConfig[];
  badges: Badge[];
  questions: Question[];
  reserveQuestions: Question[];
}

export function createDefaultUser(now = new Date().toISOString()): UserState {
  return {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    nickname: "小侦探",
    avatar: "🦊",
    started: false,
    createdAt: now,
    lastLoginAt: now,
  };
}

export function createDefaultProgress(): LearningProgress {
  return {
    passedLevelIds: [],
    unlockedClueIds: [],
    unlockedKnowledgeCardIds: [],
    bossUnlocked: false,
    caseClosed: false,
  };
}

export function loadStoredState(model: StorageModel): LoadedStoredState {
  const fallback = createDefaultStoredState();
  const raw = safeStorage.getItem(STORAGE_KEY);
  if (!raw) return fallback;

  try {
    const saved = JSON.parse(raw) as Record<string, unknown>;
    return migrateStoredState(saved, model, fallback);
  } catch {
    return fallback;
  }
}

export function saveStoredState(model: StorageModel, state: LoadedStoredState): void {
  const now = new Date().toISOString();
  safeStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      dataVersion: DATA_VERSION,
      contentPackageId: model.manifest.contentPackageId,
      contentVersion: model.manifest.contentVersion,
      migratedFromDataVersion: state.migratedFromDataVersion,
      user: {
        ...state.user,
        dataVersion: DATA_VERSION,
        lastLoginAt: now,
      },
      progress: {
        ...state.progress,
        contentPackageId: model.manifest.contentPackageId,
        contentVersion: model.manifest.contentVersion,
        caseId: model.caseId,
        lastStudyAt: now,
      },
      answerRecords: state.answerRecords,
      wrongRecords: state.wrongRecords,
      wrongQuestions: state.wrongRecords,
      badgeRecords: state.badgeRecords,
      badges: state.badgeRecords,
    }),
  );
}

export function clearStoredState(): void {
  safeStorage.removeItem(STORAGE_KEY);
}

function createDefaultStoredState(): LoadedStoredState {
  return {
    user: createDefaultUser(),
    progress: createDefaultProgress(),
    wrongRecords: {},
    badgeRecords: {},
    answerRecords: [],
    migratedFromDataVersion: "",
  };
}

function migrateStoredState(saved: Record<string, unknown>, model: StorageModel, fallback: LoadedStoredState): LoadedStoredState {
  const sourceDataVersion = stringValue(saved.dataVersion) || "0.1.0";
  const savedUser = objectValue(saved.user) ?? {};
  const savedProgress = objectValue(saved.progress);

  return {
    user: {
      ...fallback.user,
      id: stringValue(savedUser.id) || fallback.user.id,
      nickname: stringValue(savedUser.nickname) || fallback.user.nickname,
      avatar: stringValue(savedUser.avatar) || fallback.user.avatar,
      started: booleanValue(savedUser.started, fallback.user.started),
      createdAt: stringValue(savedUser.createdAt) || fallback.user.createdAt,
      lastLoginAt: stringValue(savedUser.lastLoginAt) || fallback.user.lastLoginAt,
    },
    progress: migrateProgress(savedProgress, model),
    wrongRecords: migrateWrongRecords(objectValue(saved.wrongRecords) ?? objectValue(saved.wrongQuestions), model),
    badgeRecords: migrateBadgeRecords(objectValue(saved.badgeRecords) ?? objectValue(saved.badges), model),
    answerRecords: arrayValue(saved.answerRecords),
    migratedFromDataVersion: sourceDataVersion === DATA_VERSION ? stringValue(saved.migratedFromDataVersion) : sourceDataVersion,
  };
}

function migrateProgress(savedProgress: Record<string, unknown> | undefined, model: StorageModel): LearningProgress {
  const fallback = createDefaultProgress();
  if (!savedProgress) return fallback;

  const passedLevelIds = unique(arrayValue(savedProgress.passedLevelIds ?? savedProgress.passedLevels).map((id) => toContentLevelId(String(id), model)).filter(Boolean));
  const unlockedClueIds = unique(
    arrayValue(savedProgress.unlockedClueIds ?? savedProgress.clues)
      .map((id) => toClueId(String(id), model))
      .filter(Boolean),
  );
  const unlockedKnowledgeCardIds = unique(
    arrayValue(savedProgress.unlockedKnowledgeCardIds)
      .map((id) => String(id))
      .filter(Boolean),
  );
  const rewardKnowledgeCardIds = model.levels.filter((level) => passedLevelIds.includes(level.levelId)).flatMap((level) => level.reward.knowledgeCardIds);
  const allLevelsPassed = model.levels.every((level) => passedLevelIds.includes(level.levelId));

  return {
    passedLevelIds,
    unlockedClueIds,
    unlockedKnowledgeCardIds: unique([...unlockedKnowledgeCardIds, ...rewardKnowledgeCardIds]),
    bossUnlocked: booleanValue(savedProgress.bossUnlocked, allLevelsPassed) || allLevelsPassed,
    caseClosed: booleanValue(savedProgress.caseClosed, fallback.caseClosed),
  };
}

function migrateWrongRecords(records: Record<string, unknown> | undefined, model: StorageModel): WrongRecordMap {
  if (!records) return {};
  return Object.fromEntries(
    Object.entries(records)
      .map(([questionId, value]) => {
        const record = objectValue(value);
        if (!record) return null;
        const question = findQuestion(questionId, model);
        const migrated: WrongRecord = {
          questionId,
          levelId: question?.levelId ?? toContentLevelId(stringValue(record.levelId), model) ?? stringValue(record.levelId),
          stem: stringValue(record.stem) || question?.stem || "",
          userAnswer: stringValue(record.userAnswer),
          correctAnswer: stringValue(record.correctAnswer ?? record.answer) || question?.answer || "",
          knowledgePointId: stringValue(record.knowledgePointId) || question?.knowledgePointId || "",
          skillId: stringValue(record.skillId) || question?.skillId || "",
          misconceptionId: stringValue(record.misconceptionId) || question?.misconceptionId || "",
          explanation: stringValue(record.explanation) || question?.explanation || "",
          wrongCount: numberValue(record.wrongCount ?? record.errorCount, 1),
          status: toWrongStatus(stringValue(record.status)),
          firstWrongAt: stringValue(record.firstWrongAt) || stringValue(record.lastWrongAt) || new Date().toISOString(),
          lastWrongAt: stringValue(record.lastWrongAt) || stringValue(record.firstWrongAt) || new Date().toISOString(),
        };
        return [questionId, migrated] as const;
      })
      .filter((entry): entry is readonly [string, WrongRecord] => Boolean(entry)),
  );
}

function migrateBadgeRecords(records: Record<string, unknown> | undefined, model: StorageModel): BadgeRecordMap {
  if (!records) return {};
  return Object.fromEntries(
    Object.entries(records)
      .map(([recordId, value]) => {
        const record = objectValue(value);
        if (!record) return null;
        const badge = findBadge(recordId, record, model);
        if (!badge) return null;
        return [
          badge.badgeId,
          {
            badgeId: badge.badgeId,
            earnedAt: stringValue(record.earnedAt) || new Date().toISOString(),
            reason: stringValue(record.reason) || badge.description,
          },
        ] as const;
      })
      .filter((entry): entry is readonly [string, BadgeRecordMap[string]] => Boolean(entry)),
  );
}

function findQuestion(questionId: string, model: StorageModel): Question | undefined {
  return [...model.questions, ...model.reserveQuestions].find((question) => question.questionId === questionId);
}

function findBadge(recordId: string, record: Record<string, unknown>, model: StorageModel): Badge | undefined {
  const contentBadgeId = stringValue(record.contentBadgeId ?? record.badgeId);
  return model.badges.find((badge) => badge.badgeId === contentBadgeId || badge.legacyRuntimeId === recordId || badge.badgeId === recordId);
}

function toContentLevelId(levelId: string, model: StorageModel): string {
  if (!levelId) return "";
  const level = model.levels.find((item) => item.levelId === levelId || item.legacyRuntimeId === levelId);
  return level?.levelId ?? (levelId === "boss" ? "boss" : "");
}

function toClueId(value: string, model: StorageModel): string {
  if (!value) return "";
  const byClueId = model.levels.find((level) => level.reward.clueId === value);
  if (byClueId) return byClueId.reward.clueId;
  const byLevelId = model.levels.find((level) => level.levelId === value || level.legacyRuntimeId === value);
  return byLevelId?.reward.clueId ?? "";
}

function toWrongStatus(value: string): WrongRecord["status"] {
  return value === "reviewing" || value === "solved" || value === "archived" ? value : "open";
}

function createSafeStorage() {
  const memoryStore = new Map<string, string>();
  let persistentStorage: Storage | null = null;
  try {
    const testKey = `${STORAGE_KEY}:test`;
    globalThis.localStorage.setItem(testKey, "1");
    globalThis.localStorage.removeItem(testKey);
    persistentStorage = globalThis.localStorage;
  } catch {
    persistentStorage = null;
  }

  return {
    getItem(key: string) {
      try {
        return persistentStorage?.getItem(key) ?? memoryStore.get(key) ?? null;
      } catch {
        return memoryStore.get(key) ?? null;
      }
    },
    setItem(key: string, value: string) {
      memoryStore.set(key, value);
      try {
        persistentStorage?.setItem(key, value);
      } catch {
        persistentStorage = null;
      }
    },
    removeItem(key: string) {
      memoryStore.delete(key);
      try {
        persistentStorage?.removeItem(key);
      } catch {
        persistentStorage = null;
      }
    },
  };
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

const safeStorage = createSafeStorage();
