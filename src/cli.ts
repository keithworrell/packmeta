#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs/promises";
import chalk from "chalk";
import { loadConfig } from "./config";
import { collectDependencies } from "./resolver";
import { writeSummaries } from "./writer";
import { buildProjectTree } from "./structure";

const program = new Command();
program
  .name("packmeta")
  .description(
    "Collect and concatenate source files and their imports into summary files, or traverse project structure when no files supplied."
  )
  .version("0.1.0")
  .argument(
    "[files...]",
    "Entry file(s), optionally with depth as last argument"
  )
  .option("-d, --depth <number>", "Recursive import depth")
  .option("-c, --config <path>", "Path to config file", ".packmetarc.json")
  .option("-o, --out-dir <dir>", "Output directory")
  .parse(process.argv);

const args = program.args as string[];
const opts = program.opts();

// Load configuration
const userConfig = loadConfig(opts.config);
const defaultDepth = userConfig.defaultDepth;
const extensions = userConfig.extensions;
const excludeGlobs = userConfig.exclude;
const outDir = opts.outDir || userConfig.outDir;

// Determine depth and entry files
let depth = defaultDepth;
let entryFiles = args;
const lastArg = args[args.length - 1];
if (opts.depth) {
  depth = parseInt(opts.depth, 10);
}
if (!opts.depth && !isNaN(Number(lastArg)) && args.length > 1) {
  depth = parseInt(lastArg, 10);
  entryFiles = args.slice(0, -1);
}

(async () => {
  try {
    const rootDir = process.cwd();

    // No entry files: output project structure
    if (entryFiles.length === 0) {
      console.log(
        chalk.green("No entry files detected — generating project structure...")
      );
      const treeLines = await buildProjectTree(rootDir, excludeGlobs);
      const absOut = path.resolve(rootDir, outDir);
      await fs.mkdir(absOut, { recursive: true });
      const outFile = path.join(absOut, "project-structure.txt");
      await fs.writeFile(outFile, treeLines.join("\n"), "utf-8");
      console.log(chalk.blue(`✔️  Created ${path.relative(rootDir, outFile)}`));
      process.exit(0);
    }

    // Summarization workflow
    console.log(chalk.green("Running packmeta with:"));
    console.log({ entryFiles, depth, outDir, extensions, excludeGlobs });

    console.log(chalk.blue("Resolving dependencies..."));
    const depsSet = await collectDependencies(entryFiles, {
      extensions,
      excludeGlobs,
      rootDir,
      maxDepth: depth,
    });

    const files = Array.from(depsSet).map((f) => path.relative(rootDir, f));
    files.sort();
    console.log(chalk.blue("Found files:"), files);

    console.log(chalk.blue("Writing summaries..."));
    await writeSummaries(entryFiles, files, rootDir, outDir);
    console.log(chalk.green(`✔️  Summaries written to ${outDir}/`));
  } catch (err: any) {
    console.error(chalk.red("Error:"), err.message || err);
    process.exit(1);
  }
})();
