"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const cosmiconfig_1 = require("cosmiconfig");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DEFAULT_CONFIG = {
    extensions: [".js", ".ts", ".tsx"],
    exclude: ["node_modules", "dist", "build"],
    outDir: "Metadata",
    defaultDepth: 1,
};
/**
 * Load user config from a specified path or via cosmiconfig search.
 * Falls back to DEFAULT_CONFIG values for any missing fields.
 * If a config file path is provided but the file doesn't exist, creates one with defaults.
 */
function loadConfig(configPath) {
    let userConfig = {};
    if (configPath) {
        const fullPath = path_1.default.resolve(process.cwd(), configPath);
        if (fs_1.default.existsSync(fullPath)) {
            try {
                const content = fs_1.default.readFileSync(fullPath, "utf-8");
                userConfig = JSON.parse(content);
            }
            catch (e) {
                console.warn(`Failed to parse config at ${fullPath}: ${e.message}`);
            }
        }
        else {
            console.warn(`Config file not found at ${fullPath}, creating one with defaults.`);
            try {
                fs_1.default.writeFileSync(fullPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
                console.log(`Created default config at ${fullPath}`);
            }
            catch (e) {
                console.warn(`Failed to write default config at ${fullPath}: ${e.message}`);
            }
        }
    }
    else {
        const explorer = (0, cosmiconfig_1.cosmiconfigSync)("packmeta");
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
