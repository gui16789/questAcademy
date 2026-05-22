export type Locale = "zh-CN";
export type SchemaVersion = string;
export type ContentVersion = string;
export type DataVersion = string;

export type ContentStatus =
  | "draft"
  | "content_review"
  | "teaching_review"
  | "readability_review"
  | "approved"
  | "published"
  | "archived";

export type DifficultyBand =
  | "intro"
  | "basic"
  | "practice"
  | "application"
  | "challenge"
  | "integrated";

export type QuestionType = "single" | "judge" | "fill" | "multi" | "sort" | "match" | "drag" | "step";

export type SubjectId = string;
export type TextbookVersionId = string;
export type GradeId = string;
export type SemesterId = string;
export type UnitId = string;
export type LessonId = string;
export type CurriculumNodeId = string;
export type KnowledgePointId = string;
export type SkillId = string;
export type MisconceptionId = string;
export type QuestionPatternId = string;
export type CaseId = string;
export type LevelId = string;
export type QuestionId = string;
export type BossTaskId = string;
export type KnowledgeCardId = string;
export type ClueId = string;
export type BadgeId = string;
export type ReviewRuleId = string;

export interface ReviewMeta {
  contentReviewer?: string;
  teachingReviewer?: string;
  readabilityReviewer?: string;
  approvedAt?: string;
  contentReviewStatus?: string;
  teachingReviewStatus?: string;
  readabilityReviewStatus?: string;
  approvedBy?: string;
}

export interface ContentPackageManifest {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  status: ContentStatus;
  subjectId: SubjectId;
  textbookVersionId: TextbookVersionId;
  gradeId: GradeId;
  semesterId: SemesterId;
  unitId: UnitId;
  title: string;
  defaultCaseId: CaseId;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
  files: ContentPackageFileRefs;
  review: ReviewMeta;
}

export interface ContentPackageFileRefs {
  textbook: string;
  knowledgeMap: string;
  cases: string[];
  questions: string[];
  knowledgeCards: string;
  clues: string;
  badges: string;
  reviewRules: string;
}

export interface Subject {
  subjectId: SubjectId;
  name: string;
  stage: "primary" | "middle" | "high" | string;
  status: "active" | "inactive" | string;
}

export interface TextbookVersion {
  textbookVersionId: TextbookVersionId;
  subjectId: SubjectId;
  name: string;
  publisher: string;
  status: "active" | "inactive" | string;
}

export interface Unit {
  unitId: UnitId;
  subjectId: SubjectId;
  textbookVersionId: TextbookVersionId;
  gradeId: GradeId;
  semesterId: SemesterId;
  order: number;
  name: string;
  learningGoals: string[];
}

export interface CurriculumNode {
  curriculumNodeId: CurriculumNodeId;
  subjectId: SubjectId;
  textbookVersionId: TextbookVersionId;
  gradeId: GradeId;
  semesterId: SemesterId;
  unitId: UnitId;
  lessonId: LessonId;
  name: string;
  order: number;
  mapsToKnowledgePointIds: KnowledgePointId[];
  source: {
    book: string;
    pageRange: string;
    note: string;
  };
}

export interface TextbookFile {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  subject: Subject;
  textbookVersion: TextbookVersion;
  unit: Unit;
  curriculumNodes: CurriculumNode[];
}

export interface KnowledgeDomain {
  domainId: string;
  subjectId: SubjectId;
  name: string;
}

export interface KnowledgePoint {
  knowledgePointId: KnowledgePointId;
  subjectId: SubjectId;
  domainId: string;
  name: string;
  shortName: string;
  definition: string;
  learningGoal: string;
  gradeBand: string;
  prerequisiteIds: KnowledgePointId[];
  skillIds: SkillId[];
  misconceptionIds: MisconceptionId[];
  status: "active" | "inactive" | ContentStatus | string;
  version: ContentVersion;
}

export interface Skill {
  skillId: SkillId;
  knowledgePointId: KnowledgePointId;
  name: string;
  learningGoal: string;
  difficultyBand: DifficultyBand;
  questionPatternIds: QuestionPatternId[];
  misconceptionIds: MisconceptionId[];
}

export interface Misconception {
  misconceptionId: MisconceptionId;
  knowledgePointId: KnowledgePointId;
  skillId: SkillId;
  name: string;
  description: string;
  diagnosisHint: string;
  remediationStrategyId: ReviewRuleId;
}

export interface QuestionPattern {
  questionPatternId: QuestionPatternId;
  knowledgePointId: KnowledgePointId;
  skillId: SkillId;
  name: string;
  supportedQuestionTypes: QuestionType[];
  difficultyBand: DifficultyBand;
  template: string;
}

export interface KnowledgeMapFile {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  domain: KnowledgeDomain;
  knowledgePoints: KnowledgePoint[];
  skills: Skill[];
  misconceptions: Misconception[];
  questionPatterns: QuestionPattern[];
}

export interface CaseStory {
  summary: string;
  setting: string;
  mentorCharacterId: string;
}

export interface PassRule {
  type: "min_correct" | "all_required" | string;
  minCorrect?: number;
  total?: number;
  requiredCorrectStepIds?: string[];
}

export interface UnlockRule {
  type: "available_by_default" | "previous_level_passed" | "level_passed" | string;
  levelId?: LevelId;
}

export interface LevelReward {
  clueId: ClueId;
  knowledgeCardIds: KnowledgeCardId[];
}

