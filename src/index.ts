export { createProgram } from "./cli.js";
export { classifyProcess } from "./core/classify.js";
export { loadConfig, saveConfig, DEFAULT_CONFIG } from "./core/config.js";
export { scanListeningPorts, createScanner } from "./core/scan.js";
export { decideSafety } from "./core/safety.js";
export type {
  DetectedPort,
  PortMinderConfig,
  PortScanner,
  ProcessClassification,
  SafetyDecision,
} from "./core/types.js";
