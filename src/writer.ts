import fs from "fs/promises";
import path from "path";

/** Options for writeSummary */
export interface WriteOptions {
  json: boolean;
  dryRun: boolean;
  estimateTokens: boolean;
  verbose: boolean;
  quiet: boolean;
}

/**
 * Write a single summary file (or JSON manifest) for the given entries and files.
 * If estimateTokens is set, logs an approximate token count based on output length.
 */
export async function writeSummary(
  entryFiles: string[],
  files: string[],
  rootDir: string,
  outFile: string,
  options: WriteOptions
): Promise<void> {
  const { json, dryRun, estimateTokens, verbose, quiet } = options;
  const log = (...msgs: any[]) => {
    if (!quiet) console.log(...msgs);
  };
  const debug = (...msgs: any[]) => {
    if (verbose && !quiet) console.log(...msgs);
  };

  debug("Reading files for summary...");
  const contentMap: Map<string, string> = new Map();
  await Promise.all(
    files.map(async (relPath) => {
      const absPath = path.resolve(rootDir, relPath);
      try {
        const content = await fs.readFile(absPath, "utf-8");
        contentMap.set(relPath, content);
      } catch (err: any) {
        log(`⚠️  Unable to read ${relPath}: ${err.message}`);
      }
    })
  );

  let outData: string;

  if (json) {
    const manifest = files.map((rel) => ({
      path: rel,
      content: contentMap.get(rel) || "",
    }));
    outData = JSON.stringify(manifest, null, 2);
  } else {
    const lines: string[] = [];
    lines.push(
      `// Entries: ${entryFiles.map((e) => e.replace(/\\/g, "/")).join(", ")}`
    );
    lines.push("");
    for (const relPath of files) {
      const content = contentMap.get(relPath);
      if (!content) continue;
      lines.push(`// ${relPath.replace(/\\/g, "/")}`);
      const ext = path.extname(relPath).toLowerCase();
      const lang = ext === ".ts" || ext === ".tsx" ? "ts" : "js";
      lines.push(`\`\`\`${lang}`);
      lines.push(content);
      lines.push("```");
      lines.push("");
    }
    outData = lines.join("\n");
  }

  if (estimateTokens) {
    // Rough estimate: 4 chars per token
    const charCount = outData.length;
    const tokenEstimate = Math.ceil(charCount / 4);
    log(`ℹ️  Estimated tokens: ${tokenEstimate}`);
  }

  debug("Generated output data length:", outData.length);
  if (!dryRun) {
    await fs.writeFile(outFile, outData, "utf-8");
  }
}
