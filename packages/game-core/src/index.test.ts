import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { BadgesFile, BossQuestionGroupFile, CaseConfig, Question, ReviewRulesFile } from "@quest-academy/content-schema";

import {
  addWrongRecord,
  applyBossResult,
  applyLevelResult,
  awardBadges,
  buildReviewRoute,
  canStartBoss,
  checkAnswer,
  finishBoss,
  finishLevel,
  markWrongRecordSolved,
  selectLevelQuestions,
  type LearningProgress,
  updateMasteryRecords,
} from "./index.js";

const contentRoot = new URL("../../../content/math/bsd/grade-2/semester-2/unit-1-division/", import.meta.url);

async function readContentJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(fileURLToPath(new URL(relativePath, contentRoot)), "utf8")) as T;
}

async function loadFixtures() {
  const [caseConfig, levelAverage, reserveGroup, bossGroup, badgesFile, reviewRulesFile] = await Promise.all([
    readContentJson<CaseConfig>("cases/case-carrot-badge.json"),
    readContentJson<{ questions: Question[] }>("questions/level-average-sharing.json"),
    readContentJson<{ questions: Question[] }>("questions/reserve.json"),
    readContentJson<BossQuestionGroupFile>("questions/boss-carrot-badge-final.json"),
    readContentJson<BadgesFile>("badges.json"),
    readContentJson<ReviewRulesFile>("review-rules.json"),
  ]);

  return {
    caseConfig,
    level: caseConfig.levels[0],
    levelQuestions: levelAverage.questions,
    reserveQuestions: reserveGroup.questions,
    bossTask: bossGroup.bossTask,
    bossQuestions: bossGroup.questions,
    badges: badgesFile.badges,
    reviewRules: reviewRulesFile.reviewRules,
  };
}

test("checks answers with normalized text", async () => {
  const { levelQuestions } = await loadFixtures();
  const result = checkAnswer(levelQuestions[0], " 4。 ");

  assert.equal(result.isCorrect, true);
  assert.equal(result.questionId, "q1");
  assert.equal(result.skillId, "skill.average-sharing.calculate-each-share");
});

test("finishes a level using min_correct pass rule", async () => {
  const { level, levelQuestions } = await loadFixtures();
  const answerResults = [
    checkAnswer(levelQuestions[0], "4"),
    checkAnswer(levelQuestions[1], "对"),
    checkAnswer(levelQuestions[2], "4"),
    checkAnswer(levelQuestions[3], "3 枚、4 枚、5 枚"),
  ];

  const passed = finishLevel(level, answerResults);
  assert.equal(passed.isPassed, true);
  assert.equal(passed.correctCount, 3);
  assert.deepEqual(passed.unlockedClueIds, ["clue-average-sharing"]);

  const failed = finishLevel(level, answerResults.slice(0, 2));
  assert.equal(failed.isPassed, false);
});

test("applies level progress and unlocks boss only after all levels pass", async () => {
  const { caseConfig, level, levelQuestions } = await loadFixtures();
  const progress: LearningProgress = {
    passedLevelIds: [],
    unlockedClueIds: [],
    unlockedKnowledgeCardIds: [],
    bossUnlocked: false,
    caseClosed: false,
  };

  const levelResult = finishLevel(level, levelQuestions.map((question) => checkAnswer(question, question.answer)));
  const partial = applyLevelResult(progress, levelResult, caseConfig.levels);

  assert.deepEqual(partial.passedLevelIds, ["level-average-sharing"]);
  assert.equal(partial.bossUnlocked, false);
  assert.equal(canStartBoss({ passedLevelIds: caseConfig.levelIds }, caseConfig.levels), true);
});

test("finishes boss success and failure paths", async () => {
  const { bossTask, bossQuestions } = await loadFixtures();
  const successResults = bossQuestions.map((question) => checkAnswer(question, question.answer));
  const success = finishBoss(bossTask, successResults);

  assert.equal(success.isPassed, true);
  assert.deepEqual(success.failedStepIds, []);

  const failedResults = [checkAnswer(bossQuestions[0], bossQuestions[0].answer), checkAnswer(bossQuestions[1], "对")];
  const failed = finishBoss(bossTask, failedResults);

  assert.equal(failed.isPassed, false);
  assert.deepEqual(failed.failedStepIds, ["boss-step-2"]);
  assert.deepEqual(failed.fallbackKnowledgeCardIds, ["card-with-remainder", "card-remainder-rule", "card-division-word-problem"]);
  assert.equal(applyBossResult({ passedLevelIds: [], unlockedClueIds: [], unlockedKnowledgeCardIds: [], bossUnlocked: true, caseClosed: false }, success).caseClosed, true);
});

