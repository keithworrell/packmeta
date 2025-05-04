# packmeta

`packmeta` is a CLI tool designed to help developers working with large codebases and large language models (LLMs). It bundles a file (or files) and their local dependencies (up to a specified recursion depth) into a single summary file, making it easy to share exactly the context needed. It can also output an ASCII project structure when run without arguments.

---

## Installation

```bash
# Clone and install locally
git clone https://github.com/keithworrell/packmeta.git
cd packmeta
npm install
npm link
```

_Alternatively_, install from npm:

```bash
npm install -g packmeta
```

---

## Quickstart

```bash
# Bundle a single file and its direct imports:
packmeta src/index.ts --depth 1

# Bundle deeper (imports-of-imports):
packmeta src/index.ts --depth 2

# Bundle multiple entry files into one summary:
packmeta src/app.ts src/lib.ts --depth 2

# Include only files matching patterns:
packmeta src/ui/*.tsx --depth 1 --include-pattern "Modal.tsx" --exclude-pattern "Test.ts"

# Estimate LLM tokens without writing files:
packmeta src/index.ts --depth 2 --estimate-tokens --dry-run

# Traverse entire project and output structure:
packmeta
```

By default, outputs are written to `Metadata/`:

- **Summaries**: `summary-<slug>.txt`
- **Structure**: `project-structure.txt`

---

## ChatGPT Prompt Template

```text
# ChatGPT Prompt for packmeta Summary
I have extracted relevant code snippets using packmeta. The summary file includes the entry files and their dependencies:

<PASTE CONTENTS OF summary-*.txt HERE>

Please review this code and help me [debug, refactor, or explain] this functionality.
```

---

## Configuration

Create a `.packmetarc.json` in your project root to override defaults:

```json
{
  "extensions": [".js", ".ts", ".tsx"],
  "exclude": ["node_modules", "dist", "build"],
  "outDir": "Metadata",
  "defaultDepth": 1
}
```

Use `-c <path>` to specify a custom config file.

---

## Options

| Flag                          | Description                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `-d, --depth <n>`             | Recursive import depth (overrides `defaultDepth`)                             |
| `-o, --out-dir <dir>`         | Output directory (default `Metadata`)                                         |
| `-c, --config <path>`         | Path to config file (default `.packmetarc.json`)                              |
| `--include-pattern <pattern>` | Include only files whose relative paths match this substring; may be repeated |
| `--exclude-pattern <pattern>` | Exclude files whose relative paths match this substring; may be repeated      |
| `--extensions <list>`         | Comma-separated list of extensions to include (e.g. `.js,.ts,.tsx`)           |
| `-f, --output-file <file>`    | Write output to this specific file instead of default naming                  |
| `--json`                      | Emit a JSON manifest of `{ path, content }[]` rather than fenced text         |
| `-e, --estimate-tokens`       | Estimate LLM token count of output (approx. 4 chars/token)                    |
| `--dry-run`                   | Simulate actions without writing files                                        |
| `-v, --verbose`               | Enable verbose logging                                                        |
| `-q, --quiet`                 | Suppress non-error output                                                     |

---

## Common Commands

```bash
# Bundle and name output explicitly:
packmeta entry.ts --depth 2 -f Metadata/my-summary.txt

# Generate structure and summary in one go:
packmeta          # → Metadata/project-structure.txt
packmeta a.ts b.ts # → Metadata/summary-a_ts+b_ts.txt

# JSON manifest:
packmeta index.ts --json
```

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a pull request

---

Happy coding with your LLMs!
