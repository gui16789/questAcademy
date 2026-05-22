import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REGISTRY_PATH = path.join("content", "registry.json");

export async function validateContentRegistry(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const registryPath = options.registryPath ?? DEFAULT_REGISTRY_PATH;
  const registryFile = path.resolve(rootDir, registryPath);
  const errors = [];
  const registry = await readJsonFile(registryFile, errors, registryPath);
  if (!registry) return { registry: null, entries: [], errors };

  requireFields(registryPath, "", registry, ["schemaVersion", "registryVersion", "defaultContentPackageId", "packages"], errors);
  if (!Array.isArray(registry.packages)) {
    errors.push(`ERROR [${registryPath}:packages] packages must be an array`);
    return { registry, entries: [], errors };
  }

  const packageIds = new Set();
  const defaultEntries = registry.packages.filter((entry) => entry?.isDefault);
  if (defaultEntries.length !== 1) {
    errors.push(`ERROR [${registryPath}:isDefault] expected exactly one default content package, got ${defaultEntries.length}`);
  }

  for (const entry of registry.packages) {
    const id = entry?.contentPackageId ?? "";
    requireFields(registryPath, id, entry ?? {}, [
      "contentPackageId",
      "contentVersion",
      "title",
      "subjectId",
      "textbookVersionId",
      "gradeId",
      "semesterId",
      "unitId",
      "defaultCaseId",
      "status",
      "entryPath",
      "isDefault",
      "releaseNote",
    ], errors);

    if (packageIds.has(id)) errors.push(`ERROR [${registryPath}:${id}] duplicate contentPackageId`);
    if (id) packageIds.add(id);

    if (entry?.isDefault && id !== registry.defaultContentPackageId) {
      errors.push(`ERROR [${registryPath}:${id}] default entry does not match defaultContentPackageId ${registry.defaultContentPackageId}`);
    }

    if (entry?.entryPath) {
      try {
        await fs.access(path.resolve(rootDir, entry.entryPath, "manifest.json"));
      } catch {
        errors.push(`ERROR [${registryPath}:${id}] entryPath does not contain manifest.json: ${entry.entryPath}`);
      }
    }
  }

  if (!packageIds.has(registry.defaultContentPackageId)) {
    errors.push(`ERROR [${registryPath}:${registry.defaultContentPackageId}] defaultContentPackageId is not registered`);
  }

  return { registry, entries: registry.packages, errors };
}

