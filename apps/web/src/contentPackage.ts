import { createContentRuntime, loadContentPackage } from "@quest-academy/content-runtime";

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

const contentFiles: Record<string, unknown> = {
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
};

export async function loadBundledContentRuntime() {
  const contentPackage = await loadContentPackage("", {
    loadJson: async (path) => {
      const normalizedPath = path.replace(/^\/+/, "");
      const file = contentFiles[normalizedPath];
      if (!file) throw new Error(`Unknown bundled content file: ${normalizedPath}`);
      return file;
    },
  });

  return createContentRuntime(contentPackage);
}
