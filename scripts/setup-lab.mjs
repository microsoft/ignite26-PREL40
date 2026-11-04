#!/usr/bin/env node
// Sets up the PREL40 lab files outside the Skillable VM: in GitHub Codespaces or on your own machine.
//
// Usage: node scripts/setup-lab.mjs [--lab-dir <path>] [--allow-all]
//
// Installs the same files as the VM update (see lab-files.mjs), straight from this repository. The lab
// folder gets the layout of C:\LabFiles on the VM, and the /check-setup and /lab-checkpoint skills go to
// the Copilot skills folder, pointing to the lab folder. Needs Node.js and Git only.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { collectFiles, createManifest, GROUPS, UserError } from './lab-files.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);

// Files kept when a folder is replaced, like the VM update does.
const KEEP = { checkpoints: ['.state.json'] };

const log = (message = '') => process.stderr.write(`${message}\n`);

const expandHome = (path) => path.replace(/^~(?=$|[\\/])/, homedir());

function isVmLabDir(path) {
  return path.replace(/[\\/]+$/, '').toLowerCase() === 'c:\\labfiles';
}

// The skills name the VM paths. Point them to this lab folder instead, with the app in the lab folder,
// like the VM update does when PREL40_LABFILES is set.
function rewriteSkillPaths(text, labDir) {
  if (isVmLabDir(labDir)) return text;
  return text
    .replaceAll('%USERPROFILE%\\home-loan-desk', 'C:\\LabFiles\\home-loan-desk')
    .replace(/C:\\LabFiles((?:\\[\w.-]+)*)/g, (_match, rest) => labDir + rest.replaceAll('\\', sep));
}

