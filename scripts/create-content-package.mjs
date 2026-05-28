import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = "0.1.0";
const CONTENT_VERSION = "0.1.0";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--id") options.contentPackageId = argv[++index];
    else if (arg === "--title") options.title = argv[++index];
    else if (arg === "--case-id") options.caseId = argv[++index];
    else if (arg === "--case-name") options.caseName = argv[++index];
    else if (arg === "--root") options.rootDir = argv[++index];
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/create-content-package.mjs --id <contentPackageId> [--title <title>] [--case-id <caseId>] [--case-name <name>] [--root <dir>]

Example:
  npm run create:content-package -- --id math.bsd.g2.s2.unit-2-direction --title "北师大版二年级下册第二单元：方向与位置"
`);
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

  if (!options.contentPackageId) {
    console.error("Missing required --id <contentPackageId>");
    printHelp();
    process.exit(1);
  }

  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const model = buildModel(options);
  const packageRoot = path.resolve(rootDir, model.entryPath);
  await assertEmptyDirectory(packageRoot);
  await writePackage(packageRoot, model);

  console.log(`Created content package scaffold: ${path.relative(rootDir, packageRoot)}`);
  console.log("Next steps:");
  console.log("1. Replace draft textbook, knowledge, question, card, clue, boss, and review content.");
  console.log("2. Run npm run validate:content -- --package <contentPackageId> after registering it in content/registry.json.");
  console.log("3. Add bundled loader support in apps/web/src/contentPackage.ts before browser regression.");
}

function buildModel(options) {
  const parsed = parseContentPackageId(options.contentPackageId);
  const unitSlug = parsed.unitId.replace(/^unit-\d+-?/, "") || "draft";
  const caseId = options.caseId ?? `case-${unitSlug}`;
  const caseName = options.caseName ?? "待命名案件";
  const levelId = "level-draft";
  const knowledgePointId = `math.${unitSlug}.draft`;
  const skillId = `skill.${unitSlug}.draft`;
  const misconceptionId = `mis.${unitSlug}.draft`;
  const questionPatternId = `pattern.${unitSlug}.draft`;
  const knowledgeCardId = "card-draft";
  const clueId = "clue-draft";
  const bossTaskId = `boss-${unitSlug}-final`;
  const reviewRuleId = `review-${unitSlug}-draft`;
  const curriculumNodeId = `${parsed.textbookVersionId}.g${parsed.gradeNumber}.s${parsed.semesterNumber}.unit${parsed.unitOrder}.lesson-draft`;
  const entryPath = path.join(
    "content",
    parsed.subjectId,
    parsed.textbookVersionId,
    parsed.gradeId,
    parsed.semesterId,
    parsed.unitId,
  );

  return {
    ...parsed,
    caseId,
    caseName,
    levelId,
    knowledgePointId,
    skillId,
    misconceptionId,
    questionPatternId,
    knowledgeCardId,
    clueId,
    bossTaskId,
    reviewRuleId,
    curriculumNodeId,
    contentPackageId: options.contentPackageId,
    title: options.title ?? `北师大版二年级${parsed.semesterNumber === "1" ? "上册" : "下册"}第${parsed.unitOrder}单元：待定`,
    entryPath: normalizePath(entryPath),
    createdAt: new Date().toISOString(),
  };
}

function parseContentPackageId(contentPackageId) {
  const match = /^([a-z0-9-]+)\.([a-z0-9-]+)\.g(\d+)\.s(\d+)\.(unit-\d+(?:-[a-z0-9-]+)*)$/.exec(contentPackageId);
  if (!match) {
    throw new Error("contentPackageId must look like math.bsd.g2.s2.unit-2-topic");
  }

  const [, subjectId, textbookVersionId, gradeNumber, semesterNumber, unitId] = match;
  const unitOrder = unitId.match(/^unit-(\d+)/)?.[1] ?? "0";
  return {
    subjectId,
    textbookVersionId,
    gradeNumber,
    semesterNumber,
    unitOrder,
    gradeId: `grade-${gradeNumber}`,
    semesterId: `semester-${semesterNumber}`,
    unitId,
  };
}

async function assertEmptyDirectory(packageRoot) {
  try {
    const entries = await fs.readdir(packageRoot);
    if (entries.length > 0) throw new Error(`Target directory already exists and is not empty: ${packageRoot}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function writePackage(packageRoot, model) {
  await fs.mkdir(path.join(packageRoot, "cases"), { recursive: true });
  await fs.mkdir(path.join(packageRoot, "questions"), { recursive: true });
  await fs.mkdir(path.join(packageRoot, "cards"), { recursive: true });

  const files = {
    "manifest.json": manifest(model),
    "textbook.json": textbook(model),
    "knowledge-map.json": knowledgeMap(model),
    [`cases/${model.caseId}.json`]: caseFile(model),
    "questions/level-draft.json": levelQuestions(model),
    "questions/boss-draft.json": bossQuestions(model),
    "questions/reserve.json": reserveQuestions(model),
    "cards/knowledge-cards.json": knowledgeCards(model),
    "clues.json": clues(model),
    "badges.json": badges(model),
    "review-rules.json": reviewRules(model),
  };

  await Promise.all(
    Object.entries(files).map(([file, data]) => fs.writeFile(path.join(packageRoot, file), `${JSON.stringify(data, null, 2)}\n`, "utf8")),
  );
}

