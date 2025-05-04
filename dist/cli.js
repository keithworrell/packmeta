#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
const resolver_1 = require("./resolver");
const writer_1 = require("./writer");
const program = new commander_1.Command();
program
    .name("packmeta")
    .description("Collect and concatenate source files and their imports into summary files.")
    .version("0.1.0")
    .argument("<files...>", "Entry file(s), optionally with depth as last argument")
    .option("-d, --depth <number>", "Recursive import depth")
    .option("-c, --config <path>", "Path to config file", ".packmetarc.json")
    .option("-o, --out-dir <dir>", "Output directory")
    .parse(process.argv);
const args = program.args;
const opts = program.opts();
// Load configuration
const userConfig = (0, config_1.loadConfig)(opts.config);
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
        console.log(chalk_1.default.green("Running packmeta with:"));
        console.log({ entryFiles, depth, outDir, extensions, excludeGlobs });
        // Resolve dependencies
        const rootDir = process.cwd();
        console.log(chalk_1.default.blue("Resolving dependencies..."));
        const depsSet = await (0, resolver_1.collectDependencies)(entryFiles, {
            extensions,
            excludeGlobs,
            rootDir,
            maxDepth: depth,
        });
        // Convert Set to sorted array of relative paths
        const files = Array.from(depsSet).map((f) => path_1.default.relative(rootDir, f));
        files.sort();
        console.log(chalk_1.default.blue("Found files:"), files);
        // Write summaries
        console.log(chalk_1.default.blue("Writing summaries..."));
        await (0, writer_1.writeSummaries)(entryFiles, files, rootDir, outDir);
        console.log(chalk_1.default.green(`✔️  Summaries written to ${outDir}/`));
    }
    catch (err) {
        console.error(chalk_1.default.red("Error:"), err.message || err);
        process.exit(1);
    }
})();
