import { Command } from "commander";
import { stopDetectedPort } from "../core/terminate.js";
import {
  confirm,
  resolveOneTarget,
  scanForCommand,
  withCommonOptions,
  write,
  writeJson,
} from "./shared.js";

export function registerStopCommand(program: Command): void {
  const command = withCommonOptions(
    new Command("stop")
      .description("stop one matching service safely")
      .argument("<target>", "port, pid:<pid>, process name, command, or project")
      .option("--yes", "skip confirmation for allowed actions")
      .option("--force", "allow forceful termination after graceful termination fails")
      .option("--i-understand", "acknowledge risk for blocked services")
      .option("--dry-run", "show what would happen without stopping anything")
      .option("--json", "emit JSON"),
  );

  command.action(async (target: string, options: StopCommandOptions, actionCommand: Command) => {
    const { runtime, ports } = await scanForCommand(actionCommand);
    const match = await resolveOneTarget(ports, target, {
      json: options.json,
      yes: options.yes,
      purpose: "stop",
    });
    if (!match) {
      return;
    }

    if (!(await shouldProceed(match.safety.status, options))) {
      process.exitCode = 5;
      return;
    }

    const outcome = await stopDetectedPort(runtime.scanner, match, runtime.config, options);
    process.exitCode = outcome.exitCode;
    if (options.json) {
      writeJson({ outcome });
      return;
    }
    write(`${outcome.message}\n`);
  });

  program.addCommand(command);
}

interface StopCommandOptions {
  yes?: boolean;
  force?: boolean;
  iUnderstand?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

async function shouldProceed(status: string, options: StopCommandOptions): Promise<boolean> {
  if (options.dryRun || options.yes) {
    return true;
  }
  if (status === "safe") {
    return confirm("Stop this safe dev server?");
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