test("selects level questions that cover declared skills", async () => {
  const { level, levelQuestions } = await loadFixtures();
  const selected = selectLevelQuestions(level, levelQuestions);
  const selectedSkillIds = new Set(selected.map((question) => question.skillId));

  assert.equal(selected.length, 4);
  for (const skillId of level.skillIds) {
    assert.equal(selectedSkillIds.has(skillId), true);
  }
});

test("pulls supplemental questions for open weak skills", async () => {
  const { level, levelQuestions, reserveQuestions } = await loadFixtures();
  const selected = selectLevelQuestions(level, levelQuestions, {
    supplementalQuestions: reserveQuestions,
    wrongRecords: {
      old: {
        questionId: "old",
        levelId: level.levelId,
        stem: "",
        userAnswer: "",
        correctAnswer: "",
        knowledgePointId: "math.division.average-sharing",
        skillId: "skill.average-sharing.calculate-each-share",
        misconceptionId: "mis.average-sharing.wrong-share-count",
        explanation: "",
        wrongCount: 1,
        status: "open",
        firstWrongAt: "2026-05-27T00:00:00.000Z",
        lastWrongAt: "2026-05-27T00:00:00.000Z",
      },
    },
  });

  assert.equal(selected.some((question) => question.questionId === "r4"), true);
  assert.equal(selected.length, 4);
});

test("updates mastery records by knowledge point and skill", async () => {
  const { levelQuestions } = await loadFixtures();
  const practicedAt = "2026-05-27T00:00:00.000Z";
  const records = updateMasteryRecords(
    {},
    [checkAnswer(levelQuestions[0], levelQuestions[0].answer), checkAnswer(levelQuestions[1], "错")],
    practicedAt,
  );

  const knowledgeRecord = records["knowledgePoint:math.division.average-sharing"];
  const skillRecord = records["skill:skill.average-sharing.calculate-each-share"];

  assert.equal(knowledgeRecord.score, 50);
  assert.equal(knowledgeRecord.state, "unstable");
  assert.equal(skillRecord.score, 100);
  assert.equal(skillRecord.accuracy, 1);
  assert.equal(skillRecord.state, "learning");
  assert.equal(skillRecord.lastPracticedAt, practicedAt);
});

test("requires enough attempts before marking mastery as stable", async () => {
  const { levelQuestions } = await loadFixtures();
  const firstAttempt = updateMasteryRecords({}, [checkAnswer(levelQuestions[0], levelQuestions[0].answer)]);
  const afterThreeAttempts = updateMasteryRecords(firstAttempt, [
    checkAnswer(levelQuestions[0], levelQuestions[0].answer),
    checkAnswer(levelQuestions[0], levelQuestions[0].answer),
  ]);

  assert.equal(firstAttempt["skill:skill.average-sharing.calculate-each-share"].state, "learning");
  assert.equal(afterThreeAttempts["skill:skill.average-sharing.calculate-each-share"].state, "mastered");
});

test("records wrong answers and builds review route", async () => {
  const { levelQuestions, reviewRules } = await loadFixtures();
  const wrongResult = checkAnswer(levelQuestions[1], "错", "2026-05-22T00:00:00.000Z");

  const records = addWrongRecord({}, wrongResult);
  assert.equal(records.q2.wrongCount, 1);
  assert.equal(records.q2.status, "open");

  const solved = markWrongRecordSolved(records, "q2");
  assert.equal(solved.q2.status, "solved");

  const plan = buildReviewRoute(records.q2, reviewRules);
  assert.equal(plan?.reviewRuleId, "review-average-sharing-basic");
  assert.deepEqual(plan?.knowledgeCardIds, ["card-average-sharing"]);
});

test("awards badges from game events without duplicating non-repeatable records", async () => {
  const { badges } = await loadFixtures();
  const earnedAt = "2026-05-22T00:00:00.000Z";
  const rookie = awardBadges(badges, {}, { type: "first_level_passed", caseId: "case-carrot-badge", passedLevelIds: ["level-average-sharing"] }, earnedAt);
  assert.equal(Boolean(rookie["badge-rookie-detective"]), true);

  const collector = awardBadges(
    badges,
    rookie,
    {
      type: "all_clues_collected",
      caseId: "case-carrot-badge",
      unlockedClueIds: ["clue-average-sharing", "clue-division-expression", "clue-with-remainder", "clue-remainder-rule"],
    },
    earnedAt,
  );
  assert.equal(Boolean(collector["badge-clue-collector"]), true);

  const closed = awardBadges(badges, collector, { type: "case_closed", caseId: "case-carrot-badge" }, earnedAt);
  assert.equal(Boolean(closed["badge-case-closer"]), true);
  assert.equal(Object.keys(closed).length, 3);
});
