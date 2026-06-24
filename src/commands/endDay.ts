import { Command } from "commander";
import { buildCleanupCommand, runCleanup } from "./cleanup.js";

export function registerEndDayCommand(program: Command): void {
  const command = buildCleanupCommand("end-day", "run a friendly end-of-day dev server cleanup");
  command.action(async (options, actionCommand: Command) => {
    await runCleanup(
      actionCommand,
      options,
      "End-of-day cleanup preview",
      "End-of-day cleanup complete.",
    );
  });
  program.addCommand(command);
}
