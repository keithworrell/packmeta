import fs from "fs/promises";
import path from "path";
import { parse } from "@babel/parser";
import type { File } from "@babel/types";

export interface ResolverOptions {
  extensions: string[];
  excludeGlobs: string[];
  rootDir: string;
  maxDepth: number;
}

/**
 * Recursively collect all local file dependencies for the given entry files.
 * Skips modules under excluded globs (e.g. node_modules, dist, build).
 */
export async function collectDependencies(
  entryFiles: string[],
  options: ResolverOptions
): Promise<Set<string>> {
  const visited = new Set<string>();

  async function processFile(filePath: string, depth: number) {
    const rel = path.relative(options.rootDir, filePath);
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
    let code: string;
    try {
      code = await fs.readFile(filePath, "utf-8");
    } catch {
      console.warn(`⚠️  Missing file: ${rel}`);
      return;
    }

    // Parse AST
    let ast: File;
    try {
      ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });
    } catch (err: any) {
      console.warn(`Failed to parse ${rel}: ${err.message}`);
      return;
    }

    // Gather import sources
    const imports: string[] = [];
    for (const node of ast.program.body) {
      // ES Module imports
      if (node.type === "ImportDeclaration") {
        imports.push(node.source.value);
      }
      // CommonJS require at top level
      if (node.type === "VariableDeclaration" && node.declarations) {
        for (const decl of node.declarations) {
          if (
            decl.init &&
            decl.init.type === "CallExpression" &&
            decl.init.callee.type === "Identifier" &&
            decl.init.callee.name === "require" &&
            decl.init.arguments.length === 1 &&
            decl.init.arguments[0].type === "StringLiteral"
          ) {
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
          const candidate = path.resolve(path.dirname(filePath), imp + ext);
          try {
            await fs.access(candidate);
            await processFile(candidate, depth + 1);
            break;
          } catch {
            // try next extension
          }
        }
      }
    }
  }

  // Initialize processing for each entry
  for (const entry of entryFiles) {
    const absPath = path.isAbsolute(entry)
      ? entry
      : path.resolve(options.rootDir, entry);
    await processFile(absPath, 0);
  }

  return visited;
}
