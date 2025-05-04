"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeSummary = writeSummary;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Write a single summary file (or JSON manifest) for the given entries and files.
 * If estimateTokens is set, logs an approximate token count based on output length.
 */
async function writeSummary(entryFiles, files, rootDir, outFile, options) {
    const { json, dryRun, estimateTokens, verbose, quiet } = options;
    const log = (...msgs) => {
        if (!quiet)
            console.log(...msgs);
    };
    const debug = (...msgs) => {
        if (verbose && !quiet)
            console.log(...msgs);
    };
    debug("Reading files for summary...");
    const contentMap = new Map();
    await Promise.all(files.map(async (relPath) => {
        const absPath = path_1.default.resolve(rootDir, relPath);
        try {
            const content = await promises_1.default.readFile(absPath, "utf-8");
            contentMap.set(relPath, content);
        }
        catch (err) {
            log(`⚠️  Unable to read ${relPath}: ${err.message}`);
        }
    }));
    let outData;
    if (json) {
        const manifest = files.map((rel) => ({
            path: rel,
            content: contentMap.get(rel) || "",
        }));
        outData = JSON.stringify(manifest, null, 2);
    }
    else {
        const lines = [];
        lines.push(`// Entries: ${entryFiles.map((e) => e.replace(/\\/g, "/")).join(", ")}`);
        lines.push("");
        for (const relPath of files) {
            const content = contentMap.get(relPath);
            if (!content)
                continue;
            lines.push(`// ${relPath.replace(/\\/g, "/")}`);
            const ext = path_1.default.extname(relPath).toLowerCase();
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
        await promises_1.default.writeFile(outFile, outData, "utf-8");
    }
}
