import type {
  Badge,
  BadgesFile,
  BossQuestionGroupFile,
  BossTask,
  CaseConfig,
  Clue,
  CluesFile,
  ContentPackage,
  ContentPackageManifest,
  KnowledgeCard,
  KnowledgeCardsFile,
  KnowledgeMapFile,
  KnowledgePoint,
  LevelConfig,
  Question,
  QuestionGroupFile,
  ReviewRule,
  ReviewRulesFile,
  Skill,
  TextbookFile,
} from "@quest-academy/content-schema";

export type JsonLoader = (path: string) => Promise<unknown>;

export interface LoadContentPackageOptions {
  loadJson?: JsonLoader;
}

export class ContentPackageLoadError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`Failed to load content package file "${path}": ${message}`);
    this.name = "ContentPackageLoadError";
    this.path = path;
  }
}

export class ContentLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentLookupError";
  }
}

export async function loadContentPackage(basePath: string, options: LoadContentPackageOptions = {}): Promise<ContentPackage> {
  const loadJson = options.loadJson ?? fetchJson;
  const base = trimTrailingSlash(basePath);
  const manifest = await loadTypedJson<ContentPackageManifest>(loadJson, joinPath(base, "manifest.json"));

  const [textbook, knowledgeMap, ...rest] = await Promise.all([
    loadTypedJson<TextbookFile>(loadJson, joinPath(base, manifest.files.textbook)),
    loadTypedJson<KnowledgeMapFile>(loadJson, joinPath(base, manifest.files.knowledgeMap)),
    ...manifest.files.cases.map((file) => loadTypedJson<CaseConfig>(loadJson, joinPath(base, file))),
    ...manifest.files.questions.map((file) =>
      loadTypedJson<QuestionGroupFile | BossQuestionGroupFile>(loadJson, joinPath(base, file)),
    ),
    loadTypedJson<KnowledgeCardsFile>(loadJson, joinPath(base, manifest.files.knowledgeCards)),
    loadTypedJson<CluesFile>(loadJson, joinPath(base, manifest.files.clues)),
    loadTypedJson<BadgesFile>(loadJson, joinPath(base, manifest.files.badges)),
    loadTypedJson<ReviewRulesFile>(loadJson, joinPath(base, manifest.files.reviewRules)),
  ]);

  const caseCount = manifest.files.cases.length;
  const questionCount = manifest.files.questions.length;
  const cases = rest.slice(0, caseCount) as CaseConfig[];
  const questionGroups = rest.slice(caseCount, caseCount + questionCount) as Array<QuestionGroupFile | BossQuestionGroupFile>;
  const knowledgeCards = rest[caseCount + questionCount] as KnowledgeCardsFile;
  const clues = rest[caseCount + questionCount + 1] as CluesFile;
  const badges = rest[caseCount + questionCount + 2] as BadgesFile;
  const reviewRules = rest[caseCount + questionCount + 3] as ReviewRulesFile;

  return {
    manifest,
    textbook,
    knowledgeMap,
    cases,
    questionGroups,
    knowledgeCards,
    clues,
    badges,
    reviewRules,
  };
}

export interface ContentRuntime {
  getManifest(): ContentPackageManifest;
  getCase(caseId?: string): CaseConfig;
  getLevels(caseId?: string): LevelConfig[];
  getLevel(levelId: string): LevelConfig;
  getQuestionsByLevel(levelId: string): Question[];
  getReserveQuestions(): Question[];
  getBossTask(bossTaskId?: string): BossTask;
  getKnowledgeCards(): KnowledgeCard[];
  getKnowledgeCard(knowledgeCardId: string): KnowledgeCard;
  getClues(): Clue[];
  getClue(clueId: string): Clue;
  getBadges(): Badge[];
  getBadge(badgeId: string): Badge;
  getReviewRules(): ReviewRule[];
  getReviewRule(reviewRuleId: string): ReviewRule;
  getKnowledgePoint(knowledgePointId: string): KnowledgePoint;
  getSkill(skillId: string): Skill;
}

