import { cp, lstat, mkdir, readdir, readFile, readlink, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expandHome } from "./config.js";

export type CodexSkillInstallStatus = "installed" | "already-installed" | "repaired";

export interface CodexSkillInstallOptions {
  codexHome?: string | undefined;
  force?: boolean | undefined;
  sourceDir?: string | undefined;
}

export interface CodexSkillInstallResult {
  status: CodexSkillInstallStatus;
  sourceDir: string;
  targetDir: string;
  codexHome: string;
}

export class CodexSkillInstallError extends Error {
  constructor(
    message: string,
    readonly targetDir?: string,
  ) {
    super(message);
    this.name = "CodexSkillInstallError";
  }
}

export async function installCodexSkill(
  options: CodexSkillInstallOptions = {},
): Promise<CodexSkillInstallResult> {
  const codexHome = resolveCodexHome(options.codexHome);
  const sourceDir = options.sourceDir
    ? path.resolve(expandHome(options.sourceDir))
    : resolveBundledSkillDir();
  const targetDir = path.join(codexHome, "skills", "portminder");

  await assertSkillSource(sourceDir);
  await mkdir(path.dirname(targetDir), { recursive: true });

  const existing = await lstat(targetDir).catch(() => null);
  if (existing) {
    if (await targetMatchesSource(targetDir, sourceDir)) {
      return { status: "already-installed", sourceDir, targetDir, codexHome };
    }

    if (!options.force) {
      throw new CodexSkillInstallError(
        `A different skill already exists at ${targetDir}. Re-run with --force to replace it.`,
        targetDir,
      );
    }

    await rm(targetDir, { recursive: true, force: true });
    await copySkill(sourceDir, targetDir);
    return { status: "repaired", sourceDir, targetDir, codexHome };
  }

  try {
    await copySkill(sourceDir, targetDir);
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      if (await targetMatchesSource(targetDir, sourceDir)) {
        return { status: "already-installed", sourceDir, targetDir, codexHome };
      }
      if (!options.force) {
        throw new CodexSkillInstallError(
          `A different skill already exists at ${targetDir}. Re-run with --force to replace it.`,
          targetDir,
        );
      }
      await rm(targetDir, { recursive: true, force: true });
      await copySkill(sourceDir, targetDir);
      return { status: "repaired", sourceDir, targetDir, codexHome };
    }
    throw error;
  }

  return { status: "installed", sourceDir, targetDir, codexHome };
}

export function resolveCodexHome(codexHome?: string): string {
  if (codexHome) {
    return path.resolve(expandHome(codexHome));
  }
  if (process.env.CODEX_HOME) {
    return path.resolve(expandHome(process.env.CODEX_HOME));
  }
  return path.join(os.homedir(), ".codex");
}

export function resolveBundledSkillDir(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const packageRoot = path.resolve(moduleDir, "..", "..");
  return path.join(packageRoot, "skills", "portminder");
}

async function assertSkillSource(sourceDir: string): Promise<void> {
  const sourceStats = await stat(sourceDir).catch(() => null);
  if (!sourceStats?.isDirectory()) {
    throw new CodexSkillInstallError(`Bundled PortMinder skill was not found at ${sourceDir}.`);
  }

  const skillFile = path.join(sourceDir, "SKILL.md");
  const skillStats = await stat(skillFile).catch(() => null);
  if (!skillStats?.isFile()) {
    throw new CodexSkillInstallError(`Bundled PortMinder skill is missing ${skillFile}.`);
  }
}

async function copySkill(sourceDir: string, targetDir: string): Promise<void> {
  await cp(sourceDir, targetDir, { recursive: true });
}

async function targetMatchesSource(targetDir: string, sourceDir: string): Promise<boolean> {
  const targetStats = await lstat(targetDir);

  if (targetStats.isSymbolicLink()) {
    const targetLink = await readlink(targetDir);
    const resolvedLink = path.resolve(path.dirname(targetDir), targetLink);
    return resolvedLink === sourceDir;
  }

  if (!targetStats.isDirectory()) {
    return false;
  }

  const [sourceFiles, targetFiles] = await Promise.all([
    listFiles(sourceDir),
    listFiles(targetDir),
  ]);
  if (sourceFiles.length !== targetFiles.length) {
    return false;
  }

  for (const sourceFile of sourceFiles) {
    const relative = path.relative(sourceDir, sourceFile);
    const targetFile = path.join(targetDir, relative);
    if (!targetFiles.includes(targetFile)) {
      return false;
    }
    const [sourceContent, targetContent] = await Promise.all([
      readFile(sourceFile),
      readFile(targetFile),
    ]);
    if (!sourceContent.equals(targetContent)) {
      return false;
    }
  }

  return true;
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return listFiles(entryPath);
      }
      if (entry.isFile()) {
        return [entryPath];
      }
      return [];
    }),
  );

  return files.flat().sort((a, b) => a.localeCompare(b));
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