export interface LevelConfig {
  levelId: LevelId;
  legacyRuntimeId?: string;
  caseId: CaseId;
  order: number;
  name: string;
  place: string;
  knowledgePointId: KnowledgePointId;
  skillIds: SkillId[];
  questionGroupId: string;
  intro: string;
  passRule: PassRule;
  reward: LevelReward;
  unlockRule: UnlockRule;
}

export interface CaseConfig {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  caseId: CaseId;
  legacyCaseId?: string;
  name: string;
  subjectId: SubjectId;
  unitId: UnitId;
  targetKnowledgePointIds: KnowledgePointId[];
  story: CaseStory;
  levelIds: LevelId[];
  levels: LevelConfig[];
  bossTaskId: BossTaskId;
  badgeRewardIds: BadgeId[];
  unlockRule: UnlockRule;
  status: ContentStatus;
}

export interface Question {
  questionId: QuestionId;
  contentVersion: ContentVersion;
  subjectId: SubjectId;
  textbookVersionId: TextbookVersionId;
  gradeId: GradeId;
  semesterId: SemesterId;
  unitId: UnitId;
  lessonId: LessonId;
  curriculumNodeId: CurriculumNodeId;
  knowledgePointId: KnowledgePointId;
  skillId: SkillId;
  misconceptionId: MisconceptionId;
  questionPatternId: QuestionPatternId;
  caseId: CaseId;
  levelId: LevelId | "boss" | "reserve";
  legacyRuntimeLevelId?: string;
  bossTaskId?: BossTaskId;
  stepId?: string;
  questionType: QuestionType;
  difficultyBand: DifficultyBand;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
  wrongHint: string;
  tags: string[];
  status: ContentStatus;
}

export interface QuestionGroupFile {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  questionGroupId: string;
  caseId: CaseId;
  levelId: LevelId | "reserve";
  legacyRuntimeLevelId?: string;
  curriculumNodeId?: CurriculumNodeId;
  knowledgePointId?: KnowledgePointId;
  questions: Question[];
}

export interface BossStep {
  stepId: string;
  questionId: QuestionId;
  skillIds: SkillId[];
}

export interface FailureReviewRoute {
  type: "by_skill" | string;
  fallbackKnowledgeCardIds: KnowledgeCardId[];
}

export interface BossTask {
  bossTaskId: BossTaskId;
  caseId: CaseId;
  legacyRuntimeLevelId?: string;
  name: string;
  targetKnowledgePointIds: KnowledgePointId[];
  targetSkillIds: SkillId[];
  targetMisconceptionIds: MisconceptionId[];
  scenario: string;
  steps: BossStep[];
  passRule: PassRule;
  failureReviewRoute: FailureReviewRoute;
  status: ContentStatus;
}

export interface BossQuestionGroupFile {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  bossTask: BossTask;
  questions: Question[];
}

export interface KnowledgeCard {
  knowledgeCardId: KnowledgeCardId;
  legacyRuntimeId?: string;
  knowledgePointId: KnowledgePointId;
  skillIds: SkillId[];
  title: string;
  summary: string;
  example: string;
  method: string;
  commonMistake: string;
  reviewPrompt: string;
  relatedQuestionPatternIds: QuestionPatternId[];
  levelId: LevelId;
  status: ContentStatus;
}

export interface KnowledgeCardsFile {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  knowledgeCards: KnowledgeCard[];
}

export interface Clue {
  clueId: ClueId;
  caseId: CaseId;
  levelId: LevelId;
  legacyRuntimeId?: string;
  knowledgePointId: KnowledgePointId;
  title: string;
  text: string;
  unlockCondition: UnlockRule;
  status: ContentStatus;
}

export interface CluesFile {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  clues: Clue[];
}

export interface BadgeTriggerRule {
  type:
    | "first_level_passed"
    | "all_clues_collected"
    | "first_wrong_review"
    | "wrong_question_solved"
    | "case_closed"
    | string;
  caseId: CaseId;
  requiredClueIds?: ClueId[];
}

export interface Badge {
  badgeId: BadgeId;
  legacyRuntimeId?: string;
  name: string;
  description: string;
  icon: string;
  triggerRule: BadgeTriggerRule;
  isRepeatable: boolean;
  status: ContentStatus;
}

export interface BadgesFile {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  badges: Badge[];
}

export interface ReviewTrigger {
  type: "wrong_answer" | string;
  minWrongCount: number;
}

export interface ReviewAction {
  type: "show_knowledge_card" | "recommend_question_pattern" | string;
  knowledgeCardId?: KnowledgeCardId;
  questionPatternId?: QuestionPatternId;
  count?: number;
}

export interface ReviewRule {
  reviewRuleId: ReviewRuleId;
  knowledgePointId: KnowledgePointId;
  skillId: SkillId;
  misconceptionId: MisconceptionId;
  trigger: ReviewTrigger;
  actions: ReviewAction[];
  status: ContentStatus;
}

export interface ReviewRulesFile {
  schemaVersion: SchemaVersion;
  contentPackageId: string;
  contentVersion: ContentVersion;
  reviewRules: ReviewRule[];
}

export interface ContentPackage {
  manifest: ContentPackageManifest;
  textbook: TextbookFile;
  knowledgeMap: KnowledgeMapFile;
  cases: CaseConfig[];
  questionGroups: Array<QuestionGroupFile | BossQuestionGroupFile>;
  knowledgeCards: KnowledgeCardsFile;
  clues: CluesFile;
  badges: BadgesFile;
  reviewRules: ReviewRulesFile;
}
