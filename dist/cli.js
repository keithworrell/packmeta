#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
const resolver_1 = require("./resolver");
const writer_1 = require("./writer");
const structure_1 = require("./structure");
const program = new commander_1.Command();
program
    .name("packmeta")
    .description("Collect and concatenate source files and their imports into a single summary file, or traverse project structure when no files supplied.")
    .version("0.1.0")
    .argument("[files...]", "Entry file(s), optionally with depth as last argument")
    .option("-d, --depth <number>", "Recursive import depth")
    .option("-c, --config <path>", "Path to config file", ".packmetarc.json")
    .option("-o, --out-dir <dir>", "Output directory")
    .option("--include-pattern <pattern>", "Include only files whose relative paths match this substring; may be specified multiple times", (val, acc) => {
    acc.push(val);
    return acc;
}, [])
    .option("--exclude-pattern <pattern>", "Exclude files whose relative paths match this substring; may be specified multiple times", (val, acc) => {
    acc.push(val);
    return acc;
}, [])
    .option("--extensions <list>", "Comma-separated list of extensions to include (e.g. .js,.ts,.tsx)")
    .option("-f, --output-file <file>", "Write output to this single file")
    .option("--json", "Emit a JSON manifest instead of code fences")
    .option("--dry-run", "Simulate actions without writing files")
    .option("-e, --estimate-tokens", "Estimate token count of the output")
    .option("-v, --verbose", "Enable verbose logging")
    .option("-q, --quiet", "Suppress non-error output")
    .parse(process.argv);
const args = program.args;
const opts = program.opts();
// Load user config and override with CLI flags
const userConfig = (0, config_1.loadConfig)(opts.config);
let depth = userConfig.defaultDepth;
let entryFiles = args;
// Depth override via flag or last numeric arg
if (opts.depth) {
    depth = parseInt(opts.depth, 10);
}
const lastArg = args[args.length - 1];
if (!opts.depth && !isNaN(Number(lastArg)) && args.length > 1) {
    depth = parseInt(lastArg, 10);
    entryFiles = args.slice(0, -1);
}
const rootDir = process.cwd();
const extensions = opts.extensions
    ? opts.extensions.split(",").map((e) => e.trim())
    : userConfig.extensions;
const excludeGlobs = userConfig.exclude;
const includePatterns = opts.includePattern;
const excludePatterns = opts.excludePattern;
const outDir = opts.outDir || userConfig.outDir;
// Logging helpers
const log = (...msgs) => {
    if (!opts.quiet)
        console.log(...msgs);
};
const debug = (...msgs) => {
    if (opts.verbose && !opts.quiet)
        console.log(...msgs);
};
(async () => {
    try {
        // Project‐structure mode
        if (entryFiles.length === 0) {
            log(chalk_1.default.green("No entry files — generating project structure..."));
            const treeLines = await (0, structure_1.buildProjectTree)(rootDir, excludeGlobs);
            const absOut = path_1.default.resolve(rootDir, outDir);
            if (!opts.dryRun)
                await promises_1.default.mkdir(absOut, { recursive: true });
            const structFile = path_1.default.join(absOut, "project-structure.txt");
            if (!opts.dryRun)
                await promises_1.default.writeFile(structFile, treeLines.join("\n"), "utf-8");
            log(chalk_1.default.blue(`✔️  Created ${path_1.default.relative(rootDir, structFile)}`));
            process.exit(0);
        }
        debug("Parameters:", {
            entryFiles,
            depth,
            outDir,
            extensions,
            excludeGlobs,
            includePatterns,
            excludePatterns,
            opts,
        });
        log(chalk_1.default.green("Resolving dependencies..."));
        const depsSet = await (0, resolver_1.collectDependencies)(entryFiles, {
            extensions,
            excludeGlobs: excludeGlobs.concat(excludePatterns),
            rootDir,
            maxDepth: depth,
        });
        let files = Array.from(depsSet).map((f) => path_1.default.relative(rootDir, f));
        files.sort();
        debug("Discovered files:", files);
        // Filters
        if (includePatterns.length) {
            files = files.filter((rel) => includePatterns.some((pat) => rel.includes(pat)));
            log(chalk_1.default.yellow("Included patterns filter:"), files);
        }
        if (excludePatterns.length) {
            files = files.filter((rel) => !excludePatterns.some((pat) => rel.includes(pat)));
            log(chalk_1.default.yellow("Exclude patterns filter:"), files);
        }
        // Determine single output file
        let outFile;
        if (opts.outputFile) {
            outFile = path_1.default.resolve(rootDir, opts.outputFile);
        }
        else {
            const slug = entryFiles
                .map((f) => path_1.default.relative(rootDir, f).replace(/[/\\]/g, "_"))
                .join("+");
            outFile = path_1.default.join(path_1.default.resolve(rootDir, outDir), `summary-${slug}.txt`);
        }
        debug("Output file:", outFile);
        if (!opts.dryRun)
            await promises_1.default.mkdir(path_1.default.dirname(outFile), { recursive: true });
        await (0, writer_1.writeSummary)(entryFiles, files, rootDir, outFile, {
            json: !!opts.json,
            dryRun: !!opts.dryRun,
            estimateTokens: !!opts.estimateTokens,
            verbose: !!opts.verbose,
            quiet: !!opts.quiet,
        });
        log(chalk_1.default.green(`✔️  Written summary to ${path_1.default.relative(rootDir, outFile)}`));
    }
    catch (err) {
        console.error(chalk_1.default.red("Error:"), err.message || err);
        process.exit(1);
    }
})();
