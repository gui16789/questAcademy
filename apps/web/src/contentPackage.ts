/// <reference types="vite/client" />

import type { ContentPackageRegistry, ContentPackageRegistryEntry } from "@quest-academy/content-schema";
import { createContentRuntime, loadContentPackage } from "@quest-academy/content-runtime";

import registryJson from "../../../content/registry.json";

const bundledContentFileLoadersByPath = import.meta.glob("../../../content/math/**/*.json", {
  import: "default",
}) as Record<string, () => Promise<unknown>>;
const registry = registryJson as ContentPackageRegistry;

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

  const contentPackage = await loadContentPackage(entry.entryPath, {
    loadJson: async (path) => {
      const normalizedPath = normalizeContentPath(path);
      const file = await getBundledJson(normalizedPath);
      if (!file) throw new Error(`Unknown bundled content file: ${entry.contentPackageId}/${normalizedPath}`);
      return file;
    },
  });

  return createContentRuntime(contentPackage);
}

async function getBundledJson(path: string): Promise<unknown> {
  const loader = bundledContentFileLoadersByPath[`../../../${normalizeContentPath(path)}`];
  return loader ? loader() : null;
}

function normalizeContentPath(requestPath: string): string {
  return requestPath
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
}
