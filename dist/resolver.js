"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDependencies = collectDependencies;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const parser_1 = require("@babel/parser");
/**
 * Recursively collect all local file dependencies for the given entry files.
 * Skips modules under excluded globs (e.g. node_modules, dist, build).
 */
async function collectDependencies(entryFiles, options) {
    const visited = new Set();
    async function processFile(filePath, depth) {
        const rel = path_1.default.relative(options.rootDir, filePath);
        // Skip if excluded
        if (options.excludeGlobs.some((glob) => rel.startsWith(glob))) {
            return;
        }
        if (visited.has(filePath)) {
            return;
        }
        visited.add(filePath);
        // Stop if reached max depth
        if (depth >= options.maxDepth) {
            return;
        }
        // Read file content
        let code;
        try {
            code = await promises_1.default.readFile(filePath, "utf-8");
        }
        catch {
            console.warn(`⚠️  Missing file: ${rel}`);
            return;
        }
        // Parse AST
        let ast;
        try {
            ast = (0, parser_1.parse)(code, {
                sourceType: "module",
                plugins: ["typescript", "jsx"],
            });
        }
        catch (err) {
            console.warn(`Failed to parse ${rel}: ${err.message}`);
            return;
        }
        // Gather import sources
        const imports = [];
        for (const node of ast.program.body) {
            // ES Module imports
            if (node.type === "ImportDeclaration") {
                imports.push(node.source.value);
            }
            // CommonJS require at top level
            if (node.type === "VariableDeclaration" && node.declarations) {
                for (const decl of node.declarations) {
                    if (decl.init &&
                        decl.init.type === "CallExpression" &&
                        decl.init.callee.type === "Identifier" &&
                        decl.init.callee.name === "require" &&
                        decl.init.arguments.length === 1 &&
                        decl.init.arguments[0].type === "StringLiteral") {
                        imports.push(decl.init.arguments[0].value);
                    }
                }
            }
            // TODO: handle dynamic imports or other patterns
        }
        // Resolve each import
        for (const imp of imports) {
            if (imp.startsWith("./") || imp.startsWith("../")) {
                for (const ext of options.extensions) {
                    const candidate = path_1.default.resolve(path_1.default.dirname(filePath), imp + ext);
                    try {
                        await promises_1.default.access(candidate);
                        await processFile(candidate, depth + 1);
                        break;
                    }
                    catch {
                        // try next extension
                    }
                }
            }
        }
    }
    // Initialize processing for each entry
    for (const entry of entryFiles) {
        const absPath = path_1.default.isAbsolute(entry)
            ? entry
            : path_1.default.resolve(options.rootDir, entry);
        await processFile(absPath, 0);
    }
    return visited;
}
