import { Command } from "commander";
import { addProtectedTarget, getConfigPath, loadConfig, saveConfig } from "../core/config.js";
import { withCommonOptions, write, writeJson } from "./shared.js";

export function registerProtectCommand(program: Command): void {
  const command = withCommonOptions(
    new Command("protect")
      .description("mark a port, process, or project as protected")
      .argument("<target>", "port, process name, or project path")
      .option("--json", "emit JSON"),
  );

  command.action(async (target: string, options: { json?: boolean }) => {
    const configPath = getConfigPath();
    const config = addProtectedTarget(await loadConfig(configPath), target);
    await saveConfig(config, configPath);
    if (options.json) {
      writeJson({ ok: true, configPath, protected: config.protected });
      return;
    }
    write(`Protected ${target}. Updated ${configPath}\n`);
  });

  program.addCommand(command);
}
