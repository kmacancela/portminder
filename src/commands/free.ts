import { Command } from "commander";
import { formatExplain } from "../core/format.js";
import { stopDetectedPort } from "../core/terminate.js";
import {
  confirm,
  resolveOneTarget,
  scanForCommand,
  withCommonOptions,
  write,
  writeJson,
} from "./shared.js";

export function registerFreeCommand(program: Command): void {
  const command = withCommonOptions(
    new Command("free")
      .description("free a blocked development port safely")
      .argument("<port>", "port number")
      .option("--yes", "skip confirmation for allowed actions")
      .option("--force", "allow forceful termination after graceful termination fails")
      .option("--i-understand", "acknowledge risk for blocked services")
      .option("--dry-run", "show what would happen without stopping anything")
      .option("--json", "emit JSON"),
  );

  command.action(async (target: string, options: FreeCommandOptions, actionCommand: Command) => {
    const { runtime, ports } = await scanForCommand(actionCommand);
    const match = await resolveOneTarget(ports, target, {
      json: options.json,
      yes: true,
      purpose: "free",
    });
    if (!match) {
      return;
    }

    if (options.json) {
      const outcome = await maybeStop(runtime, match, options);
      writeJson({ port: match, outcome });
      process.exitCode = outcome.exitCode;
      return;
    }

    write(formatExplain(match));
    if (!(await shouldProceed(match.safety.status, options))) {
      process.exitCode = 5;
      return;
    }
    const outcome = await stopDetectedPort(runtime.scanner, match, runtime.config, options);
    process.exitCode = outcome.exitCode;
    write(`${outcome.message}\n`);
  });

  program.addCommand(command);
}

interface FreeCommandOptions {
  yes?: boolean;
  force?: boolean;
  iUnderstand?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

async function maybeStop(
  runtime: Awaited<ReturnType<typeof scanForCommand>>["runtime"],
  match: Awaited<ReturnType<typeof resolveOneTarget>>,
  options: FreeCommandOptions,
) {
  if (!match) {
    throw new Error("No match to stop.");
  }
  return stopDetectedPort(runtime.scanner, match, runtime.config, options);
}

async function shouldProceed(status: string, options: FreeCommandOptions): Promise<boolean> {
  if (options.dryRun || options.yes || status === "safe") {
    return true;
  }
  if (status === "unknown") {
    return confirm("This process is unknown. Stop it anyway?");
  }
  if (status === "protected" && options.force) {
    return confirm("This process is protected. Force stop it anyway?");
  }
  if (status === "blocked" && options.force && options.iUnderstand) {
    return confirm("This process is blocked. Force stop it anyway?");
  }
  return true;
}