function manifest(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    status: "draft",
    subjectId: model.subjectId,
    textbookVersionId: model.textbookVersionId,
    gradeId: model.gradeId,
    semesterId: model.semesterId,
    unitId: model.unitId,
    title: model.title,
    defaultCaseId: model.caseId,
    locale: "zh-CN",
    createdAt: model.createdAt,
    updatedAt: model.createdAt,
    files: {
      textbook: "textbook.json",
      knowledgeMap: "knowledge-map.json",
      cases: [`cases/${model.caseId}.json`],
      questions: ["questions/level-draft.json", "questions/boss-draft.json", "questions/reserve.json"],
      knowledgeCards: "cards/knowledge-cards.json",
      clues: "clues.json",
      badges: "badges.json",
      reviewRules: "review-rules.json",
    },
    review: {
      contentReviewer: "",
      teachingReviewer: "",
      readabilityReviewer: "",
      approvedAt: "",
    },
  };
}

function textbook(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    subject: {
      subjectId: model.subjectId,
      name: "数学",
      stage: "primary",
      status: "active",
    },
    textbookVersion: {
      textbookVersionId: model.textbookVersionId,
      subjectId: model.subjectId,
      name: "北师大版",
      publisher: "北京师范大学出版社",
      status: "active",
    },
    unit: {
      unitId: model.unitId,
      subjectId: model.subjectId,
      textbookVersionId: model.textbookVersionId,
      gradeId: model.gradeId,
      semesterId: model.semesterId,
      order: Number(model.unitOrder),
      name: model.title.replace(/^北师大版二年级[上下]册/, ""),
      learningGoals: ["待教研填写本单元学习目标"],
    },
    curriculumNodes: [
      {
        curriculumNodeId: model.curriculumNodeId,
        subjectId: model.subjectId,
        textbookVersionId: model.textbookVersionId,
        gradeId: model.gradeId,
        semesterId: model.semesterId,
        unitId: model.unitId,
        lessonId: "lesson-draft",
        name: "待填写教材节点",
        order: 1,
        mapsToKnowledgePointIds: [model.knowledgePointId],
        source: {
          book: `北师大版小学数学二年级${model.semesterNumber === "1" ? "上册" : "下册"}`,
          pageRange: "",
          note: "脚手架草稿，需按实际教材复核。",
        },
      },
    ],
  };
}

function knowledgeMap(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    domain: {
      domainId: "number-and-algebra",
      subjectId: model.subjectId,
      name: "待教研确认领域",
    },
    knowledgePoints: [
      {
        knowledgePointId: model.knowledgePointId,
        subjectId: model.subjectId,
        domainId: "number-and-algebra",
        name: "待填写知识点",
        shortName: "待填写",
        definition: "待教研填写知识点定义。",
        learningGoal: "待教研填写学习目标。",
        gradeBand: "primary-lower",
        prerequisiteIds: [],
        skillIds: [model.skillId],
        misconceptionIds: [model.misconceptionId],
        status: "draft",
        version: CONTENT_VERSION,
      },
    ],
    skills: [
      {
        skillId: model.skillId,
        knowledgePointId: model.knowledgePointId,
        name: "待填写能力点",
        learningGoal: "待教研填写可观察能力。",
        difficultyBand: "basic",
        questionPatternIds: [model.questionPatternId],
        misconceptionIds: [model.misconceptionId],
      },
    ],
    misconceptions: [
      {
        misconceptionId: model.misconceptionId,
        knowledgePointId: model.knowledgePointId,
        skillId: model.skillId,
        name: "待填写易错点",
        description: "待教研填写常见错误表现。",
        diagnosisHint: "待教研填写诊断提示。",
        remediationStrategyId: model.reviewRuleId,
      },
    ],
    questionPatterns: [
      {
        questionPatternId: model.questionPatternId,
        knowledgePointId: model.knowledgePointId,
        skillId: model.skillId,
        name: "待填写题型模板",
        supportedQuestionTypes: ["single", "judge", "fill"],
        difficultyBand: "basic",
        template: "待填写题干模板。",
      },
    ],
  };
}

function caseFile(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    caseId: model.caseId,
    name: model.caseName,
    subjectId: model.subjectId,
    unitId: model.unitId,
    targetKnowledgePointIds: [model.knowledgePointId],
    story: {
      summary: "待内容策划填写案件背景。",
      setting: "动物侦探学院",
      mentorCharacterId: "char-deer-captain",
    },
    levelIds: [model.levelId],
    levels: [
      {
        levelId: model.levelId,
        caseId: model.caseId,
        order: 1,
        name: "待填写关卡",
        place: "待填写地点",
        knowledgePointId: model.knowledgePointId,
        skillIds: [model.skillId],
        questionGroupId: "qg-level-draft",
        intro: "待填写关卡引导语。",
        passRule: {
          type: "min_correct",
          minCorrect: 1,
          total: 1,
        },
        reward: {
          clueId: model.clueId,
          knowledgeCardIds: [model.knowledgeCardId],
        },
        unlockRule: {
          type: "available_by_default",
        },
      },
    ],
    bossTaskId: model.bossTaskId,
    badgeRewardIds: ["badge-case-closer"],
    unlockRule: {
      type: "available_by_default",
    },
    status: "draft",
  };
}

