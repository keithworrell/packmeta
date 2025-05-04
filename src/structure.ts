import fs from "fs/promises";
import path from "path";

/**
 * Recursively builds an ASCII tree representation of the project directory,
 * excluding specified directories.
 *
 * @param dir - absolute path to start
 * @param excludeGlobs - array of directory names to exclude
 * @param prefix - current line prefix for tree formatting
 * @returns array of lines for the tree
 */
export async function buildProjectTree(
  dir: string,
  excludeGlobs: string[],
  prefix = ""
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const filtered = entries
    .filter((e) => !excludeGlobs.includes(e.name))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  const lines: string[] = [];
  const lastIndex = filtered.length - 1;

  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i];
    const isLast = i === lastIndex;
    const pointer = isLast ? "└─" : "├─";
    const nextPrefix = prefix + (isLast ? "   " : "│  ");
    lines.push(`${prefix}${pointer}${entry.name}`);
    if (entry.isDirectory()) {
      const childLines = await buildProjectTree(
        path.join(dir, entry.name),
        excludeGlobs,
        nextPrefix
      );
      lines.push(...childLines);
    }
  }

  return lines;
}
