import fs from "node:fs/promises";
import path from "node:path";

const contentRoot = path.join("content", "math", "bsd", "grade-2", "semester-2", "unit-1-division");
const errors = [];

const fail = (file, id, message) => {
  const target = id ? `${file}:${id}` : file;
  errors.push(`ERROR [${target}] ${message}`);
};

const readJson = async (file) => {
  try {
    return JSON.parse(await fs.readFile(path.join(contentRoot, file), "utf8"));
  } catch (error) {
    fail(file, "", `cannot read or parse JSON: ${error.message}`);
    return null;
  }
};

const requireFields = (file, id, object, fields) => {
  for (const field of fields) {
    if (object[field] === undefined || object[field] === null || object[field] === "") {
      fail(file, id, `missing ${field}`);
    }
  }
};

const addUnique = (file, id, set, type) => {
  if (!id) return;
  if (set.has(id)) fail(file, id, `duplicate ${type}`);
  set.add(id);
};

const expectKnown = (file, id, refType, refId, set) => {
  if (!refId) return;
  if (!set.has(refId)) fail(file, id, `unknown ${refType} ${refId}`);
};

const collectQuestions = (questionGroups) =>
  questionGroups.flatMap(({ file, data }) => (data?.questions ?? []).map((question) => ({ file, question })));

const manifest = await readJson("manifest.json");
if (!manifest) finish();

requireFields("manifest.json", "", manifest, [
  "schemaVersion",
  "contentPackageId",
  "contentVersion",
  "subjectId",
  "textbookVersionId",
  "gradeId",
  "semesterId",
  "unitId",
  "defaultCaseId",
  "files",
]);

const fileRefs = [
  manifest.files?.textbook,
  manifest.files?.knowledgeMap,
  ...(manifest.files?.cases ?? []),
  ...(manifest.files?.questions ?? []),
  manifest.files?.knowledgeCards,
  manifest.files?.clues,
  manifest.files?.badges,
  manifest.files?.reviewRules,
].filter(Boolean);

for (const file of fileRefs) {
  try {
    await fs.access(path.join(contentRoot, file));
  } catch {
    fail("manifest.json", file, "referenced file does not exist");
  }
}

const textbook = await readJson(manifest.files.textbook);
const knowledgeMap = await readJson(manifest.files.knowledgeMap);
const caseFile = manifest.files.cases[0];
const caseData = await readJson(caseFile);
const cardFile = manifest.files.knowledgeCards;
const cardData = await readJson(cardFile);
const clueFile = manifest.files.clues;
const clueData = await readJson(clueFile);
const badgeFile = manifest.files.badges;
const badgeData = await readJson(badgeFile);
const reviewRuleFile = manifest.files.reviewRules;
const reviewRuleData = await readJson(reviewRuleFile);
const questionGroups = await Promise.all(
  manifest.files.questions.map(async (file) => ({
    file,
    data: await readJson(file),
  })),
);

const knowledgePointIds = new Set();
const skillIds = new Set();
const misconceptionIds = new Set();
const questionPatternIds = new Set();
const levelIds = new Set(["boss", "reserve"]);
const clueIds = new Set();
const knowledgeCardIds = new Set();
const badgeIds = new Set();
const reviewRuleIds = new Set();
const questionIds = new Set();
const curriculumNodeIds = new Set();

for (const node of textbook?.curriculumNodes ?? []) {
  requireFields(manifest.files.textbook, node.curriculumNodeId, node, [
    "curriculumNodeId",
    "subjectId",
    "textbookVersionId",
    "gradeId",
    "semesterId",
    "unitId",
    "lessonId",
    "name",
    "order",
    "mapsToKnowledgePointIds",
  ]);
  addUnique(manifest.files.textbook, node.curriculumNodeId, curriculumNodeIds, "curriculumNodeId");
}

for (const point of knowledgeMap?.knowledgePoints ?? []) {
  requireFields(manifest.files.knowledgeMap, point.knowledgePointId, point, [
    "knowledgePointId",
    "subjectId",
    "domainId",
    "name",
    "learningGoal",
    "skillIds",
    "misconceptionIds",
    "status",
    "version",
  ]);
  addUnique(manifest.files.knowledgeMap, point.knowledgePointId, knowledgePointIds, "knowledgePointId");
}

