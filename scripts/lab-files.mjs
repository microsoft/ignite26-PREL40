// The PREL40 lab files: what the VM update installs in C:\LabFiles and the Copilot skills folder,
// and what setup-lab.mjs installs outside the VM. Shared by publish-vm-update.mjs and setup-lab.mjs.

import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Repo paths (relative to the repo root) and where they go in the lab files.
// Targets starting with skills/ go to the Copilot skills folder; the others go to the lab folder.
// The VM script (vm-update.template.ps1) relies on these paths inside the zip.
export const GROUPS = [
  { name: 'template', source: 'src/home-loan-desk', target: 'template/home-loan-desk', required: ['rayfin-template.yml', 'package.json'] },
  { name: 'data', source: 'data/portfolio-seed.sql', target: 'data/portfolio-seed.sql' },
  { name: 'data', source: 'data/samples', target: 'data/samples', required: ['HL-1042-floor-plan.pdf', 'HL-1042-kitchen-current.jpg'] },
  { name: 'skill', source: 'scripts/vm-skills/check-setup', target: 'skills/check-setup', required: ['SKILL.md', 'scripts/check-setup.mjs'] },
  { name: 'skill', source: 'scripts/vm-skills/lab-checkpoint', target: 'skills/lab-checkpoint', required: ['SKILL.md'] },
  { name: 'checkpoints', source: 'scripts/checkpoints', target: 'checkpoints', required: ['checkpoint.mjs', 'app-patches.mjs', 'lab.mjs', 'package.json', 'package-lock.json'] },
  { name: 'checkpoints', source: 'data/generator/manifest.json', target: 'checkpoints/manifest.json' },
];

export class UserError extends Error {}

export function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      ...options,
    }).trim();
  } catch (error) {
    if (error.code === 'ENOENT') throw new UserError(`${command} is not installed or not on PATH.`);
    const details = (error.stderr || error.stdout || error.message).toString().trim();
    throw new UserError(`${command} ${args.join(' ')} failed:\n${details}`);
  }
}

// Files of each group that Git tracks or doesn't ignore, so node_modules and build output are left out.
// Each file has its group, its repo path (source), and its path in the lab files (name).
export function collectFiles(repoRoot) {
  const files = [];
  for (const group of GROUPS) {
    const listed = run('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', group.source], { cwd: repoRoot })
      .split('\0')
      .filter(Boolean);
    const present = listed.filter((path) => existsSync(join(repoRoot, path)) && statSync(join(repoRoot, path)).isFile());
    if (present.length === 0) throw new UserError(`Nothing to package in ${group.source}`);
    for (const required of group.required ?? []) {
      const path = `${group.source}/${required}`;
      if (!present.includes(path)) throw new UserError(`Missing required file: ${path}`);
    }
    for (const path of present) {
      files.push({
        group: group.name,
        source: path,
        name: group.target + path.slice(group.source.length),
      });
    }
  }
  return files;
}

// The version stamp of the lab files (lab-files.json), with the number of uncommitted changed files.
export function createManifest(repoRoot, files, builtAt) {
  const commit = run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  const changes = run('git', ['status', '--porcelain', '--', ...GROUPS.map((group) => group.source)], { cwd: repoRoot });
  const changedFiles = changes ? changes.split('\n').length : 0;
  const manifest = {
    name: 'PREL40 lab files',
    commit,
    shortCommit: commit.slice(0, 7),
    dirty: changedFiles > 0,
    builtAt: `${builtAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    files: Object.fromEntries(GROUPS.map((group) => [group.name, files.filter((file) => file.group === group.name).length])),
  };
  return { manifest, changedFiles };
}
