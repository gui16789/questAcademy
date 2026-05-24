import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const registry = JSON.parse(await readFile(new URL("../../../content/registry.json", import.meta.url), "utf8"));

test("content registry has exactly one default package", () => {
  assert.equal(registry.defaultContentPackageId, "math.bsd.g2.s2.unit-1-division");
  assert.equal(registry.packages.filter((entry) => entry.isDefault).length, 1);
  assert.equal(registry.packages.find((entry) => entry.isDefault).contentPackageId, registry.defaultContentPackageId);
});

test("math grade 2 semester 2 route registers all units in order", async () => {
  const entries = registry.packages.filter((item) => item.routeId === "math.bsd.g2.s2");
  assert.deepEqual(
    entries.map((entry) => entry.locationTitle),
    [
      "第一单元：除法",
      "第二单元：方向与位置",
      "第三单元：生活中的大数",
      "第四单元：测量",
      "第五单元：加与减",
      "第六单元：认识图形",
      "第七单元：时、分、秒",
      "第八单元：调查与记录",
    ],
  );
  assert.deepEqual(entries.map((entry) => entry.locationOrder), [1, 2, 3, 4, 5, 6, 7, 8]);

  for (const entry of entries) {
    assert.equal(entry.contentVersion, "0.1.0");
    assert.equal(entry.subjectId, "math");
    assert.equal(entry.courseTitle, "数学");
    assert.equal(entry.routeTitle, "北师大版二年级下册");
    assert.equal(entry.textbookVersionId, "bsd");
    assert.equal(entry.gradeId, "grade-2");
    assert.equal(entry.semesterId, "semester-2");
    assert.equal(entry.status, "draft");
    assert.equal(typeof entry.releaseNote, "string");
    assert.ok(entry.releaseNote.length > 0);
    await access(new URL(`../../../${entry.entryPath}/manifest.json`, import.meta.url));
  }
});