function setPermissionMode(path, mode) {
  let settings = {};
  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf8');
    if (raw.trim()) {
      try {
        settings = JSON.parse(raw);
      } catch {
        throw new Error("settings.json isn't plain JSON, so it was left unchanged. Set the default permission mode to allow-all in the GitHub Copilot app settings.");
      }
    }
  }
  if (settings.defaultPermissionMode === mode) return `Already ${mode}`;
  settings.defaultPermissionMode = mode;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`);
  return `Set to ${mode}`;
}

function countFiles(folder) {
  return readdirSync(folder, { recursive: true }).filter((entry) => statSync(join(folder, entry)).isFile()).length;
}

function printTable(rows) {
  const columns = ['Group', 'Status', 'Target', 'Details'];
  const widths = columns.map((column) => Math.max(column.length, ...rows.map((row) => String(row[column]).length)));
  const line = (values) => values.map((value, index) => String(value).padEnd(widths[index])).join('  ').trimEnd();
  log(line(columns));
  log(line(widths.map((width) => '-'.repeat(width))));
  for (const row of rows) log(line(columns.map((column) => row[column])));
}

function main() {
  const { values } = parseArgs({
    options: {
      'lab-dir': { type: 'string' },
      'allow-all': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    log('Usage: node scripts/setup-lab.mjs [--lab-dir <path>] [--allow-all]');
    log('  --lab-dir <path>  Lab folder, in place of C:\\LabFiles. Default: PREL40_LABFILES, or .workspace at the repository root.');
    log('  --allow-all       Also set the Copilot default permission mode to allow-all, like on the lab VM.');
    return;
  }

  const labDir = resolve(expandHome(values['lab-dir'] ?? process.env.PREL40_LABFILES ?? join(repoRoot, '.workspace')));
  const copilotHome = resolve(expandHome(process.env.PREL40_COPILOT_HOME || process.env.COPILOT_HOME || join(homedir(), '.copilot')));
  const skillsDir = join(copilotHome, 'skills');
  const destination = (name) => (name.startsWith('skills/') ? join(skillsDir, ...name.slice('skills/'.length).split('/')) : join(labDir, ...name.split('/')));

  const files = collectFiles(repoRoot);
  const { manifest } = createManifest(repoRoot, files, new Date());
  log(`PREL40 lab files setup: ${manifest.shortCommit}${manifest.dirty ? ' with local changes' : ''}`);
  log(`Lab folder: ${labDir}`);
  log('');

  // One row per installed group, like the VM update.
  const labels = { template: ['Rayfin template', 'template/home-loan-desk'], data: ['Lab data', 'data'], checkpoints: ['Checkpoints', 'checkpoints'] };
  const rows = new Map();
  const rowFor = (group) => {
    const [label, target] = group.name === 'skill' ? [`${group.target.slice('skills/'.length)} skill`, group.target] : labels[group.name];
    if (!rows.has(label)) rows.set(label, { Group: label, Status: 'OK', Target: destination(target), Details: '', count: 0 });
    return rows.get(label);
  };

  for (const group of GROUPS) {
    const row = rowFor(group);
    if (row.Status === 'FAILED') continue;
    try {
      const groupFiles = files.filter((file) => file.source === group.source || file.source.startsWith(`${group.source}/`));
      const isFolder = statSync(join(repoRoot, group.source)).isDirectory();
      if (isFolder) {
        const folder = destination(group.target);
        const keep = (KEEP[group.target] ?? []).map((name) => [name, join(folder, name)]).filter(([, path]) => existsSync(path));
        const kept = keep.map(([name, path]) => [name, readFileSync(path)]);
        rmSync(folder, { recursive: true, force: true });
        for (const [name, data] of kept) {
          mkdirSync(folder, { recursive: true });
          writeFileSync(join(folder, name), data);
        }
      }
      for (const file of groupFiles) {
        const target = destination(file.name);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(join(repoRoot, file.source), target);
      }
      if (group.name === 'skill') {
        const skillFile = join(destination(group.target), 'SKILL.md');
        writeFileSync(skillFile, rewriteSkillPaths(readFileSync(skillFile, 'utf8'), labDir));
      }
      row.count += groupFiles.length;
    } catch (error) {
      row.Status = 'FAILED';
      row.Details = error.message;
    }
  }
  for (const row of rows.values()) {
    if (row.Status !== 'OK') continue;
    if (row.Group === 'Lab data') row.Details = `portfolio-seed.sql and ${countFiles(join(labDir, 'data', 'samples'))} sample files`;
    else if (row.Group === 'Checkpoints') row.Details = `${row.count} files (run npm install before use)`;
    else row.Details = `${row.count} files`;
  }

  const settingsPath = join(copilotHome, 'settings.json');
  const permissions = { Group: 'Copilot permissions', Status: 'OK', Target: settingsPath, Details: '' };
  if (values['allow-all']) {
    try {
      permissions.Details = setPermissionMode(settingsPath, 'allow-all');
    } catch (error) {
      permissions.Status = 'FAILED';
      permissions.Details = error.message;
    }
  } else {
    permissions.Status = 'SKIPPED';
    permissions.Details = 'Unchanged. Use --allow-all to set allow-all, like on the VM.';
  }

  const versionPath = join(labDir, 'lab-files.json');
  const failed = [...rows.values()].filter((row) => row.Status === 'FAILED').length + (permissions.Status === 'FAILED' ? 1 : 0);
  const version = { Group: 'Version stamp', Status: 'OK', Target: versionPath, Details: manifest.shortCommit };
  if (failed > 0) {
    version.Status = 'FAILED';
    version.Details = 'Skipped: some files were not installed.';
  } else {
    writeFileSync(versionPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  printTable([...rows.values(), permissions, version]);
  log('');
  if (failed > 0) throw new UserError(`${failed} update(s) failed. Fix the cause shown above, then run the same command again.`);
  log(`Lab files ready in ${labDir}.`);
  log(`When the lab instructions mention C:\\LabFiles, use ${labDir} instead.`);
  log('Restart the GitHub Copilot app or reload Visual Studio Code, then run /check-setup in a new chat.');
}

try {
  main();
} catch (error) {
  log(error instanceof UserError ? `Error: ${error.message}` : error.stack);
  process.exitCode = 1;
}
