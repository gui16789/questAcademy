import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { validateContentPackage, validateContentRegistry } from "./validate-content.mjs";

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

test("package validation fails when a level declares an uncovered skill", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "quest-academy-package-"));
  const contentRoot = path.join("content", "math", "bsd", "grade-2", "semester-2", "unit-1-division");
  const sourceRoot = path.join(rootDir, contentRoot);
  const packageRoot = path.join(dir, contentRoot);
  await cp(sourceRoot, packageRoot, { recursive: true });

  const caseFile = path.join(packageRoot, "cases", "case-carrot-badge.json");
  const caseData = JSON.parse(await readFile(caseFile, "utf8"));
  caseData.levels[0].skillIds.push("skill.expression.map-story-to-expression");
  await writeFile(caseFile, JSON.stringify(caseData), "utf8");

  const errors = await validateContentPackage(contentRoot, { rootDir: dir });
  assert.ok(errors.some((error) => error.includes("expected at least 1 level question covering declared skillId skill.expression.map-story-to-expression")));
});

async function writeRegistry(registry) {
  const dir = await mkdtemp(path.join(tmpdir(), "quest-academy-registry-"));
  const file = path.join(dir, "registry.json");
  await writeFile(file, JSON.stringify(registry), "utf8");
  return file;
}
