import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const rootDir = process.cwd();
const appUrl = "http://127.0.0.1:5173/";
const cdpPort = 9223;
const storageKey = "animalDetectiveCityMvp";
const contentBase = path.join(rootDir, "content", "math", "bsd", "grade-2", "semester-2", "unit-1-division");

const devServer = spawn(commandName("npm"), ["run", "dev", "--workspace", "@quest-academy/web", "--", "--port", "5173"], {
  cwd: rootDir,
  stdio: "ignore",
  shell: process.platform === "win32",
});

const chromeProfile = mkdtempSync(path.join(tmpdir(), "quest-academy-chrome-"));
let chrome;
let client;

try {
  await waitForHttp(appUrl, 30_000);
  chrome = spawn(findChromePath(), [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${chromeProfile}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    appUrl,
  ], { stdio: "ignore" });
  await waitForHttp(`http://127.0.0.1:${cdpPort}/json/version`, 30_000);

  client = await CDP({ port: cdpPort });
  await runRegression(client, await loadQuestions());
  console.log("Regression smoke passed.");
} finally {
  if (client) await client.close().catch(() => {});
  if (chrome) await killProcessTree(chrome);
  await killProcessTree(devServer);
  await removeWithRetry(chromeProfile);
}

async function runRegression(cdpClient, content) {
  const { Page, Runtime, Emulation } = cdpClient;
  const exceptions = [];
  Runtime.exceptionThrown((event) => exceptions.push(event));
  await Promise.all([Page.enable(), Runtime.enable()]);

  const evalJs = async (expression) => {
    const result = await Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitForText = async (text, timeout = 5_000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evalJs(`document.body.innerText.includes(${JSON.stringify(text)})`)) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for text: ${text}`);
  };
  const clickByText = async (text, selector = "button") => {
    const ok = await evalJs(`(() => {
      const items = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const el = items.find((item) => item.innerText.trim() === ${JSON.stringify(text)} || item.innerText.includes(${JSON.stringify(text)}));
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!ok) throw new Error(`Could not click "${text}" in ${selector}`);
    await sleep(80);
  };
  const answerQuestion = async (question) => {
    if (question.questionType === "fill") {
      for (const digit of question.answer) await clickByText(digit, ".number-key");
    } else {
      await clickByText(question.answer, ".option");
    }
    await clickByText("提交答案");
  };

  await Emulation.setDeviceMetricsOverride({ width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
  await Page.navigate({ url: appUrl });
  await sleep(500);
  await evalJs(`localStorage.removeItem(${JSON.stringify(storageKey)})`);
  await Page.navigate({ url: appUrl });
  await waitForText("开始调查");
  await clickByText("开始调查");
  await waitForText("欢迎，小侦探");
  await clickByText("查看案件");
  await waitForText("关卡记录");
  await clickByText("开始调查");

  for (const [levelIndex, level] of content.levels.entries()) {
    await waitForText(`第 1/${level.questions.length} 题`);
    for (const [questionIndex, question] of level.questions.entries()) {
      await answerQuestion(question);
      await waitForText(question.explanation);
      await clickByText(questionIndex + 1 === level.questions.length ? "查看结果" : "下一题");
    }
    await waitForText("你获得了一条新线索");
    await clickByText(levelIndex + 1 === content.levels.length ? "挑战 Boss" : "继续下一关");
  }

  await waitForText("Boss 综合推理");
  for (const [questionIndex, question] of content.bossQuestions.entries()) {
    await answerQuestion(question);
    await waitForText(question.explanation);
    await clickByText(questionIndex + 1 === content.bossQuestions.length ? "查看结果" : "下一题");
  }
  await waitForText("真相：徽章没有丢");

  const fullFlowState = await evalJs(`(() => {
    const data = JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}));
    return {
      dataVersion: data.dataVersion,
      passed: data.progress.passedLevelIds.length,
      clues: data.progress.unlockedClueIds.length,
      cards: data.progress.unlockedKnowledgeCardIds.length,
      bossUnlocked: data.progress.bossUnlocked,
      caseClosed: data.progress.caseClosed,
      badges: Object.keys(data.badgeRecords).length
    };
  })()`);
  assert(fullFlowState.dataVersion === "1.0.0", "new data is saved as v1.0.0");
  assert(fullFlowState.passed === 4 && fullFlowState.clues === 4 && fullFlowState.cards === 4, "4 levels unlock clues and cards");
  assert(fullFlowState.bossUnlocked && fullFlowState.caseClosed, "boss is unlocked and case is closed");

  await evalJs(`localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(createLegacyState()))})`);
  await Page.navigate({ url: appUrl });
  await waitForText("欢迎，旧侦探");
  const migratedState = await evalJs(`(() => {
    const data = JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}));
    return {
      dataVersion: data.dataVersion,
      migratedFromDataVersion: data.migratedFromDataVersion,
      passedLevelId: data.progress.passedLevelIds[0],
      clueId: data.progress.unlockedClueIds[0],
      cardId: data.progress.unlockedKnowledgeCardIds[0],
      wrongCorrectAnswer: data.wrongRecords.q2.correctAnswer,
      wrongCount: data.wrongRecords.q2.wrongCount,
      badgeId: Object.keys(data.badgeRecords)[0]
    };
  })()`);
  assert(migratedState.dataVersion === "1.0.0" && migratedState.migratedFromDataVersion === "0.2.0", "legacy data migrates to v1.0.0");
  assert(migratedState.passedLevelId === "level-average-sharing", "legacy level id is mapped");
  assert(migratedState.clueId === "clue-average-sharing" && migratedState.cardId === "card-average-sharing", "legacy clue unlock maps to content ids");
  assert(migratedState.wrongCorrectAnswer === "对" && migratedState.wrongCount === 2, "legacy wrong question is preserved");
  assert(migratedState.badgeId === "badge-rookie-detective", "legacy badge is preserved");

  await Page.navigate({ url: appUrl });
  await waitForText("欢迎，旧侦探");
  await Emulation.setDeviceMetricsOverride({ width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
  await Page.navigate({ url: appUrl });
  await waitForText("欢迎，旧侦探");
  const mobile = await evalJs(`({ scrollWidth: document.documentElement.scrollWidth, innerWidth, hasNav: document.querySelectorAll('.quick-nav button').length === 4 })`);
  assert(mobile.scrollWidth <= mobile.innerWidth, "320px viewport has no horizontal overflow");
  assert(mobile.hasNav, "mobile navigation is available");
  assert(exceptions.length === 0, "no browser runtime exceptions");
}

async function loadQuestions() {
  const manifest = await readJson(path.join(contentBase, "manifest.json"));
  const questionGroups = await Promise.all(manifest.files.questions.map((file) => readJson(path.join(contentBase, file))));
  const levelGroups = questionGroups.filter((group) => "levelId" in group && group.levelId !== "reserve" && !("bossTask" in group));
  const bossGroup = questionGroups.find((group) => "bossTask" in group);
  return {
    levels: levelGroups.map((group) => ({ levelId: group.levelId, questions: group.questions })),
    bossQuestions: bossGroup.questions,
  };
}

function createLegacyState() {
  return {
    dataVersion: "0.2.0",
    contentPackageId: "math.bsd.g2.s2.unit-1-division",
    contentVersion: "0.1.0",
    user: {
      id: "legacy-user",
      nickname: "旧侦探",
      avatar: "🦊",
      started: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastLoginAt: "2026-01-02T00:00:00.000Z",
    },
    progress: {
      caseId: "case-carrot-badge",
      currentLevel: "level-2",
      passedLevels: ["level-1"],
      clues: ["level-1"],
      bossUnlocked: false,
      caseClosed: false,
    },
    answerRecords: [{ questionId: "q1", userAnswer: "4", isCorrect: true }],
    wrongQuestions: {
      q2: {
        questionId: "q2",
        levelId: "level-1",
        stem: "把 10 枚徽章分成 5 份，每份 2 枚，这是平均分。",
        userAnswer: "错",
        answer: "对",
        knowledgePoint: "平均分",
        explanation: "每份都是 2 枚，所以是平均分。",
        errorCount: 2,
        lastWrongAt: "2026-01-03T00:00:00.000Z",
        status: "open",
      },
    },
    badges: {
      rookie: {
        badgeId: "rookie",
        contentBadgeId: "badge-rookie-detective",
        name: "新手小侦探",
        earnedAt: "2026-01-04T00:00:00.000Z",
        reason: "完成第一个普通关卡。",
        caseId: "case-carrot-badge",
      },
    },
  };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function waitForHttp(url, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function findChromePath() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  const chromePath = candidates.find((candidate) => existsSync(candidate));
  if (!chromePath) throw new Error("Chrome not found. Set CHROME_PATH to run regression smoke.");
  return chromePath;
}

function commandName(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForExit(childProcess, timeout) {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout);
    childProcess.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function killProcessTree(childProcess) {
  if (!childProcess || childProcess.exitCode !== null || childProcess.signalCode !== null) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(childProcess.pid), "/T", "/F"], { stdio: "ignore" });
      killer.once("exit", resolve);
      killer.once("error", resolve);
    });
    await waitForExit(childProcess, 2_000);
    return;
  }
  childProcess.kill("SIGTERM");
  await waitForExit(childProcess, 2_000);
}

async function removeWithRetry(targetPath) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      rmSync(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(250);
    }
  }
}