for (const skill of knowledgeMap?.skills ?? []) {
  requireFields(manifest.files.knowledgeMap, skill.skillId, skill, [
    "skillId",
    "knowledgePointId",
    "name",
    "learningGoal",
    "difficultyBand",
    "questionPatternIds",
    "misconceptionIds",
  ]);
  addUnique(manifest.files.knowledgeMap, skill.skillId, skillIds, "skillId");
}

for (const misconception of knowledgeMap?.misconceptions ?? []) {
  requireFields(manifest.files.knowledgeMap, misconception.misconceptionId, misconception, [
    "misconceptionId",
    "knowledgePointId",
    "skillId",
    "name",
    "description",
    "diagnosisHint",
    "remediationStrategyId",
  ]);
  addUnique(manifest.files.knowledgeMap, misconception.misconceptionId, misconceptionIds, "misconceptionId");
}

for (const pattern of knowledgeMap?.questionPatterns ?? []) {
  requireFields(manifest.files.knowledgeMap, pattern.questionPatternId, pattern, [
    "questionPatternId",
    "knowledgePointId",
    "skillId",
    "name",
    "supportedQuestionTypes",
    "difficultyBand",
  ]);
  addUnique(manifest.files.knowledgeMap, pattern.questionPatternId, questionPatternIds, "questionPatternId");
}

for (const node of textbook?.curriculumNodes ?? []) {
  for (const knowledgePointId of node.mapsToKnowledgePointIds ?? []) {
    expectKnown(manifest.files.textbook, node.curriculumNodeId, "knowledgePointId", knowledgePointId, knowledgePointIds);
  }
}

for (const point of knowledgeMap?.knowledgePoints ?? []) {
  for (const skillId of point.skillIds ?? []) expectKnown(manifest.files.knowledgeMap, point.knowledgePointId, "skillId", skillId, skillIds);
  for (const misconceptionId of point.misconceptionIds ?? []) {
    expectKnown(manifest.files.knowledgeMap, point.knowledgePointId, "misconceptionId", misconceptionId, misconceptionIds);
  }
  for (const prerequisiteId of point.prerequisiteIds ?? []) {
    expectKnown(manifest.files.knowledgeMap, point.knowledgePointId, "prerequisiteId", prerequisiteId, knowledgePointIds);
  }
}

for (const skill of knowledgeMap?.skills ?? []) {
  expectKnown(manifest.files.knowledgeMap, skill.skillId, "knowledgePointId", skill.knowledgePointId, knowledgePointIds);
  for (const patternId of skill.questionPatternIds ?? []) expectKnown(manifest.files.knowledgeMap, skill.skillId, "questionPatternId", patternId, questionPatternIds);
  for (const misconceptionId of skill.misconceptionIds ?? []) expectKnown(manifest.files.knowledgeMap, skill.skillId, "misconceptionId", misconceptionId, misconceptionIds);
}

for (const misconception of knowledgeMap?.misconceptions ?? []) {
  expectKnown(manifest.files.knowledgeMap, misconception.misconceptionId, "knowledgePointId", misconception.knowledgePointId, knowledgePointIds);
  expectKnown(manifest.files.knowledgeMap, misconception.misconceptionId, "skillId", misconception.skillId, skillIds);
}

requireFields(caseFile, caseData?.caseId, caseData ?? {}, [
  "caseId",
  "contentPackageId",
  "name",
  "subjectId",
  "unitId",
  "targetKnowledgePointIds",
  "levelIds",
  "levels",
  "bossTaskId",
]);

for (const level of caseData?.levels ?? []) {
  requireFields(caseFile, level.levelId, level, [
    "levelId",
    "caseId",
    "order",
    "name",
    "place",
    "knowledgePointId",
    "skillIds",
    "questionGroupId",
    "passRule",
    "reward",
  ]);
  addUnique(caseFile, level.levelId, levelIds, "levelId");
  expectKnown(caseFile, level.levelId, "knowledgePointId", level.knowledgePointId, knowledgePointIds);
  for (const skillId of level.skillIds ?? []) expectKnown(caseFile, level.levelId, "skillId", skillId, skillIds);
}