export function createContentRuntime(contentPackage: ContentPackage): ContentRuntime {
  const caseById = new Map(contentPackage.cases.map((item) => [item.caseId, item]));
  const levelById = new Map(contentPackage.cases.flatMap((item) => item.levels).map((item) => [item.levelId, item]));
  const questionGroups = contentPackage.questionGroups;
  const questions = questionGroups.flatMap((group) => group.questions);
  const questionsByLevel = groupBy(questions, (question) => question.levelId);
  const bossTasks = questionGroups.flatMap((group) => ("bossTask" in group ? [group.bossTask] : []));
  const bossTaskById = new Map(bossTasks.map((item) => [item.bossTaskId, item]));
  const knowledgeCardById = new Map(contentPackage.knowledgeCards.knowledgeCards.map((item) => [item.knowledgeCardId, item]));
  const clueById = new Map(contentPackage.clues.clues.map((item) => [item.clueId, item]));
  const badgeById = new Map(contentPackage.badges.badges.map((item) => [item.badgeId, item]));
  const reviewRuleById = new Map(contentPackage.reviewRules.reviewRules.map((item) => [item.reviewRuleId, item]));
  const knowledgePointById = new Map(contentPackage.knowledgeMap.knowledgePoints.map((item) => [item.knowledgePointId, item]));
  const skillById = new Map(contentPackage.knowledgeMap.skills.map((item) => [item.skillId, item]));

  return {
    getManifest: () => contentPackage.manifest,
    getCase: (caseId = contentPackage.manifest.defaultCaseId) => getRequired(caseById, caseId, "case"),
    getLevels: (caseId = contentPackage.manifest.defaultCaseId) => getRequired(caseById, caseId, "case").levels,
    getLevel: (levelId) => getRequired(levelById, levelId, "level"),
    getQuestionsByLevel: (levelId) => questionsByLevel.get(levelId) ?? [],
    getReserveQuestions: () => questionsByLevel.get("reserve") ?? [],
    getBossTask: (bossTaskId) => {
      const id = bossTaskId ?? getRequired(caseById, contentPackage.manifest.defaultCaseId, "case").bossTaskId;
      return getRequired(bossTaskById, id, "bossTask");
    },
    getKnowledgeCards: () => contentPackage.knowledgeCards.knowledgeCards,
    getKnowledgeCard: (knowledgeCardId) => getRequired(knowledgeCardById, knowledgeCardId, "knowledgeCard"),
    getClues: () => contentPackage.clues.clues,
    getClue: (clueId) => getRequired(clueById, clueId, "clue"),
    getBadges: () => contentPackage.badges.badges,
    getBadge: (badgeId) => getRequired(badgeById, badgeId, "badge"),
    getReviewRules: () => contentPackage.reviewRules.reviewRules,
    getReviewRule: (reviewRuleId) => getRequired(reviewRuleById, reviewRuleId, "reviewRule"),
    getKnowledgePoint: (knowledgePointId) => getRequired(knowledgePointById, knowledgePointId, "knowledgePoint"),
    getSkill: (skillId) => getRequired(skillById, skillId, "skill"),
  };
}

async function fetchJson(path: string): Promise<unknown> {
  if (typeof fetch !== "function") {
    throw new ContentPackageLoadError(path, "fetch is not available; pass a custom loadJson function");
  }

  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new ContentPackageLoadError(path, `${response.status} ${response.statusText}`.trim());
  }
  return response.json();
}

async function loadTypedJson<T>(loadJson: JsonLoader, path: string): Promise<T> {
  try {
    return (await loadJson(path)) as T;
  } catch (error) {
    if (error instanceof ContentPackageLoadError) throw error;
    throw new ContentPackageLoadError(path, error instanceof Error ? error.message : String(error));
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function joinPath(base: string, file: string): string {
  if (!base) return file.replace(/^\/+/, "");
  return `${base}/${file.replace(/^\/+/, "")}`;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function getRequired<T>(map: Map<string, T>, id: string, type: string): T {
  const value = map.get(id);
  if (!value) throw new ContentLookupError(`Unknown ${type}: ${id}`);
  return value;
}
