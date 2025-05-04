"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeSummaries = writeSummaries;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Write summary files for each entry, concatenating the entry and its dependencies.
 *
 * @param entryFiles - array of entry file paths as supplied (relative or absolute)
 * @param files - sorted array of all file paths (relative to rootDir)
 * @param rootDir - absolute path of project root
 * @param outDir - output directory (relative to rootDir)
 */
async function writeSummaries(entryFiles, files, rootDir, outDir) {
    const absOut = path_1.default.resolve(rootDir, outDir);
    await promises_1.default.mkdir(absOut, { recursive: true });
    // Helper: robust slugify using safe characters
    const safeSlug = (p) => p
        .split(path_1.default.sep)
        .join("_")
        .replace(/[^A-Za-z0-9_-]/g, "_");
    // Normalize separators to forward slash for headers
    const normalizePath = (p) => p.split(path_1.default.sep).join("/");
    // Helper to emit code block with header
    const emitCodeBlock = (lines, relPath, content) => {
        lines.push(`// ${normalizePath(relPath)}`);
        const ext = path_1.default.extname(relPath).toLowerCase();
        const lang = ext === ".ts" || ext === ".tsx" ? "ts" : "js";
        lines.push("```" + lang);
        lines.push(content);
        lines.push("```");
        lines.push("");
    };
    // Read all file contents in parallel
    const contentMap = new Map();
    await Promise.all(files.map(async (relPath) => {
        const absPath = path_1.default.resolve(rootDir, relPath);
        try {
            const content = await promises_1.default.readFile(absPath, "utf-8");
            contentMap.set(relPath, content);
        }
        catch (err) {
            console.warn(`⚠️  Unable to read ${relPath}: ${err.message}`);
        }
    }));
    // Generate summary for each entry file
    for (const entry of entryFiles) {
        const entryRel = path_1.default.relative(rootDir, path_1.default.resolve(rootDir, entry));
        const slug = safeSlug(entryRel);
        const outFile = path_1.default.join(absOut, `summary-${slug}.txt`);
        const lines = [];
        // Include the entry file first if available
        const entryContent = contentMap.get(entryRel);
        if (entryContent) {
            emitCodeBlock(lines, entryRel, entryContent);
        }
        else {
            console.warn(`⚠️  Entry file missing: ${entryRel}`);
        }
        // Include dependencies
        for (const relPath of files) {
            if (relPath === entryRel)
                continue;
            const depContent = contentMap.get(relPath);
            if (depContent) {
                emitCodeBlock(lines, relPath, depContent);
            }
        }
        // Write summary to disk
        try {
            await promises_1.default.writeFile(outFile, lines.join("\n"), "utf-8");
            console.log(`✔️  Created ${path_1.default.relative(rootDir, outFile)}`);
        }
        catch (err) {
            console.warn(`❌ Failed to write ${outFile}: ${err.message}`);
        }
    }
}
