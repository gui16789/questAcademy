import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_REGISTRY_PATH = path.join("content", "registry.json");

const DEFAULT_REQUIREMENT = {
  minQuestionsPerRequiredMicroKnowledgePoint: 2,
  minQuestionsPerSkill: 2,
  minQuestionsPerMisconception: 1,
  excludeReserveFromCoverage: true,
  excludeBossFromDiagnosticCoverage: true,
};

export async function generateCoverageReport(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const registryPath = options.registryPath ?? DEFAULT_REGISTRY_PATH;
  const registry = await readJson(path.resolve(rootDir, registryPath));
  const entries = selectEntries(registry, options);
  const packages = [];

  for (const entry of entries) {
    packages.push(await reportPackage(entry, rootDir));
  }

  return {
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    registryPath,
    packageCount: packages.length,
    totals: summarizePackages(packages),
    packages,
  };
}

export async function validateCoverageForEntries(entries, rootDir) {
  const diagnostics = [];

  for (const entry of entries) {
    const report = await reportPackage(entry, rootDir);
    diagnostics.push(...coverageDiagnostics(report, entry.status));
  }

  return diagnostics;
}

export function coverageDiagnostics(report, packageStatus = report.status) {
  const diagnostics = [];
  const severity = packageStatus === "published" ? "ERROR" : "WARN";
  const prefix = `${report.contentPackageId}:coverage`;

  if (!report.coverageDeclarationPresent) {
    diagnostics.push({
      severity,
      message: `${severity} [${prefix}] missing manifest.coverage declaration`,
    });
    return diagnostics;
  }

  for (const item of report.requiredMicroKnowledgePoints) {
    if (item.ordinaryQuestionCount < item.requiredQuestionCount) {
      const bossOnly = item.ordinaryQuestionCount === 0 && item.bossQuestionCount > 0 ? " Boss questions are reported separately." : "";
      diagnostics.push({
        severity,
        message: `${severity} [${prefix}:${item.microKnowledgePointId}] required micro knowledge point has ${item.ordinaryQuestionCount}/${item.requiredQuestionCount} ordinary diagnostic questions.${bossOnly}`,
      });
    }
  }

  for (const item of report.skills) {
    if (item.ordinaryQuestionCount < item.requiredQuestionCount) {
      diagnostics.push({
        severity,
        message: `${severity} [${prefix}:${item.skillId}] skill has ${item.ordinaryQuestionCount}/${item.requiredQuestionCount} ordinary diagnostic questions`,
      });
    }
  }

  for (const item of report.misconceptions) {
    if (item.ordinaryQuestionCount < item.requiredQuestionCount) {
      diagnostics.push({
        severity,
        message: `${severity} [${prefix}:${item.misconceptionId}] misconception has ${item.ordinaryQuestionCount}/${item.requiredQuestionCount} targeted ordinary diagnostic questions`,
      });
    }
  }

  return diagnostics;
}