for (const levelId of caseData?.levelIds ?? []) expectKnown(caseFile, caseData.caseId, "levelId", levelId, levelIds);
for (const knowledgePointId of caseData?.targetKnowledgePointIds ?? []) {
  expectKnown(caseFile, caseData.caseId, "knowledgePointId", knowledgePointId, knowledgePointIds);
}

for (const clue of clueData?.clues ?? []) {
  requireFields(clueFile, clue.clueId, clue, ["clueId", "caseId", "levelId", "knowledgePointId", "title", "text", "unlockCondition"]);
  addUnique(clueFile, clue.clueId, clueIds, "clueId");
  expectKnown(clueFile, clue.clueId, "levelId", clue.levelId, levelIds);
  expectKnown(clueFile, clue.clueId, "knowledgePointId", clue.knowledgePointId, knowledgePointIds);
}

for (const card of cardData?.knowledgeCards ?? []) {
  requireFields(cardFile, card.knowledgeCardId, card, [
    "knowledgeCardId",
    "knowledgePointId",
    "skillIds",
    "title",
    "summary",
    "example",
    "method",
    "commonMistake",
    "reviewPrompt",
    "relatedQuestionPatternIds",
    "levelId",
  ]);
  addUnique(cardFile, card.knowledgeCardId, knowledgeCardIds, "knowledgeCardId");
  expectKnown(cardFile, card.knowledgeCardId, "levelId", card.levelId, levelIds);
  expectKnown(cardFile, card.knowledgeCardId, "knowledgePointId", card.knowledgePointId, knowledgePointIds);
  for (const skillId of card.skillIds ?? []) expectKnown(cardFile, card.knowledgeCardId, "skillId", skillId, skillIds);
  for (const patternId of card.relatedQuestionPatternIds ?? []) expectKnown(cardFile, card.knowledgeCardId, "questionPatternId", patternId, questionPatternIds);
}

for (const level of caseData?.levels ?? []) {
  expectKnown(caseFile, level.levelId, "clueId", level.reward?.clueId, clueIds);
  for (const cardId of level.reward?.knowledgeCardIds ?? []) expectKnown(caseFile, level.levelId, "knowledgeCardId", cardId, knowledgeCardIds);
}

const allQuestions = collectQuestions(questionGroups);
for (const { file, question } of allQuestions) {
  requireFields(file, question.questionId, question, [
    "questionId",
    "contentVersion",
    "subjectId",
    "textbookVersionId",
    "gradeId",
    "semesterId",
    "unitId",
    "lessonId",
    "curriculumNodeId",
    "knowledgePointId",
    "skillId",
    "misconceptionId",
    "questionPatternId",
    "caseId",
    "levelId",
    "questionType",
    "difficultyBand",
    "stem",
    "options",
    "answer",
    "explanation",
    "status",
  ]);
  addUnique(file, question.questionId, questionIds, "questionId");
  expectKnown(file, question.questionId, "curriculumNodeId", question.curriculumNodeId, curriculumNodeIds);
  expectKnown(file, question.questionId, "knowledgePointId", question.knowledgePointId, knowledgePointIds);
  expectKnown(file, question.questionId, "skillId", question.skillId, skillIds);
  expectKnown(file, question.questionId, "misconceptionId", question.misconceptionId, misconceptionIds);
  expectKnown(file, question.questionId, "questionPatternId", question.questionPatternId, questionPatternIds);
  expectKnown(file, question.questionId, "levelId", question.levelId, levelIds);
}

for (const badge of badgeData?.badges ?? []) {
  requireFields(badgeFile, badge.badgeId, badge, ["badgeId", "name", "description", "icon", "triggerRule", "isRepeatable"]);
  addUnique(badgeFile, badge.badgeId, badgeIds, "badgeId");
  if (badge.triggerRule?.caseId && badge.triggerRule.caseId !== caseData.caseId) {
    fail(badgeFile, badge.badgeId, `unknown caseId ${badge.triggerRule.caseId}`);
  }
  for (const clueId of badge.triggerRule?.requiredClueIds ?? []) expectKnown(badgeFile, badge.badgeId, "clueId", clueId, clueIds);
}

