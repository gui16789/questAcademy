import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const registry = JSON.parse(await readFile(new URL("../../../content/registry.json", import.meta.url), "utf8"));

test("content registry has exactly one default package", () => {
  assert.equal(registry.defaultContentPackageId, "math.bsd.g2.s2.unit-1-division");
  assert.equal(registry.packages.filter((entry) => entry.isDefault).length, 1);
  assert.equal(registry.packages.find((entry) => entry.isDefault).contentPackageId, registry.defaultContentPackageId);
});

test("current division content package registry metadata is complete", async () => {
  const entry = registry.packages.find((item) => item.contentPackageId === "math.bsd.g2.s2.unit-1-division");
  assert.ok(entry);
  assert.equal(entry.contentVersion, "0.1.0");
  assert.equal(entry.title, "北师大版二年级下册第一单元：除法");
  assert.equal(entry.subjectId, "math");
  assert.equal(entry.courseTitle, "数学");
  assert.equal(entry.routeTitle, "北师大版二年级下册");
  assert.equal(entry.textbookVersionId, "bsd");
  assert.equal(entry.gradeId, "grade-2");
  assert.equal(entry.semesterId, "semester-2");
  assert.equal(entry.unitId, "unit-1-division");
  assert.equal(entry.locationTitle, "第一单元：除法");
  assert.equal(entry.locationOrder, 1);
  assert.equal(entry.defaultCaseId, "case-carrot-badge");
  assert.equal(entry.status, "draft");
  assert.equal(entry.entryPath, "content/math/bsd/grade-2/semester-2/unit-1-division");
  assert.equal(typeof entry.releaseNote, "string");
  assert.ok(entry.releaseNote.length > 0);
  await access(new URL("../../../content/math/bsd/grade-2/semester-2/unit-1-division/manifest.json", import.meta.url));
});

test("direction and position content package registry metadata is complete", async () => {
  const entry = registry.packages.find((item) => item.contentPackageId === "math.bsd.g2.s2.unit-2-direction-position");
  assert.ok(entry);
  assert.equal(entry.contentVersion, "0.1.0");
  assert.equal(entry.title, "北师大版二年级下册第二单元：方向与位置");
  assert.equal(entry.subjectId, "math");
  assert.equal(entry.courseTitle, "数学");
  assert.equal(entry.routeTitle, "北师大版二年级下册");
  assert.equal(entry.textbookVersionId, "bsd");
  assert.equal(entry.gradeId, "grade-2");
  assert.equal(entry.semesterId, "semester-2");
  assert.equal(entry.unitId, "unit-2-direction-position");
  assert.equal(entry.locationTitle, "第二单元：方向与位置");
  assert.equal(entry.locationOrder, 2);
  assert.equal(entry.defaultCaseId, "case-lost-parcel");
  assert.equal(entry.status, "draft");
  assert.equal(entry.isDefault, false);
  assert.equal(entry.entryPath, "content/math/bsd/grade-2/semester-2/unit-2-direction-position");
  assert.equal(typeof entry.releaseNote, "string");
  assert.ok(entry.releaseNote.length > 0);
  await access(new URL("../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/manifest.json", import.meta.url));
});