export async function reportPackage(entry, rootDir) {
  const packageRoot = path.resolve(rootDir, entry.entryPath);
  const manifest = await readJson(path.join(packageRoot, "manifest.json"));
  const coverageDeclaration = manifest.coverage;
  const plan = coverageDeclaration?.coveragePlanPath
    ? await readJson(path.resolve(rootDir, coverageDeclaration.coveragePlanPath))
    : null;
  const planUnit = plan?.units?.find((unit) => unit.unitId === manifest.unitId);
  const requirement = {
    ...DEFAULT_REQUIREMENT,
    ...(plan?.diagnosticRequirement ?? {}),
    ...(coverageDeclaration?.diagnosticRequirement ?? {}),
  };

  const [textbook, knowledgeMap, caseFiles, questionGroups] = await Promise.all([
    readJson(path.join(packageRoot, manifest.files.textbook)),
    readJson(path.join(packageRoot, manifest.files.knowledgeMap)),
    Promise.all((manifest.files.cases ?? []).map((file) => readJson(path.join(packageRoot, file)))),
    Promise.all((manifest.files.questions ?? []).map(async (file) => ({
      file,
      data: await readJson(path.join(packageRoot, file)),
    }))),
  ]);

  const expectedKnowledgePoints = selectExpectedKnowledgePoints(planUnit, coverageDeclaration, knowledgeMap);
  const microKnowledgePoints = selectMicroKnowledgePoints(planUnit, coverageDeclaration, expectedKnowledgePoints, knowledgeMap);
  const questions = collectQuestions(questionGroups);
  const ordinaryQuestions = questions.filter((question) => isOrdinaryDiagnosticQuestion(question));
  const bossQuestions = questions.filter((question) => question.levelId === "boss");
  const reserveQuestions = questions.filter((question) => question.levelId === "reserve");
  const levelExperience = collectLevelExperience(caseFiles);
  const bossExperience = collectBossExperience(questionGroups);

  const requiredMicroKnowledgePoints = microKnowledgePoints
    .filter((item) => item.required !== false)
    .map((item) => countMicroKnowledgePoint(item, ordinaryQuestions, bossQuestions, reserveQuestions, levelExperience, bossExperience, requirement));
  const knowledgePoints = expectedKnowledgePoints.map((point) => countExpectedKnowledgePoint(point, requiredMicroKnowledgePoints));
  const skills = countSkills(requiredMicroKnowledgePoints, ordinaryQuestions, requirement);
  const misconceptions = countMisconceptions(requiredMicroKnowledgePoints, ordinaryQuestions, requirement);
  const lowCoverageMicroKnowledgePoints = requiredMicroKnowledgePoints.filter(
    (item) => item.ordinaryQuestionCount > 0 && item.ordinaryQuestionCount < item.requiredQuestionCount,
  );
  const uncoveredMicroKnowledgePoints = requiredMicroKnowledgePoints.filter((item) => item.ordinaryQuestionCount === 0);
  const weakDiagnosticMicroKnowledgePoints = requiredMicroKnowledgePoints.filter((item) => item.ordinaryQuestionCount === 1);

  return {
    contentPackageId: manifest.contentPackageId,
    title: manifest.title,
    status: manifest.status,
    subjectId: manifest.subjectId,
    textbookVersionId: manifest.textbookVersionId,
    gradeId: manifest.gradeId,
    semesterId: manifest.semesterId,
    unitId: manifest.unitId,
    coverageDeclarationPresent: Boolean(coverageDeclaration),
    coveragePlanId: coverageDeclaration?.coveragePlanId ?? plan?.coveragePlanId ?? null,
    coveragePlanPath: coverageDeclaration?.coveragePlanPath ?? null,
    diagnosticRequirement: requirement,
    coverageTarget: coverageDeclaration?.coverageTarget ?? plan?.coverageTarget ?? null,
    contentInventory: {
      curriculumNodeCount: textbook.curriculumNodes?.length ?? 0,
      declaredKnowledgePointCount: knowledgeMap.knowledgePoints?.length ?? 0,
      declaredSkillCount: knowledgeMap.skills?.length ?? 0,
      declaredMisconceptionCount: knowledgeMap.misconceptions?.length ?? 0,
      ordinaryQuestionCount: ordinaryQuestions.length,
      bossQuestionCount: bossQuestions.length,
      reserveQuestionCount: reserveQuestions.length,
    },
    expectedKnowledgePointCount: expectedKnowledgePoints.length,
    expectedMicroKnowledgePointCount: requiredMicroKnowledgePoints.length,
    coveredKnowledgePointCount: knowledgePoints.filter((item) => item.coverageStatus === "diagnostic_ready").length,
    coveredMicroKnowledgePointCount: requiredMicroKnowledgePoints.filter((item) => item.coverageStatus === "diagnostic_ready").length,
    experienceCoveredMicroKnowledgePointCount: requiredMicroKnowledgePoints.filter((item) => item.experienceCoveredByLevel).length,
    bossCoveredMicroKnowledgePointCount: requiredMicroKnowledgePoints.filter((item) => item.coveredByBossOnly || item.bossQuestionCount > 0).length,
    knowledgePointCoverageRate: rate(knowledgePoints.filter((item) => item.coverageStatus === "diagnostic_ready").length, expectedKnowledgePoints.length),
    microKnowledgePointCoverageRate: rate(
      requiredMicroKnowledgePoints.filter((item) => item.coverageStatus === "diagnostic_ready").length,
      requiredMicroKnowledgePoints.length,
    ),
    skillCoverageRate: rate(skills.filter((item) => item.coverageStatus === "diagnostic_ready").length, skills.length),
    misconceptionCoverageRate: rate(
      misconceptions.filter((item) => item.coverageStatus === "diagnostic_ready").length,
      misconceptions.length,
    ),
    knowledgePoints,
    requiredMicroKnowledgePoints,
    skills,
    misconceptions,
    lowCoverageMicroKnowledgePoints,
    uncoveredMicroKnowledgePoints,
    weakDiagnosticMicroKnowledgePoints,
    bossQuestionsAreSeparate: true,
  };
}