export async function validateContentPackage(contentRoot, options = {}) {
  const errors = [];
  const rootDir = options.rootDir ?? process.cwd();
  const packageRoot = path.resolve(rootDir, contentRoot);
  const readJson = async (file) => readJsonFile(path.join(packageRoot, file), errors, `${contentRoot}/${file}`);
  const fail = (file, id, message) => {
    const target = id ? `${file}:${id}` : file;
    errors.push(`ERROR [${target}] ${message}`);
  };

  const manifest = await readJson("manifest.json");
  if (!manifest) return errors;

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
  ], errors);

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
      await fs.access(path.join(packageRoot, file));
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
    ], errors);
    addUnique(manifest.files.textbook, node.curriculumNodeId, curriculumNodeIds, "curriculumNodeId", fail);
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
    ], errors);
    addUnique(manifest.files.knowledgeMap, point.knowledgePointId, knowledgePointIds, "knowledgePointId", fail);
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
    ], errors);
    addUnique(manifest.files.knowledgeMap, skill.skillId, skillIds, "skillId", fail);
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
    ], errors);
    addUnique(manifest.files.knowledgeMap, misconception.misconceptionId, misconceptionIds, "misconceptionId", fail);
  }

  for (const pattern of knowledgeMap?.questionPatterns ?? []) {
    requireFields(manifest.files.knowledgeMap, pattern.questionPatternId, pattern, [
      "questionPatternId",
      "knowledgePointId",
      "skillId",
      "name",
      "supportedQuestionTypes",
      "difficultyBand",
    ], errors);
    addUnique(manifest.files.knowledgeMap, pattern.questionPatternId, questionPatternIds, "questionPatternId", fail);
  }

  for (const node of textbook?.curriculumNodes ?? []) {
    for (const knowledgePointId of node.mapsToKnowledgePointIds ?? []) {
      expectKnown(manifest.files.textbook, node.curriculumNodeId, "knowledgePointId", knowledgePointId, knowledgePointIds, fail);
    }
  }

  for (const point of knowledgeMap?.knowledgePoints ?? []) {
    for (const skillId of point.skillIds ?? []) expectKnown(manifest.files.knowledgeMap, point.knowledgePointId, "skillId", skillId, skillIds, fail);
    for (const misconceptionId of point.misconceptionIds ?? []) expectKnown(manifest.files.knowledgeMap, point.knowledgePointId, "misconceptionId", misconceptionId, misconceptionIds, fail);
    for (const prerequisiteId of point.prerequisiteIds ?? []) expectKnown(manifest.files.knowledgeMap, point.knowledgePointId, "prerequisiteId", prerequisiteId, knowledgePointIds, fail);
  }

  for (const skill of knowledgeMap?.skills ?? []) {
    expectKnown(manifest.files.knowledgeMap, skill.skillId, "knowledgePointId", skill.knowledgePointId, knowledgePointIds, fail);
    for (const patternId of skill.questionPatternIds ?? []) expectKnown(manifest.files.knowledgeMap, skill.skillId, "questionPatternId", patternId, questionPatternIds, fail);
    for (const misconceptionId of skill.misconceptionIds ?? []) expectKnown(manifest.files.knowledgeMap, skill.skillId, "misconceptionId", misconceptionId, misconceptionIds, fail);
  }

  for (const misconception of knowledgeMap?.misconceptions ?? []) {
    expectKnown(manifest.files.knowledgeMap, misconception.misconceptionId, "knowledgePointId", misconception.knowledgePointId, knowledgePointIds, fail);
    expectKnown(manifest.files.knowledgeMap, misconception.misconceptionId, "skillId", misconception.skillId, skillIds, fail);
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
  ], errors);

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
    ], errors);
    addUnique(caseFile, level.levelId, levelIds, "levelId", fail);
    expectKnown(caseFile, level.levelId, "knowledgePointId", level.knowledgePointId, knowledgePointIds, fail);
    for (const skillId of level.skillIds ?? []) expectKnown(caseFile, level.levelId, "skillId", skillId, skillIds, fail);
  }

  for (const levelId of caseData?.levelIds ?? []) expectKnown(caseFile, caseData.caseId, "levelId", levelId, levelIds, fail);
  for (const knowledgePointId of caseData?.targetKnowledgePointIds ?? []) expectKnown(caseFile, caseData.caseId, "knowledgePointId", knowledgePointId, knowledgePointIds, fail);

  for (const clue of clueData?.clues ?? []) {
    requireFields(clueFile, clue.clueId, clue, ["clueId", "caseId", "levelId", "knowledgePointId", "title", "text", "unlockCondition"], errors);
    addUnique(clueFile, clue.clueId, clueIds, "clueId", fail);
    expectKnown(clueFile, clue.clueId, "levelId", clue.levelId, levelIds, fail);
    expectKnown(clueFile, clue.clueId, "knowledgePointId", clue.knowledgePointId, knowledgePointIds, fail);
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
    ], errors);
    addUnique(cardFile, card.knowledgeCardId, knowledgeCardIds, "knowledgeCardId", fail);
    expectKnown(cardFile, card.knowledgeCardId, "levelId", card.levelId, levelIds, fail);
    expectKnown(cardFile, card.knowledgeCardId, "knowledgePointId", card.knowledgePointId, knowledgePointIds, fail);
    for (const skillId of card.skillIds ?? []) expectKnown(cardFile, card.knowledgeCardId, "skillId", skillId, skillIds, fail);
    for (const patternId of card.relatedQuestionPatternIds ?? []) expectKnown(cardFile, card.knowledgeCardId, "questionPatternId", patternId, questionPatternIds, fail);
  }

  for (const level of caseData?.levels ?? []) {
    expectKnown(caseFile, level.levelId, "clueId", level.reward?.clueId, clueIds, fail);
    for (const cardId of level.reward?.knowledgeCardIds ?? []) expectKnown(caseFile, level.levelId, "knowledgeCardId", cardId, knowledgeCardIds, fail);
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
    ], errors);
    addUnique(file, question.questionId, questionIds, "questionId", fail);
    expectKnown(file, question.questionId, "curriculumNodeId", question.curriculumNodeId, curriculumNodeIds, fail);
    expectKnown(file, question.questionId, "knowledgePointId", question.knowledgePointId, knowledgePointIds, fail);
    expectKnown(file, question.questionId, "skillId", question.skillId, skillIds, fail);
    expectKnown(file, question.questionId, "misconceptionId", question.misconceptionId, misconceptionIds, fail);
    expectKnown(file, question.questionId, "questionPatternId", question.questionPatternId, questionPatternIds, fail);
    expectKnown(file, question.questionId, "levelId", question.levelId, levelIds, fail);
  }

  for (const badge of badgeData?.badges ?? []) {
    requireFields(badgeFile, badge.badgeId, badge, ["badgeId", "name", "description", "icon", "triggerRule", "isRepeatable"], errors);
    addUnique(badgeFile, badge.badgeId, badgeIds, "badgeId", fail);
    if (badge.triggerRule?.caseId && badge.triggerRule.caseId !== caseData.caseId) fail(badgeFile, badge.badgeId, `unknown caseId ${badge.triggerRule.caseId}`);
    for (const clueId of badge.triggerRule?.requiredClueIds ?? []) expectKnown(badgeFile, badge.badgeId, "clueId", clueId, clueIds, fail);
  }

  const bossGroup = questionGroups.find(({ data }) => data?.bossTask);
  const bossTask = bossGroup?.data?.bossTask;
  requireFields(bossGroup?.file ?? "questions/boss.json", bossTask?.bossTaskId, bossTask ?? {}, [
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
  ], errors);

  for (const knowledgePointId of bossTask?.targetKnowledgePointIds ?? []) expectKnown(bossGroup.file, bossTask.bossTaskId, "knowledgePointId", knowledgePointId, knowledgePointIds, fail);
  for (const skillId of bossTask?.targetSkillIds ?? []) expectKnown(bossGroup.file, bossTask.bossTaskId, "skillId", skillId, skillIds, fail);
  for (const misconceptionId of bossTask?.targetMisconceptionIds ?? []) expectKnown(bossGroup.file, bossTask.bossTaskId, "misconceptionId", misconceptionId, misconceptionIds, fail);
  for (const step of bossTask?.steps ?? []) expectKnown(bossGroup.file, step.stepId, "questionId", step.questionId, questionIds, fail);
  for (const cardId of bossTask?.failureReviewRoute?.fallbackKnowledgeCardIds ?? []) expectKnown(bossGroup.file, bossTask.bossTaskId, "knowledgeCardId", cardId, knowledgeCardIds, fail);

  for (const rule of reviewRuleData?.reviewRules ?? []) {
    requireFields(reviewRuleFile, rule.reviewRuleId, rule, [
      "reviewRuleId",
      "knowledgePointId",
      "skillId",
      "misconceptionId",
      "trigger",
      "actions",
    ], errors);
    addUnique(reviewRuleFile, rule.reviewRuleId, reviewRuleIds, "reviewRuleId", fail);
    expectKnown(reviewRuleFile, rule.reviewRuleId, "knowledgePointId", rule.knowledgePointId, knowledgePointIds, fail);
    expectKnown(reviewRuleFile, rule.reviewRuleId, "skillId", rule.skillId, skillIds, fail);
    expectKnown(reviewRuleFile, rule.reviewRuleId, "misconceptionId", rule.misconceptionId, misconceptionIds, fail);
    for (const action of rule.actions ?? []) {
      if (action.knowledgeCardId) expectKnown(reviewRuleFile, rule.reviewRuleId, "knowledgeCardId", action.knowledgeCardId, knowledgeCardIds, fail);
      if (action.questionPatternId) expectKnown(reviewRuleFile, rule.reviewRuleId, "questionPatternId", action.questionPatternId, questionPatternIds, fail);
    }
  }

  if ((textbook?.curriculumNodes ?? []).length === 0) fail(manifest.files.textbook, "", "expected at least 1 curriculumNode");
  if ((knowledgeMap?.knowledgePoints ?? []).length === 0) fail(manifest.files.knowledgeMap, "", "expected at least 1 knowledgePoint");
  if ((caseData?.levels ?? []).length === 0) fail(caseFile, "", "expected at least 1 level");
  if (allQuestions.length === 0) fail("questions", "", "expected at least 1 question");

  return errors;
}

