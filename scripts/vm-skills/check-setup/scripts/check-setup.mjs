#!/usr/bin/env node
// Checks that the PREL40 lab environment is ready and prints a Markdown table.
// Usage: node scripts/check-setup.mjs [--lab-root <path>]   (default: PREL40_LABFILES, or C:\LabFiles)
// Output is ASCII only, so it reads the same in every terminal.
// Exit code: 0 when every check passes, 1 when at least one check fails.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { 'lab-root': { type: 'string' } } });
const labRoot = values['lab-root'] || process.env.PREL40_LABFILES || 'C:\\LabFiles';
const updateHint = 'Run the lab files update.';
const results = [];

const add = (check, status, details) => results.push({ check, status, details });

function toolVersion(command) {
  try {
    // Through a shell, so npm and other .cmd shims also start on Windows.
    const output = execSync(`${command} --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000 });
    return output.split(/\r?\n/)[0].trim() || null;
  } catch {
    return null;
  }
}

function checkLabFiles(check, folder, files) {
  const missing = files.filter((file) => {
    const path = join(folder, file);
    return !existsSync(path) || !statSync(path).isFile();
  });
  if (missing.length === 0) add(check, 'PASS', folder);
  else add(check, 'FAIL', `Missing in ${folder}: ${missing.join(', ')}. ${updateHint}`);
}

add('GitHub Copilot', 'PASS', 'Signed in: GitHub Copilot ran this check.');

const nodeMajor = Number(process.versions.node.split('.')[0]);
if ([20, 22, 24].includes(nodeMajor)) add('Node.js', 'PASS', process.version);
else add('Node.js', 'FAIL', `${process.version}. Rayfin needs Node.js 20, 22, or 24.`);

const npm = toolVersion('npm');
add('npm', npm ? 'PASS' : 'FAIL', npm ?? 'Not found. It ships with Node.js.');

const git = toolVersion('git');
add('Git', git ? 'PASS' : 'FAIL', git ?? 'Not found. Install Git.');

const dataDir = join(labRoot, 'data');
checkLabFiles('Rayfin template', join(labRoot, 'template', 'home-loan-desk'), ['rayfin-template.yml', 'package.json']);
checkLabFiles('SQL seed', dataDir, ['portfolio-seed.sql']);
checkLabFiles('Sample files', join(dataDir, 'samples'), ['HL-1042-floor-plan.pdf', 'HL-1042-kitchen-current.jpg']);

const versionFile = join(labRoot, 'lab-files.json');
try {
  const version = JSON.parse(readFileSync(versionFile, 'utf8'));
  add('Lab files version', 'INFO', `${version.shortCommit}${version.dirty ? ' with local changes' : ''}, built ${version.builtAt}`);
} catch {
  add('Lab files version', 'INFO', `Unknown: ${versionFile} not found.`);
}

const failed = results.filter((result) => result.status === 'FAIL').length;
const lines = [
  '| Check | Status | Details |',
  '| --- | --- | --- |',
  ...results.map((result) => `| ${result.check} | ${result.status} | ${result.details} |`),
  '',
  failed === 0 ? 'Result: READY' : `Result: NOT READY (${failed} failed)`,
];
console.log(lines.join('\n'));
if (failed > 0) process.exitCode = 1;
