import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { coverageDiagnostics, generateCoverageReport } from "./coverage-lib.mjs";
import { validateContentRegistry } from "./validate-content.mjs";

const rootDir = process.cwd();

test("registry validation passes for the committed registry", async () => {
  const result = await validateContentRegistry({ rootDir });
  assert.deepEqual(result.errors, []);
});

test("registry validation fails when an entryPath does not contain a manifest", async () => {
  const registryPath = await writeRegistry({
    schemaVersion: "0.1.0",
    registryVersion: "0.1.0",
    defaultContentPackageId: "missing.package",
    packages: [
      {
        contentPackageId: "missing.package",
        contentVersion: "0.1.0",
        title: "Missing",
        subjectId: "math",
        textbookVersionId: "bsd",
        gradeId: "grade-2",
        semesterId: "semester-2",
        unitId: "unit-1-division",
        defaultCaseId: "case-missing",
        status: "draft",
        entryPath: "content/missing/package",
        isDefault: true,
        releaseNote: "test",
      },
    ],
  });

  const result = await validateContentRegistry({ rootDir, registryPath });
  assert.ok(result.errors.some((error) => error.includes("entryPath does not contain manifest.json")));
});

test("registry validation fails when multiple packages are default", async () => {
  const entry = {
    contentVersion: "0.1.0",
    title: "Division",
    subjectId: "math",
    textbookVersionId: "bsd",
    gradeId: "grade-2",
    semesterId: "semester-2",
    unitId: "unit-1-division",
    defaultCaseId: "case-carrot-badge",
    status: "draft",
    entryPath: "content/math/bsd/grade-2/semester-2/unit-1-division",
    isDefault: true,
    releaseNote: "test",
  };
  const registryPath = await writeRegistry({
    schemaVersion: "0.1.0",
    registryVersion: "0.1.0",
    defaultContentPackageId: "math.bsd.g2.s2.unit-1-division",
    packages: [
      { ...entry, contentPackageId: "math.bsd.g2.s2.unit-1-division" },
      { ...entry, contentPackageId: "math.bsd.g2.s2.unit-1-division-copy" },
    ],
  });

  const result = await validateContentRegistry({ rootDir, registryPath });
  assert.ok(result.errors.some((error) => error.includes("expected exactly one default content package")));
});

test("coverage report separates ordinary, boss, and reserve questions", async () => {
  const report = await generateCoverageReport({
    rootDir,
    contentPackageId: "math.bsd.g2.s2.unit-1-division",
  });
  const [item] = report.packages;

  assert.equal(item.contentInventory.ordinaryQuestionCount, 16);
  assert.equal(item.contentInventory.bossQuestionCount, 2);
  assert.equal(item.contentInventory.reserveQuestionCount, 10);
  assert.ok(item.uncoveredMicroKnowledgePoints.some((micro) => micro.microKnowledgePointId === "mkp.word-problem.interpret-remainder"));
});

test("coverage gaps are warnings for draft and errors for published packages", async () => {
  const report = await generateCoverageReport({
    rootDir,
    contentPackageId: "math.bsd.g2.s2.unit-1-division",
  });
  const [item] = report.packages;

  assert.ok(coverageDiagnostics(item, "draft").every((diagnostic) => diagnostic.severity === "WARN"));
  assert.ok(coverageDiagnostics(item, "published").every((diagnostic) => diagnostic.severity === "ERROR"));
});

async function writeRegistry(registry) {
  const dir = await mkdtemp(path.join(tmpdir(), "quest-academy-registry-"));
  const file = path.join(dir, "registry.json");
  await writeFile(file, JSON.stringify(registry), "utf8");
  return file;
}