export function formatCoverageReport(report) {
  const lines = [];
  lines.push(`Coverage report (${report.packageCount} package${report.packageCount === 1 ? "" : "s"})`);
  lines.push(
    `Totals: micro ${report.totals.coveredMicroKnowledgePointCount}/${report.totals.expectedMicroKnowledgePointCount} (${formatRate(report.totals.microKnowledgePointCoverageRate)}), skill ${formatRate(report.totals.skillCoverageRate)}, misconception ${formatRate(report.totals.misconceptionCoverageRate)}`,
  );

  for (const item of report.packages) {
    lines.push("");
    lines.push(`${item.title} [${item.contentPackageId}]`);
    lines.push(
      `  Expected: ${item.expectedKnowledgePointCount} knowledge points, ${item.expectedMicroKnowledgePointCount} micro knowledge points`,
    );
    lines.push(
      `  Diagnostic coverage: knowledge ${item.coveredKnowledgePointCount}/${item.expectedKnowledgePointCount} (${formatRate(item.knowledgePointCoverageRate)}), micro ${item.coveredMicroKnowledgePointCount}/${item.expectedMicroKnowledgePointCount} (${formatRate(item.microKnowledgePointCoverageRate)}), skill ${formatRate(item.skillCoverageRate)}, misconception ${formatRate(item.misconceptionCoverageRate)}`,
    );
    lines.push(
      `  Questions: ordinary ${item.contentInventory.ordinaryQuestionCount}, boss ${item.contentInventory.bossQuestionCount} (separate), reserve ${item.contentInventory.reserveQuestionCount} (excluded)`,
    );
    lines.push(
      `  Experience levels touch ${item.experienceCoveredMicroKnowledgePointCount}/${item.expectedMicroKnowledgePointCount} micro knowledge points; boss touches ${item.bossCoveredMicroKnowledgePointCount}/${item.expectedMicroKnowledgePointCount}.`,
    );

    const low = item.lowCoverageMicroKnowledgePoints.map(formatMicroGap);
    const uncovered = item.uncoveredMicroKnowledgePoints.map(formatMicroGap);
    const weak = item.weakDiagnosticMicroKnowledgePoints.map(formatMicroGap);
    lines.push(`  Low coverage: ${low.length > 0 ? low.join("; ") : "none"}`);
    lines.push(`  Uncovered: ${uncovered.length > 0 ? uncovered.join("; ") : "none"}`);
    lines.push(`  Weak one-question diagnostics: ${weak.length > 0 ? weak.join("; ") : "none"}`);
  }

  return lines.join("\n");
}

function countMicroKnowledgePoint(item, ordinaryQuestions, bossQuestions, reserveQuestions, levelExperience, bossExperience, requirement) {
  const requiredQuestionCount = item.diagnosticRequirement?.minQuestionsPerRequiredMicroKnowledgePoint
    ?? requirement.minQuestionsPerRequiredMicroKnowledgePoint;
  const ordinaryQuestionCount = ordinaryQuestions.filter((question) => questionMatchesMicro(question, item)).length;
  const bossQuestionCount = bossQuestions.filter((question) => questionMatchesMicro(question, item)).length;
  const reserveQuestionCount = reserveQuestions.filter((question) => questionMatchesMicro(question, item)).length;
  const experienceCoveredByLevel = levelExperience.some((level) => levelMatchesMicro(level, item));
  const experienceCoveredByBoss = bossExperience.some((boss) => bossMatchesMicro(boss, item));

  return {
    microKnowledgePointId: item.microKnowledgePointId,
    expectedKnowledgePointId: item.expectedKnowledgePointId,
    knowledgePointId: item.knowledgePointId,
    unitId: item.unitId,
    lessonId: item.lessonId,
    name: item.name,
    learningGoal: item.learningGoal,
    skillIds: item.skillIds ?? [],
    misconceptionIds: item.misconceptionIds ?? [],
    recommendedQuestionTypes: item.recommendedQuestionTypes ?? [],
    requiredQuestionCount,
    ordinaryQuestionCount,
    bossQuestionCount,
    reserveQuestionCount,
    experienceCoveredByLevel,
    experienceCoveredByBoss,
    coveredByBossOnly: ordinaryQuestionCount === 0 && (bossQuestionCount > 0 || experienceCoveredByBoss),
    coverageStatus: ordinaryQuestionCount >= requiredQuestionCount ? "diagnostic_ready" : ordinaryQuestionCount > 0 ? "partial" : "not_started",
  };
}

