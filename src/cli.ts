#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs/promises";
import chalk from "chalk";
import { loadConfig } from "./config";
import { collectDependencies } from "./resolver";
import { writeSummary } from "./writer";
import { buildProjectTree } from "./structure";

const program = new Command();
program
  .name("packmeta")
  .description(
    "Collect and concatenate source files and their imports into a single summary file, or traverse project structure when no files supplied."
  )
  .version("0.1.0")
  .argument(
    "[files...]",
    "Entry file(s), optionally with depth as last argument"
  )
  .option("-d, --depth <number>", "Recursive import depth")
  .option("-c, --config <path>", "Path to config file", ".packmetarc.json")
  .option("-o, --out-dir <dir>", "Output directory")
  .option(
    "--include-pattern <pattern>",
    "Include only files whose relative paths match this substring; may be specified multiple times",
    (val: string, acc: string[]) => {
      acc.push(val);
      return acc;
    },
    []
  )
  .option(
    "--exclude-pattern <pattern>",
    "Exclude files whose relative paths match this substring; may be specified multiple times",
    (val: string, acc: string[]) => {
      acc.push(val);
      return acc;
    },
    []
  )
  .option(
    "--extensions <list>",
    "Comma-separated list of extensions to include (e.g. .js,.ts,.tsx)"
  )
  .option("-f, --output-file <file>", "Write output to this single file")
  .option("--json", "Emit a JSON manifest instead of code fences")
  .option("--dry-run", "Simulate actions without writing files")
  .option("-e, --estimate-tokens", "Estimate token count of the output")
  .option("-v, --verbose", "Enable verbose logging")
  .option("-q, --quiet", "Suppress non-error output")
  .parse(process.argv);

const args = program.args as string[];
const opts = program.opts() as {
  depth?: string;
  config?: string;
  outDir?: string;
  includePattern: string[];
  excludePattern: string[];
  extensions?: string;
  outputFile?: string;
  json?: boolean;
  dryRun?: boolean;
  estimateTokens?: boolean;
  verbose?: boolean;
  quiet?: boolean;
};

// Load user config and override with CLI flags
const userConfig = loadConfig(opts.config);
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
const log = (...msgs: any[]) => {
  if (!opts.quiet) console.log(...msgs);
};
const debug = (...msgs: any[]) => {
  if (opts.verbose && !opts.quiet) console.log(...msgs);
};

(async () => {
  try {
    // Project‐structure mode
    if (entryFiles.length === 0) {
      log(chalk.green("No entry files — generating project structure..."));
      const treeLines = await buildProjectTree(rootDir, excludeGlobs);
      const absOut = path.resolve(rootDir, outDir);
      if (!opts.dryRun) await fs.mkdir(absOut, { recursive: true });
      const structFile = path.join(absOut, "project-structure.txt");
      if (!opts.dryRun)
        await fs.writeFile(structFile, treeLines.join("\n"), "utf-8");
      log(chalk.blue(`✔️  Created ${path.relative(rootDir, structFile)}`));
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
    log(chalk.green("Resolving dependencies..."));
    const depsSet = await collectDependencies(entryFiles, {
      extensions,
      excludeGlobs: excludeGlobs.concat(excludePatterns),
      rootDir,
      maxDepth: depth,
    });

    let files = Array.from(depsSet).map((f) => path.relative(rootDir, f));
    files.sort();
    debug("Discovered files:", files);

    // Filters
    if (includePatterns.length) {
      files = files.filter((rel) =>
        includePatterns.some((pat) => rel.includes(pat))
      );
      log(chalk.yellow("Included patterns filter:"), files);
    }
    if (excludePatterns.length) {
      files = files.filter(
        (rel) => !excludePatterns.some((pat) => rel.includes(pat))
      );
      log(chalk.yellow("Exclude patterns filter:"), files);
    }

    // Determine single output file
    let outFile: string;
    if (opts.outputFile) {
      outFile = path.resolve(rootDir, opts.outputFile);
    } else {
      const slug = entryFiles
        .map((f) => path.relative(rootDir, f).replace(/[/\\]/g, "_"))
        .join("+");
      outFile = path.join(path.resolve(rootDir, outDir), `summary-${slug}.txt`);
    }
    debug("Output file:", outFile);

    if (!opts.dryRun)
      await fs.mkdir(path.dirname(outFile), { recursive: true });
    await writeSummary(entryFiles, files, rootDir, outFile, {
      json: !!opts.json,
      dryRun: !!opts.dryRun,
      estimateTokens: !!opts.estimateTokens,
      verbose: !!opts.verbose,
      quiet: !!opts.quiet,
    });

    log(
      chalk.green(`✔️  Written summary to ${path.relative(rootDir, outFile)}`)
    );
  } catch (err: any) {
    console.error(chalk.red("Error:"), err.message || err);
    process.exit(1);
  }
})();
