import { Command } from "commander";
import { formatCleanupPreview, formatStoppedSummary } from "../core/format.js";
import { stopDetectedPort } from "../core/terminate.js";
import {
  confirm,
  filterOlderThan,
  parseDurationMs,
  scanForCommand,
  splitCleanupPlan,
  withCommonOptions,
  write,
  writeJson,
} from "./shared.js";

export function registerCleanupCommand(program: Command): void {
  const command = buildCleanupCommand("cleanup", "stop likely stale dev servers safely");
  command.action(async (options: CleanupCommandOptions, actionCommand: Command) => {
    await runCleanup(actionCommand, options, "Cleanup preview", "Cleanup complete.");
  });
  program.addCommand(command);
}

export function buildCleanupCommand(name: string, description: string): Command {
  return withCommonOptions(
    new Command(name)
      .description(description)
      .option("--dry-run", "preview without stopping anything")
      .option("--yes", "stop safe dev servers without asking")
      .option(
        "--older-than <duration>",
        "include only processes older than a duration like 30m, 2h, or 1d",
      )
      .option("--dev-only", "only consider safe dev servers")
      .option("--json", "emit JSON"),
  );
}

export async function runCleanup(
  actionCommand: Command,
  options: CleanupCommandOptions,
  previewHeading: string,
  doneHeading: string,
): Promise<void> {
  const { runtime, ports } = await scanForCommand(actionCommand);
  const olderThanMs = parseDurationMs(options.olderThan);
  const considered = filterOlderThan(ports, olderThanMs);
  const plan = splitCleanupPlan(
    options.devOnly ? considered.filter((port) => port.safety.status === "safe") : considered,
  );

  if (options.json && (options.dryRun || !options.yes)) {
    writeJson({ dryRun: true, plan });
    process.exitCode = 9;
    return;
  }

  if (options.dryRun || !options.yes) {
    write(formatCleanupPreview(plan, previewHeading));
    if (options.dryRun) {
      process.exitCode = 9;
      return;
    }
    if (plan.safeToStop.length === 0) {
      return;
    }
    const approved = await confirm(
      `Stop ${plan.safeToStop.length} safe dev server${plan.safeToStop.length === 1 ? "" : "s"}?`,
    );
    if (!approved) {
      return;
    }
  }

  const outcomes = [];
  for (const port of plan.safeToStop) {
    outcomes.push(
      await stopDetectedPort(runtime.scanner, port, runtime.config, {
        dryRun: options.dryRun,
        force: false,
      }),
    );
  }

  const failed = outcomes.find(
    (outcome) => outcome.status === "failed" || outcome.status === "refused",
  );
  process.exitCode = failed?.exitCode ?? 0;

  if (options.json) {
    writeJson({ outcomes, preserved: plan.preserved });
    return;
  }

  write(
    formatStoppedSummary(
      outcomes.filter((outcome) => outcome.status === "terminated").map((outcome) => outcome.port),
      plan.preserved,
      doneHeading,
    ),
  );
  for (const outcome of outcomes.filter((item) => item.status !== "terminated")) {
    write(`${outcome.message}\n`);
  }
}

export interface CleanupCommandOptions {
  dryRun?: boolean;
  yes?: boolean;
  olderThan?: string;
  devOnly?: boolean;
  json?: boolean;
}