export async function runValidation(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const registryResult = await validateContentRegistry({ rootDir, registryPath: options.registryPath });
  const errors = [...registryResult.errors];
  const entries = selectEntries(registryResult.registry, registryResult.entries, options, errors);

  for (const entry of entries) {
    errors.push(...(await validateContentPackage(entry.entryPath, { rootDir })));
  }

  return errors;
}

function selectEntries(registry, entries, options, errors) {
  if (!registry) return [];
  if (options.all) return entries;
  if (options.contentPackageId) {
    const entry = entries.find((item) => item.contentPackageId === options.contentPackageId);
    if (!entry) {
      errors.push(`ERROR [content registry:${options.contentPackageId}] package is not registered`);
      return [];
    }
    return [entry];
  }
  return entries.filter((entry) => entry.contentPackageId === registry.defaultContentPackageId);
}

function requireFields(file, id, object, fields, errors) {
  for (const field of fields) {
    if (object[field] === undefined || object[field] === null || object[field] === "") {
      const target = id ? `${file}:${id}` : file;
      errors.push(`ERROR [${target}] missing ${field}`);
    }
  }
}

function addUnique(file, id, set, type, fail) {
  if (!id) return;
  if (set.has(id)) fail(file, id, `duplicate ${type}`);
  set.add(id);
}

function expectKnown(file, id, refType, refId, set, fail) {
  if (!refId) return;
  if (!set.has(refId)) fail(file, id, `unknown ${refType} ${refId}`);
}

function collectQuestions(questionGroups) {
  return questionGroups.flatMap(({ file, data }) => (data?.questions ?? []).map((question) => ({ file, question })));
}

async function readJsonFile(file, errors, label) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    errors.push(`ERROR [${label}] cannot read or parse JSON: ${error.message}`);
    return null;
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") options.all = true;
    else if (arg === "--package") options.contentPackageId = argv[++index];
    else if (arg === "--registry") options.registryPath = argv[++index];
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/validate-content.mjs [--all] [--package <contentPackageId>] [--registry <path>]`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    printHelp();
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    return;
  }

  const errors = await runValidation(options);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Content validation passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