const bossGroup = questionGroups.find(({ file }) => file.includes("boss-carrot-badge-final"));
const bossTask = bossGroup?.data?.bossTask;
requireFields(bossGroup?.file ?? "questions/boss-carrot-badge-final.json", bossTask?.bossTaskId, bossTask ?? {}, [
  "bossTaskId",
  "caseId",
  "name",
  "targetKnowledgePointIds",
  "targetSkillIds",
  "targetMisconceptionIds",
  "scenario",
  "steps",
  "passRule",
  "failureReviewRoute",
]);

for (const knowledgePointId of bossTask?.targetKnowledgePointIds ?? []) expectKnown(bossGroup.file, bossTask.bossTaskId, "knowledgePointId", knowledgePointId, knowledgePointIds);
for (const skillId of bossTask?.targetSkillIds ?? []) expectKnown(bossGroup.file, bossTask.bossTaskId, "skillId", skillId, skillIds);
for (const misconceptionId of bossTask?.targetMisconceptionIds ?? []) {
  expectKnown(bossGroup.file, bossTask.bossTaskId, "misconceptionId", misconceptionId, misconceptionIds);
}
for (const step of bossTask?.steps ?? []) expectKnown(bossGroup.file, step.stepId, "questionId", step.questionId, questionIds);
for (const cardId of bossTask?.failureReviewRoute?.fallbackKnowledgeCardIds ?? []) {
  expectKnown(bossGroup.file, bossTask.bossTaskId, "knowledgeCardId", cardId, knowledgeCardIds);
}

for (const rule of reviewRuleData?.reviewRules ?? []) {
  requireFields(reviewRuleFile, rule.reviewRuleId, rule, [
    "reviewRuleId",
    "knowledgePointId",
    "skillId",
    "misconceptionId",
    "trigger",
    "actions",
  ]);
  addUnique(reviewRuleFile, rule.reviewRuleId, reviewRuleIds, "reviewRuleId");
  expectKnown(reviewRuleFile, rule.reviewRuleId, "knowledgePointId", rule.knowledgePointId, knowledgePointIds);
  expectKnown(reviewRuleFile, rule.reviewRuleId, "skillId", rule.skillId, skillIds);
  expectKnown(reviewRuleFile, rule.reviewRuleId, "misconceptionId", rule.misconceptionId, misconceptionIds);
  for (const action of rule.actions ?? []) {
    if (action.knowledgeCardId) expectKnown(reviewRuleFile, rule.reviewRuleId, "knowledgeCardId", action.knowledgeCardId, knowledgeCardIds);
    if (action.questionPatternId) expectKnown(reviewRuleFile, rule.reviewRuleId, "questionPatternId", action.questionPatternId, questionPatternIds);
  }
}

const regularQuestionCount = allQuestions.filter(({ question }) => !["boss", "reserve"].includes(question.levelId)).length;
const reserveQuestionCount = allQuestions.filter(({ question }) => question.levelId === "reserve").length;
const bossQuestionCount = allQuestions.filter(({ question }) => question.levelId === "boss").length;

if ((textbook?.curriculumNodes ?? []).length !== 4) fail(manifest.files.textbook, "", "expected 4 curriculumNodes");
if ((knowledgeMap?.knowledgePoints ?? []).length !== 5) fail(manifest.files.knowledgeMap, "", "expected 5 knowledgePoints");
if ((caseData?.levels ?? []).length !== 4) fail(caseFile, "", "expected 4 levels");
if (regularQuestionCount !== 16) fail("questions", "", `expected 16 regular questions, got ${regularQuestionCount}`);
if (reserveQuestionCount !== 10) fail("questions/reserve.json", "", `expected 10 reserve questions, got ${reserveQuestionCount}`);
if (bossQuestionCount !== 2) fail("questions/boss-carrot-badge-final.json", "", `expected 2 boss questions, got ${bossQuestionCount}`);

finish();

function finish() {
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Content validation passed.");
}