function countExpectedKnowledgePoint(point, microCounts) {
  const children = microCounts.filter((item) => item.expectedKnowledgePointId === point.expectedKnowledgePointId);
  return {
    expectedKnowledgePointId: point.expectedKnowledgePointId,
    knowledgePointId: point.knowledgePointId,
    unitId: point.unitId,
    lessonId: point.lessonId,
    name: point.name,
    requiredMicroKnowledgePointCount: children.length,
    coveredMicroKnowledgePointCount: children.filter((item) => item.coverageStatus === "diagnostic_ready").length,
    ordinaryQuestionCount: children.reduce((sum, item) => sum + item.ordinaryQuestionCount, 0),
    bossQuestionCount: children.reduce((sum, item) => sum + item.bossQuestionCount, 0),
    reserveQuestionCount: children.reduce((sum, item) => sum + item.reserveQuestionCount, 0),
    coverageStatus: children.length > 0 && children.every((item) => item.coverageStatus === "diagnostic_ready")
      ? "diagnostic_ready"
      : children.some((item) => item.ordinaryQuestionCount > 0)
        ? "partial"
        : "not_started",
  };
}

function countSkills(microCounts, ordinaryQuestions, requirement) {
  const skillIds = unique(microCounts.flatMap((item) => item.skillIds));
  return skillIds.map((skillId) => {
    const ordinaryQuestionCount = ordinaryQuestions.filter((question) => question.skillId === skillId).length;
    const requiredQuestionCount = requirement.minQuestionsPerSkill;
    return {
      skillId,
      ordinaryQuestionCount,
      requiredQuestionCount,
      coverageStatus: ordinaryQuestionCount >= requiredQuestionCount ? "diagnostic_ready" : ordinaryQuestionCount > 0 ? "partial" : "not_started",
    };
  });
}

function countMisconceptions(microCounts, ordinaryQuestions, requirement) {
  const misconceptionIds = unique(microCounts.flatMap((item) => item.misconceptionIds));
  return misconceptionIds.map((misconceptionId) => {
    const ordinaryQuestionCount = ordinaryQuestions.filter((question) => question.misconceptionId === misconceptionId).length;
    const requiredQuestionCount = requirement.minQuestionsPerMisconception;
    return {
      misconceptionId,
      ordinaryQuestionCount,
      requiredQuestionCount,
      coverageStatus: ordinaryQuestionCount >= requiredQuestionCount ? "diagnostic_ready" : "not_started",
    };
  });
}

function collectQuestions(questionGroups) {
  return questionGroups.flatMap(({ data }) => data.questions ?? []);
}

function collectLevelExperience(caseFiles) {
  return caseFiles.flatMap((caseFile) => caseFile.levels ?? []);
}

function collectBossExperience(questionGroups) {
  return questionGroups.flatMap(({ data }) => data.bossTask ? [data.bossTask] : []);
}

function isOrdinaryDiagnosticQuestion(question) {
  return question.levelId !== "reserve" && question.levelId !== "boss";
}

function questionMatchesMicro(question, micro) {
  if (question.microKnowledgePointId) return question.microKnowledgePointId === micro.microKnowledgePointId;
  return question.knowledgePointId === micro.knowledgePointId && (micro.skillIds ?? []).includes(question.skillId);
}

function levelMatchesMicro(level, micro) {
  return level.knowledgePointId === micro.knowledgePointId || (level.skillIds ?? []).some((skillId) => micro.skillIds?.includes(skillId));
}

function bossMatchesMicro(boss, micro) {
  return (boss.targetSkillIds ?? []).some((skillId) => micro.skillIds?.includes(skillId))
    || (boss.targetKnowledgePointIds ?? []).includes(micro.knowledgePointId);
}

