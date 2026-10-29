// Where the lab files, the app and the checkpoint state live. Shared by checkpoint.mjs and app-patches.mjs.
//
// The lab folder has the same layout as C:\LabFiles on the lab VM: template/, data/ and checkpoints/.
// On another machine, pick any folder with --lab-dir or PREL40_LABFILES. Files missing from it are read
// from the repository clone that holds this script.

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export class UserError extends Error {}

export const APP_NAME = 'home-loan-desk';
export const VM_LAB_DIR = 'C:\\LabFiles';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// The repository root, when the scripts run from a clone (scripts/checkpoints).
const repoDir = join(scriptDir, '..', '..');

const isVmLabDir = (path) => process.platform === 'win32' && resolve(path).toLowerCase() === resolve(VM_LAB_DIR).toLowerCase();
const isInstalledLabDir = (path) => existsSync(join(path, 'template', APP_NAME, 'rayfin-template.yml'));

// --lab-dir, then PREL40_LABFILES, then the folder this script is installed in (<lab>/checkpoints), then C:\LabFiles.
export function resolveLabDir(option) {
  const given = option ?? process.env.PREL40_LABFILES;
  let labDir;
  if (given) {
    labDir = resolve(given.replace(/^~(?=$|[\\/])/, homedir()));
    mkdirSync(join(labDir, 'checkpoints'), { recursive: true });
  } else if (isInstalledLabDir(join(scriptDir, '..'))) {
    labDir = resolve(scriptDir, '..');
  } else if (process.platform === 'win32' && existsSync(VM_LAB_DIR)) {
    labDir = VM_LAB_DIR;
  } else {
    const example = process.platform === 'win32' ? 'C:\\prel40-lab' : '~/prel40-lab';
    throw new UserError(
      `No lab folder found: this isn't the lab VM (${VM_LAB_DIR}).\n` +
        `Pick a folder for the lab files, the app and the checkpoint state with --lab-dir, for example --lab-dir ${example},\n` +
        'or set the PREL40_LABFILES environment variable to it. The folder is created if needed.',
    );
  }
  return {
    labDir,
    // On the VM, the instructions create the app in the user profile folder. Elsewhere, keep it in the lab folder.
    defaultAppDir: isVmLabDir(labDir) ? join(homedir(), APP_NAME) : join(labDir, APP_NAME),
    statePath: join(labDir, 'checkpoints', '.state.json'),
  };
}

function findFile(label, candidates) {
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) throw new UserError(`Can't find ${label}. Looked in:\n  ${candidates.filter(Boolean).join('\n  ')}`);
  return found;
}

export const findSeed = (labDir, option) =>
  findFile('portfolio-seed.sql', [
    option && resolve(option),
    join(labDir, 'data', 'portfolio-seed.sql'),
    join(repoDir, 'data', 'portfolio-seed.sql'),
  ]);

export const findManifest = (labDir) =>
  findFile('manifest.json', [
    join(labDir, 'checkpoints', 'manifest.json'),
    join(scriptDir, 'manifest.json'),
    join(repoDir, 'data', 'generator', 'manifest.json'),
  ]);

// The lab template: <lab>/template/home-loan-desk, or src/home-loan-desk in the repository. In the repository,
// it can hold local state (rayfin/.env, deployments, node_modules), so copy only the files Git tracks to a temp folder.
export function prepareTemplate(labDir) {
  const labTemplate = join(labDir, 'template', APP_NAME);
  if (existsSync(join(labTemplate, 'rayfin-template.yml'))) return { path: labTemplate, cleanup: () => {} };

  const repoTemplate = join(repoDir, 'src', APP_NAME);
  if (!existsSync(join(repoTemplate, 'rayfin-template.yml'))) {
    throw new UserError(`Can't find the lab template. Looked in:\n  ${labTemplate}\n  ${repoTemplate}`);
  }
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: repoTemplate,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\0')
    .filter((file) => file && existsSync(join(repoTemplate, file)));
  const tempRoot = mkdtempSync(join(tmpdir(), 'prel40-template-'));
  const path = join(tempRoot, APP_NAME);
  for (const file of files) {
    mkdirSync(dirname(join(path, file)), { recursive: true });
    copyFileSync(join(repoTemplate, file), join(path, file));
  }
  return { path, cleanup: () => rmSync(tempRoot, { recursive: true, force: true }) };
}
