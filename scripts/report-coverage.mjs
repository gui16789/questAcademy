import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatCoverageReport, generateCoverageReport } from "./coverage-lib.mjs";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") options.all = true;
    else if (arg === "--package") options.contentPackageId = argv[++index];
    else if (arg === "--registry") options.registryPath = argv[++index];
    else if (arg === "--json") options.json = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log("Usage: node scripts/report-coverage.mjs [--all] [--package <contentPackageId>] [--registry <path>] [--json]");
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    printHelp();
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    return;
  }

  const report = await generateCoverageReport(options);
  console.log(options.json ? JSON.stringify(report, null, 2) : formatCoverageReport(report));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