function questionBase(model, overrides) {
  return {
    contentVersion: CONTENT_VERSION,
    subjectId: model.subjectId,
    textbookVersionId: model.textbookVersionId,
    gradeId: model.gradeId,
    semesterId: model.semesterId,
    unitId: model.unitId,
    lessonId: "lesson-draft",
    curriculumNodeId: model.curriculumNodeId,
    knowledgePointId: model.knowledgePointId,
    skillId: model.skillId,
    misconceptionId: model.misconceptionId,
    questionPatternId: model.questionPatternId,
    caseId: model.caseId,
    questionType: "single",
    difficultyBand: "basic",
    stem: "这是一道脚手架占位题，发布前必须替换。",
    options: ["A", "B", "C"],
    answer: "A",
    explanation: "待教研填写解析。",
    wrongHint: "这条线索还不够清楚，我们先放进悬案馆，稍后再调查。",
    tags: ["draft"],
    status: "draft",
    ...overrides,
  };
}

function levelQuestions(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    questionGroupId: "qg-level-draft",
    caseId: model.caseId,
    levelId: model.levelId,
    curriculumNodeId: model.curriculumNodeId,
    knowledgePointId: model.knowledgePointId,
    questions: [
      questionBase(model, {
        questionId: "q-draft-001",
        levelId: model.levelId,
      }),
    ],
  };
}

function bossQuestions(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    bossTask: {
      bossTaskId: model.bossTaskId,
      caseId: model.caseId,
      name: "待填写 Boss 综合任务",
      targetKnowledgePointIds: [model.knowledgePointId],
      targetSkillIds: [model.skillId],
      targetMisconceptionIds: [model.misconceptionId],
      scenario: "待填写综合情境。",
      steps: [
        {
          stepId: "boss-step-1",
          questionId: "boss-q-draft-001",
          skillIds: [model.skillId],
        },
      ],
      passRule: {
        type: "all_required",
        requiredCorrectStepIds: ["boss-step-1"],
      },
      failureReviewRoute: {
        type: "by_skill",
        fallbackKnowledgeCardIds: [model.knowledgeCardId],
      },
      status: "draft",
    },
    questions: [
      questionBase(model, {
        questionId: "boss-q-draft-001",
        levelId: "boss",
        bossTaskId: model.bossTaskId,
        stepId: "boss-step-1",
        difficultyBand: "integrated",
      }),
    ],
  };
}

function reserveQuestions(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    questionGroupId: "qg-reserve-draft",
    caseId: model.caseId,
    levelId: "reserve",
    questions: [],
  };
}

function knowledgeCards(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    knowledgeCards: [
      {
        knowledgeCardId: model.knowledgeCardId,
        knowledgePointId: model.knowledgePointId,
        skillIds: [model.skillId],
        title: "待填写知识卡",
        summary: "待填写一句话解释。",
        example: "待填写例题。",
        method: "待填写方法。",
        commonMistake: "待填写常见错误。",
        reviewPrompt: "待填写复习提示。",
        relatedQuestionPatternIds: [model.questionPatternId],
        levelId: model.levelId,
        status: "draft",
      },
    ],
  };
}

function clues(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    clues: [
      {
        clueId: model.clueId,
        caseId: model.caseId,
        levelId: model.levelId,
        knowledgePointId: model.knowledgePointId,
        title: "待填写线索",
        text: "待填写线索文本。",
        unlockCondition: {
          type: "level_passed",
          levelId: model.levelId,
        },
        status: "draft",
      },
    ],
  };
}

function badges(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    badges: [
      {
        badgeId: "badge-case-closer",
        name: "破案小能手",
        description: "完成 Boss 并成功结案。",
        icon: "badge-detective-gold",
        triggerRule: {
          type: "case_closed",
          caseId: model.caseId,
        },
        isRepeatable: false,
        status: "draft",
      },
    ],
  };
}

function reviewRules(model) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentPackageId: model.contentPackageId,
    contentVersion: CONTENT_VERSION,
    reviewRules: [
      {
        reviewRuleId: model.reviewRuleId,
        knowledgePointId: model.knowledgePointId,
        skillId: model.skillId,
        misconceptionId: model.misconceptionId,
        trigger: {
          type: "wrong_answer",
          minWrongCount: 1,
        },
        actions: [
          {
            type: "show_knowledge_card",
            knowledgeCardId: model.knowledgeCardId,
          },
          {
            type: "recommend_question_pattern",
            questionPatternId: model.questionPatternId,
            count: 3,
          },
        ],
        status: "draft",
      },
    ],
  };
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
