import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createContentRuntime, loadContentPackage, type JsonLoader } from "./index.js";

const contentRoot = new URL("../../../content/math/bsd/grade-2/semester-2/unit-1-division/", import.meta.url);

const loadJsonFromContentRoot: JsonLoader = async (requestPath) => {
  const relativePath = requestPath.replace(/^content\/math\/bsd\/grade-2\/semester-2\/unit-1-division\//, "");
  const fileUrl = new URL(relativePath, contentRoot);
  return JSON.parse(await readFile(fileURLToPath(fileUrl), "utf8"));
};

test("loads the current division content package", async () => {
  const contentPackage = await loadContentPackage("content/math/bsd/grade-2/semester-2/unit-1-division", {
    loadJson: loadJsonFromContentRoot,
  });

  assert.equal(contentPackage.manifest.contentPackageId, "math.bsd.g2.s2.unit-1-division");
  assert.equal(contentPackage.textbook.curriculumNodes.length, 4);
  assert.equal(contentPackage.knowledgeMap.knowledgePoints.length, 5);
  assert.equal(contentPackage.cases.length, 1);
  assert.equal(contentPackage.questionGroups.flatMap((group) => group.questions).length, 28);
});

test("queries case, levels, questions, boss, cards, clues, badges, and review rules", async () => {
  const contentPackage = await loadContentPackage("content/math/bsd/grade-2/semester-2/unit-1-division", {
    loadJson: loadJsonFromContentRoot,
  });
  const runtime = createContentRuntime(contentPackage);

  assert.equal(runtime.getManifest().defaultCaseId, "case-carrot-badge");
  assert.equal(runtime.getCase().caseId, "case-carrot-badge");
  assert.equal(runtime.getLevels().length, 4);
  assert.equal(runtime.getLevel("level-average-sharing").legacyRuntimeId, "level-1");
  assert.equal(runtime.getQuestionsByLevel("level-average-sharing").length, 4);
  assert.equal(runtime.getReserveQuestions().length, 10);
  assert.equal(runtime.getBossTask().steps.length, 2);
  assert.equal(runtime.getKnowledgeCards().length, 5);
  assert.equal(runtime.getKnowledgeCard("card-remainder-rule").knowledgePointId, "math.division.remainder-rule");
  assert.equal(runtime.getKnowledgeCard("card-division-word-problem").knowledgePointId, "math.division.word-problem");
  assert.equal(runtime.getClues().length, 4);
  assert.equal(runtime.getClue("clue-with-remainder").levelId, "level-with-remainder");
  assert.equal(runtime.getBadges().length, 5);
  assert.equal(runtime.getBadge("badge-case-closer").triggerRule.type, "case_closed");
  assert.equal(runtime.getReviewRules().length, 5);
  assert.equal(runtime.getReviewRule("review-remainder-rule-basic").skillId, "skill.remainder.compare-with-divisor");
  assert.equal(runtime.getReviewRule("review-division-word-problem-basic").skillId, "skill.word-problem.interpret-remainder");
  assert.equal(runtime.getKnowledgePoint("math.division.word-problem").shortName, "除法实际问题");
  assert.equal(runtime.getSkill("skill.remainder.calculate").knowledgePointId, "math.division.with-remainder");
});

test("supports file URL style paths through a custom loader", async () => {
  const loadJson: JsonLoader = async (requestPath) => {
    const fileUrl = new URL(requestPath, pathToFileURL(`${fileURLToPath(contentRoot)}/`));
    return JSON.parse(await readFile(fileURLToPath(fileUrl), "utf8"));
  };

  const contentPackage = await loadContentPackage("", { loadJson });
  assert.equal(createContentRuntime(contentPackage).getLevels().length, 4);
});
