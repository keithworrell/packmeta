import fs from "fs/promises";
import path from "path";

/**
 * Write summary files for each entry, concatenating the entry and its dependencies.
 *
 * @param entryFiles - array of entry file paths as supplied (relative or absolute)
 * @param files - sorted array of all file paths (relative to rootDir)
 * @param rootDir - absolute path of project root
 * @param outDir - output directory (relative to rootDir)
 */
export async function writeSummaries(
  entryFiles: string[],
  files: string[],
  rootDir: string,
  outDir: string
): Promise<void> {
  const absOut = path.resolve(rootDir, outDir);
  await fs.mkdir(absOut, { recursive: true });

  // Helper: robust slugify using safe characters
  const safeSlug = (p: string) =>
    p
      .split(path.sep)
      .join("_")
      .replace(/[^A-Za-z0-9_-]/g, "_");

  // Normalize separators to forward slash for headers
  const normalizePath = (p: string) => p.split(path.sep).join("/");

  // Helper to emit code block with header
  const emitCodeBlock = (lines: string[], relPath: string, content: string) => {
    lines.push(`// ${normalizePath(relPath)}`);
    const ext = path.extname(relPath).toLowerCase();
    const lang = ext === ".ts" || ext === ".tsx" ? "ts" : "js";
    lines.push("```" + lang);
    lines.push(content);
    lines.push("```");
    lines.push("");
  };

  // Read all file contents in parallel
  const contentMap: Map<string, string> = new Map();
  await Promise.all(
    files.map(async (relPath) => {
      const absPath = path.resolve(rootDir, relPath);
      try {
        const content = await fs.readFile(absPath, "utf-8");
        contentMap.set(relPath, content);
      } catch (err: any) {
        console.warn(`⚠️  Unable to read ${relPath}: ${err.message}`);
      }
    })
  );

  // Generate summary for each entry file
  for (const entry of entryFiles) {
    const entryRel = path.relative(rootDir, path.resolve(rootDir, entry));
    const slug = safeSlug(entryRel);
    const outFile = path.join(absOut, `summary-${slug}.txt`);

    const lines: string[] = [];

    // Include the entry file first if available
    const entryContent = contentMap.get(entryRel);
    if (entryContent) {
      emitCodeBlock(lines, entryRel, entryContent);
    } else {
      console.warn(`⚠️  Entry file missing: ${entryRel}`);
    }

    // Include dependencies
    for (const relPath of files) {
      if (relPath === entryRel) continue;
      const depContent = contentMap.get(relPath);
      if (depContent) {
        emitCodeBlock(lines, relPath, depContent);
      }
    }

    // Write summary to disk
    try {
      await fs.writeFile(outFile, lines.join("\n"), "utf-8");
      console.log(`✔️  Created ${path.relative(rootDir, outFile)}`);
    } catch (err: any) {
      console.warn(`❌ Failed to write ${outFile}: ${err.message}`);
    }
  }
}