function selectExpectedKnowledgePoints(planUnit, coverageDeclaration, knowledgeMap) {
  const planned = planUnit?.expectedKnowledgePoints ?? [];
  const declaredIds = new Set(coverageDeclaration?.expectedKnowledgePointIds ?? planned.map((item) => item.expectedKnowledgePointId));
  if (planned.length > 0) return planned.filter((item) => declaredIds.has(item.expectedKnowledgePointId));

  return (knowledgeMap.knowledgePoints ?? []).map((point) => ({
    expectedKnowledgePointId: point.knowledgePointId,
    knowledgePointId: point.knowledgePointId,
    unitId: "",
    lessonId: "",
    name: point.name,
    learningGoal: point.learningGoal,
    microKnowledgePointIds: point.skillIds ?? [],
    required: true,
    coverageStatus: "planned",
  }));
}

function selectMicroKnowledgePoints(planUnit, coverageDeclaration, expectedKnowledgePoints, knowledgeMap) {
  const planned = planUnit?.microKnowledgePoints ?? [];
  const declaredIds = new Set(coverageDeclaration?.expectedMicroKnowledgePointIds ?? planned.map((item) => item.microKnowledgePointId));
  if (planned.length > 0) return planned.filter((item) => declaredIds.has(item.microKnowledgePointId));

  const expectedByKnowledgePointId = new Map(expectedKnowledgePoints.map((item) => [item.knowledgePointId, item]));
  return (knowledgeMap.skills ?? []).map((skill) => {
    const expected = expectedByKnowledgePointId.get(skill.knowledgePointId);
    return {
      microKnowledgePointId: skill.skillId,
      expectedKnowledgePointId: expected?.expectedKnowledgePointId ?? skill.knowledgePointId,
      knowledgePointId: skill.knowledgePointId,
      unitId: expected?.unitId ?? "",
      lessonId: expected?.lessonId ?? "",
      name: skill.name,
      learningGoal: skill.learningGoal,
      skillIds: [skill.skillId],
      misconceptionIds: skill.misconceptionIds ?? [],
      recommendedQuestionTypes: [],
      required: true,
      diagnosticRequirement: DEFAULT_REQUIREMENT,
      coverageStatus: "planned",
    };
  });
}

function selectEntries(registry, options) {
  if (options.all) return registry.packages ?? [];
  if (options.contentPackageId) return (registry.packages ?? []).filter((item) => item.contentPackageId === options.contentPackageId);
  return (registry.packages ?? []).filter((item) => item.contentPackageId === registry.defaultContentPackageId);
}

function summarizePackages(packages) {
  const expectedMicroKnowledgePointCount = sum(packages, "expectedMicroKnowledgePointCount");
  const coveredMicroKnowledgePointCount = sum(packages, "coveredMicroKnowledgePointCount");
  const skillCount = packages.reduce((total, item) => total + item.skills.length, 0);
  const coveredSkillCount = packages.reduce((total, item) => total + item.skills.filter((skill) => skill.coverageStatus === "diagnostic_ready").length, 0);
  const misconceptionCount = packages.reduce((total, item) => total + item.misconceptions.length, 0);
  const coveredMisconceptionCount = packages.reduce(
    (total, item) => total + item.misconceptions.filter((misconception) => misconception.coverageStatus === "diagnostic_ready").length,
    0,
  );

  return {
    expectedKnowledgePointCount: sum(packages, "expectedKnowledgePointCount"),
    coveredKnowledgePointCount: sum(packages, "coveredKnowledgePointCount"),
    expectedMicroKnowledgePointCount,
    coveredMicroKnowledgePointCount,
    microKnowledgePointCoverageRate: rate(coveredMicroKnowledgePointCount, expectedMicroKnowledgePointCount),
    skillCount,
    coveredSkillCount,
    skillCoverageRate: rate(coveredSkillCount, skillCount),
    misconceptionCount,
    coveredMisconceptionCount,
    misconceptionCoverageRate: rate(coveredMisconceptionCount, misconceptionCount),
  };
}

function formatMicroGap(item) {
  return `${item.microKnowledgePointId} ${item.ordinaryQuestionCount}/${item.requiredQuestionCount}`;
}

function formatRate(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function rate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 1;
}

function sum(items, key) {
  return items.reduce((total, item) => total + item[key], 0);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}
