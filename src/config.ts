import { cosmiconfigSync } from "cosmiconfig";
import path from "path";
import fs from "fs";

export interface PackMetaConfig {
  extensions: string[];
  exclude: string[];
  outDir: string;
  defaultDepth: number;
}

const DEFAULT_CONFIG: PackMetaConfig = {
  extensions: [".js", ".ts", ".tsx"],
  exclude: ["node_modules", "dist", "build", ".git"],
  outDir: "Metadata",
  defaultDepth: 1,
};

/**
 * Load user config from a specified path or via cosmiconfig search.
 * Falls back to DEFAULT_CONFIG values for any missing fields.
 * If a config file path is provided but the file doesn't exist, creates one with defaults.
 */
export function loadConfig(configPath?: string): PackMetaConfig {
  let userConfig: Partial<PackMetaConfig> = {};

  if (configPath) {
    const fullPath = path.resolve(process.cwd(), configPath);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        userConfig = JSON.parse(content);
      } catch (e: any) {
        console.warn(`Failed to parse config at ${fullPath}: ${e.message}`);
      }
    } else {
      console.warn(
        `Config file not found at ${fullPath}, creating one with defaults.`
      );
      try {
        fs.writeFileSync(
          fullPath,
          JSON.stringify(DEFAULT_CONFIG, null, 2),
          "utf-8"
        );
        console.log(`Created default config at ${fullPath}`);
      } catch (e: any) {
        console.warn(
          `Failed to write default config at ${fullPath}: ${e.message}`
        );
      }
    }
  } else {
    const explorer = cosmiconfigSync("packmeta");
    const result = explorer.search();
    if (result && result.config) {
      userConfig = result.config;
    }
  }

  return {
    extensions: userConfig.extensions ?? DEFAULT_CONFIG.extensions,
    exclude: userConfig.exclude ?? DEFAULT_CONFIG.exclude,
    outDir: userConfig.outDir ?? DEFAULT_CONFIG.outDir,
    defaultDepth: userConfig.defaultDepth ?? DEFAULT_CONFIG.defaultDepth,
  };
}
