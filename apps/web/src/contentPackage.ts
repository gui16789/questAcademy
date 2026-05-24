import type { ContentPackageRegistry, ContentPackageRegistryEntry } from "@quest-academy/content-schema";
import { createContentRuntime, loadContentPackage } from "@quest-academy/content-runtime";

import registryJson from "../../../content/registry.json";
import divisionBadges from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/badges.json";
import divisionKnowledgeCards from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/cards/knowledge-cards.json";
import divisionCaseCarrotBadge from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/cases/case-carrot-badge.json";
import divisionClues from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/clues.json";
import divisionKnowledgeMap from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/knowledge-map.json";
import divisionManifest from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/manifest.json";
import divisionBossCarrotBadgeFinal from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/boss-carrot-badge-final.json";
import divisionLevelAverageSharing from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/level-average-sharing.json";
import divisionLevelDivisionExpression from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/level-division-expression.json";
import divisionLevelRemainderRule from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/level-remainder-rule.json";
import divisionLevelWithRemainder from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/level-with-remainder.json";
import divisionReserve from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/questions/reserve.json";
import divisionReviewRules from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/review-rules.json";
import divisionTextbook from "../../../content/math/bsd/grade-2/semester-2/unit-1-division/textbook.json";
import directionBadges from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/badges.json";
import directionKnowledgeCards from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/cards/knowledge-cards.json";
import directionCaseLostParcel from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/cases/case-lost-parcel.json";
import directionClues from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/clues.json";
import directionKnowledgeMap from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/knowledge-map.json";
import directionManifest from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/manifest.json";
import directionBossLostParcelFinal from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/questions/boss-lost-parcel-final.json";
import directionLevelCardinalDirections from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/questions/level-cardinal-directions.json";
import directionLevelDiagonalDirections from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/questions/level-diagonal-directions.json";
import directionLevelMapPosition from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/questions/level-map-position.json";
import directionLevelRouteDescription from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/questions/level-route-description.json";
import directionReserve from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/questions/reserve.json";
import directionReviewRules from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/review-rules.json";
import directionTextbook from "../../../content/math/bsd/grade-2/semester-2/unit-2-direction-position/textbook.json";

const registry = registryJson as ContentPackageRegistry;

const bundledContentFilesByPackageId: Record<string, Record<string, unknown>> = {
  "math.bsd.g2.s2.unit-1-division": {
    "manifest.json": divisionManifest,
    "textbook.json": divisionTextbook,
    "knowledge-map.json": divisionKnowledgeMap,
    "cases/case-carrot-badge.json": divisionCaseCarrotBadge,
    "questions/level-average-sharing.json": divisionLevelAverageSharing,
    "questions/level-division-expression.json": divisionLevelDivisionExpression,
    "questions/level-with-remainder.json": divisionLevelWithRemainder,
    "questions/level-remainder-rule.json": divisionLevelRemainderRule,
    "questions/boss-carrot-badge-final.json": divisionBossCarrotBadgeFinal,
    "questions/reserve.json": divisionReserve,
    "cards/knowledge-cards.json": divisionKnowledgeCards,
    "clues.json": divisionClues,
    "badges.json": divisionBadges,
    "review-rules.json": divisionReviewRules,
  },
  "math.bsd.g2.s2.unit-2-direction-position": {
    "manifest.json": directionManifest,
    "textbook.json": directionTextbook,
    "knowledge-map.json": directionKnowledgeMap,
    "cases/case-lost-parcel.json": directionCaseLostParcel,
    "questions/level-cardinal-directions.json": directionLevelCardinalDirections,
    "questions/level-map-position.json": directionLevelMapPosition,
    "questions/level-diagonal-directions.json": directionLevelDiagonalDirections,
    "questions/level-route-description.json": directionLevelRouteDescription,
    "questions/boss-lost-parcel-final.json": directionBossLostParcelFinal,
    "questions/reserve.json": directionReserve,
    "cards/knowledge-cards.json": directionKnowledgeCards,
    "clues.json": directionClues,
    "badges.json": directionBadges,
    "review-rules.json": directionReviewRules,
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
