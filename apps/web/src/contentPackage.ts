import type { ContentPackageRegistry, ContentPackageRegistryEntry } from "@quest-academy/content-schema";
import { createContentRuntime, loadContentPackage } from "@quest-academy/content-runtime";

import registryJson from "../../../content/registry.json";
import badges from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/badges.json";
import knowledgeCards from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/cards/knowledge-cards.json";
import caseCarrotBadge from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/cases/case-carrot-badge.json";
import clues from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/clues.json";
import knowledgeMap from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/knowledge-map.json";
import manifest from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/manifest.json";
import bossCarrotBadgeFinal from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/boss-carrot-badge-final.json";
import levelAverageSharing from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/level-average-sharing.json";
import levelDivisionExpression from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/level-division-expression.json";
import levelRemainderRule from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/level-remainder-rule.json";
import levelWithRemainder from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/level-with-remainder.json";
import reserve from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/reserve.json";
import reviewRules from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/review-rules.json";
import textbook from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/textbook.json";

const registry = registryJson as ContentPackageRegistry;

const bundledContentFilesByPackageId: Record<string, Record<string, unknown>> = {
  "math.bsd.g2.s2.unit-1-division": {
    "manifest.json": manifest,
    "textbook.json": textbook,
    "knowledge-map.json": knowledgeMap,
    "cases/case-carrot-badge.json": caseCarrotBadge,
    "questions/level-average-sharing.json": levelAverageSharing,
    "questions/level-division-expression.json": levelDivisionExpression,
    "questions/level-with-remainder.json": levelWithRemainder,
    "questions/level-remainder-rule.json": levelRemainderRule,
    "questions/boss-carrot-badge-final.json": bossCarrotBadgeFinal,
    "questions/reserve.json": reserve,
    "cards/knowledge-cards.json": knowledgeCards,
    "clues.json": clues,
    "badges.json": badges,
    "review-rules.json": reviewRules,
  },
};

export function getBundledContentRegistry(): ContentPackageRegistry {
  return registry;
}

export function getBundledContentPackageEntry(contentPackageId = registry.defaultContentPackageId): ContentPackageRegistryEntry {
  const entry = registry.packages.find((item) => item.contentPackageId === contentPackageId);
  if (!entry) throw new Error(`Unknown bundled content package: ${contentPackageId}`);
  return entry;
}

export async function loadBundledContentRuntime(contentPackageId = registry.defaultContentPackageId) {
  const entry = getBundledContentPackageEntry(contentPackageId);
  const contentFiles = bundledContentFilesByPackageId[entry.contentPackageId];
  if (!contentFiles) throw new Error(`Bundled content files are not registered for package: ${entry.contentPackageId}`);

  const contentPackage = await loadContentPackage(entry.entryPath, {
    loadJson: async (path) => {
      const normalizedPath = normalizeContentPath(path, entry.entryPath);
      const file = contentFiles[normalizedPath];
      if (!file) throw new Error(`Unknown bundled content file: ${entry.contentPackageId}/${normalizedPath}`);
      return file;
    },
  });

  return createContentRuntime(contentPackage);
}

function normalizeContentPath(requestPath: string, entryPath: string): string {
  return requestPath
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${escapeRegExp(entryPath.replace(/^\/+|\/+$/g, ""))}/`), "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
