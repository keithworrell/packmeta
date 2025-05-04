# packmeta

`packmeta` is a CLI tool designed to help developers working with large codebases and large language models (LLMs). It bundles a file and its local dependencies (up to a specified recursion depth) into a single summary file, making it easy to share relevant code snippets with an LLM or in documentation.

---

## Installation

```bash
# Clone and install locally
git clone <repo-url> packmeta
cd packmeta
npm install
npm link
```

_Alternatively_, install from npm (when published):

```bash
npm install -g packmeta
```

---

## Quickstart

```bash
# Generate a summary of index.ts and its direct imports:
packmeta src/index.ts --depth 1

# Generate a deeper bundle (imports-of-imports):
packmeta src/index.ts --depth 2
```

By default, summaries are written to `Metadata/summary-<path-slug>.txt`.

---

## README for LLM Integration

When collaborating with an LLM (e.g., ChatGPT) to debug, refactor, or understand a portion of your project, use `packmeta` to extract the minimal set of files needed for context.

1. **Identify the entry file** you want the LLM to focus on (e.g. `src/api/user.ts`).
2. **Run `packmeta`** with an appropriate depth. For example:

   ```bash
   packmeta src/api/user.ts --depth 2
   ```

3. **Copy the contents** of the generated summary (e.g. `Metadata/summary-src_api_user_ts.txt`).
4. **Paste** that entire block into your LLM prompt. For example:

   > **User**: _Here's my server handler and its imports:_
   >
   > ````js
   > // src/api/user.ts
   >
   > ```js
   > // ... file contents ...
   > ````
   >
   > // src/utils/db.ts
   >
   > ```js
   > // ... file contents ...
   > ```
   >
   > Can you help me understand why the user lookup is failing?

The LLM now has exactly the code it needs—no more, no less—to provide targeted assistance without exceeding context limits.

---

## Configuration

You can customize defaults by creating a `.packmetarc.json` in your project root:

```json
{
  "extensions": [".js", ".ts", ".tsx"],
  "exclude": ["node_modules", "dist", "build"],
  "outDir": "Metadata",
  "defaultDepth": 1
}
```

Use `-c <path>` to point to a custom config.

---

## Options

- `-d, --depth <number>`: recursive import depth (overrides `defaultDepth`).
- `-o, --out-dir <dir>`: output directory.
- `-c, --config <path>`: path to a custom config file.

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a pull request

---

Happy coding with your LLMs! For questions or feedback, open an issue or reach out on our chat channel.
