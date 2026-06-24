#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { registerCleanupCommand } from "./commands/cleanup.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerEndDayCommand } from "./commands/endDay.js";
import { registerExplainCommand } from "./commands/explain.js";
import { registerFreeCommand } from "./commands/free.js";
import { registerListCommand, runDefaultList } from "./commands/list.js";
import { registerProtectCommand } from "./commands/protect.js";
import { registerStopCommand } from "./commands/stop.js";
import { registerTrustCommand } from "./commands/trust.js";

export function createProgram(): Command {
  const program = new Command();
  program
    .name("ports")
    .description("Safely inspect, explain, free, and clean up local development ports.")
    .version("0.1.0")
    .option("--fixture [path]", "use built-in demo data or read a fixture JSON file")
    .action(async () => {
      await runDefaultList(program);
    });

  registerListCommand(program);
  registerExplainCommand(program);
  registerStopCommand(program);
  registerFreeCommand(program);
  registerCleanupCommand(program);
  registerEndDayCommand(program);
  registerDoctorCommand(program);
  registerProtectCommand(program);
  registerTrustCommand(program);

  return program;
}

async function main(): Promise<void> {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

const thisFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (path.resolve(thisFile) === invokedFile) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
