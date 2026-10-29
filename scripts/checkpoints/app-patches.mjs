#!/usr/bin/env node
// Lab author tooling for the app changes made in Exercise 6 and later, stored as Git patches in ./app,
// one per checkpoint: app/<NN>-<slug>.patch. Each app keeps lab/checkpoint-<N> tags to know where it is.
//
//   capture <N>  Saves the app commits since the previous checkpoint as app/<NN>-<slug>.patch, with the
//                workspace-specific values replaced by {{PLACEHOLDERS}}, and tags HEAD lab/checkpoint-<N>.
//   apply <N>    Applies the patches after the app's latest checkpoint tag, up to <N>, with this app's values.
//   verify [N]   Creates an app from the lab template in a temp folder, applies the patches up to <N> (all by
//                default) with dummy values, then runs the app's typecheck, build and test scripts.
//
// Usage: node app-patches.mjs <capture|apply|verify> [N] [options]. Run with --help for the options.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { APP_NAME, prepareTemplate, resolveLabDir, UserError } from './lab.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const PATCH_DIR = join(scriptDir, 'app');
// The app checkpoint (Exercise 4) is the base the patches apply to.
const BASE_CHECKPOINT = 4;
const TAG_PREFIX = 'lab/checkpoint-';
const INITIAL_COMMIT = 'Initial commit from the lab template';
const GUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const LEAKS = [GUID, /\b[a-z0-9-]+\.(?:webapp\.fabricapps\.net|pbidedicated\.windows\.net)\b/gi, /\bpk-[A-Za-z0-9_-]{16,}/g];
const DUMMY_VALUES = {
  WORKSPACE_ID: '00000000-0000-4000-8000-000000000001',
  TENANT_ID: '00000000-0000-4000-8000-000000000002',
  SQL_DATABASE_ID: '00000000-0000-4000-8000-000000000003',
  SEMANTIC_MODEL_ID: '00000000-0000-4000-8000-000000000004',
  APP_ITEM_ID: '00000000-0000-4000-8000-000000000005',
  HOSTING_URL: 'https://verify-app.webapp.fabricapps.net',
};
const DUMMY_OTHER = '00000000-0000-4000-8000-0000000000ff';

const log = (message = '') => console.log(message);

const USAGE = `Usage: node app-patches.mjs <command> [N] [options]
  (or npm run patch:<command> -- [N] [options])

Commands:
  capture <N>  Save the app commits since the previous checkpoint tag as app/<NN>-<slug>.patch,
               with workspace-specific values replaced by placeholders, and tag HEAD ${TAG_PREFIX}<N>.
  apply <N>    Apply the patches after the app's latest ${TAG_PREFIX}* tag, up to checkpoint <N>.
  verify [N]   Create an app from the lab template in a temp folder, apply the patches up to <N>
               (all by default) with dummy values, then run typecheck, build and test.

Options:
  --lab-dir <path>            Lab folder, for the app and the checkpoint state. Default: $PREL40_LABFILES,
                              or C:\\LabFiles on the lab VM (see checkpoint.mjs --help).
  --app-dir <path>            The app (capture, apply). Default: ~/${APP_NAME} on the lab VM,
                              else <lab folder>/${APP_NAME}.
  --name <slug>               Patch file name, after the number (capture). Default: the existing patch's,
                              or the first commit's subject.
  --placeholder <NAME=value>  Replace value with {{NAME}} (capture), or fill {{NAME}} with value (apply).
                              Repeatable. Values found automatically: WORKSPACE_ID, TENANT_ID, HOSTING_URL and
                              APP_ITEM_ID from rayfin/.deployments.json; SQL_DATABASE_ID and SEMANTIC_MODEL_ID
                              from the checkpoint state (<lab folder>/checkpoints/.state.json) for that workspace.
  --allow <value>             Keep this GUID or URL in the patch (capture). Repeatable.
  --keep                      Keep the temp app, even if the checks pass (verify).
  -h, --help                  Show this help.`;

// On Windows, npm and npx are .cmd files, which need a shell to run.
function quote(arg) {
  return process.platform === 'win32' && /[\s"&|<>^]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

function run(command, args, cwd) {
  const windows = process.platform === 'win32';
  const result = spawnSync(command, windows ? args.map(quote) : args, { cwd, stdio: 'inherit', shell: windows });
  if (result.error?.code === 'ENOENT') throw new UserError(`${command} is not installed or not on PATH.`);
  if (result.status !== 0) throw new UserError(`${command} ${args.join(' ')} failed (exit code ${result.status}).`);
}

function git(cwd, args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 }).trim();
  } catch (error) {
    if (allowFail) return null;
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    throw new UserError(`git ${args.join(' ')} failed.${output ? `\n${output}` : ''}`);
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const pad = (n) => String(n).padStart(2, '0');
const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '') || 'changes';
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function listPatches() {
  if (!existsSync(PATCH_DIR)) return [];
  return readdirSync(PATCH_DIR)
    .map((file) => file.match(/^(\d+)-(.+)\.patch$/))
    .filter(Boolean)
    .map(([file, n, slug]) => ({ n: Number(n), slug, file, path: join(PATCH_DIR, file) }))
    .sort((a, b) => a.n - b.n);
}

function checkApp(appDir) {
  if (!existsSync(join(appDir, 'rayfin', 'rayfin.yml'))) {
    throw new UserError(`${appDir} isn't a Rayfin app. Pick the app folder with --app-dir.`);
  }
  if (git(appDir, ['rev-parse', '--show-toplevel'], { allowFail: true }) === null) {
    throw new UserError(`${appDir} isn't a Git repository.`);
  }
}

// The latest checkpoint tag in the history of HEAD, below `below` if set.
function latestCheckpoint(appDir, below = Infinity) {
  const tags = git(appDir, ['tag', '--merged', 'HEAD', '--list', `${TAG_PREFIX}*`])
    .split('\n')
    .filter(Boolean)
    .map((tag) => Number(tag.slice(TAG_PREFIX.length)))
    .filter((n) => Number.isInteger(n) && n < below);
  return tags.length ? Math.max(...tags) : null;
}

function parsePlaceholders(entries = []) {
  const values = {};
  for (const entry of entries) {
    const match = entry.match(/^([A-Z][A-Z0-9_]*)=(.+)$/);
    if (!match) throw new UserError(`--placeholder must be NAME=value, with NAME in capitals, like SEMANTIC_MODEL_ID=<id>. Got: ${entry}`);
    values[match[1]] = match[2];
  }
  return values;
}

// This app's workspace-specific values, from its last deployment and the checkpoint state.
function appValues(appDir, statePath, overrides) {
  const deployments = readJson(join(appDir, 'rayfin', '.deployments.json'));
  const deployment = deployments?.deployments?.[deployments.active] ?? Object.values(deployments?.deployments ?? {})[0];
  const values = {};
  if (deployment) {
    Object.assign(values, {
      WORKSPACE_ID: deployment.fabricWorkspaceId,
      TENANT_ID: deployment.fabricTenantId,
      HOSTING_URL: deployment.hostingUrl,
      APP_ITEM_ID: deployment.fabricItemId,
    });
  }
  const workspaceId = overrides.WORKSPACE_ID ?? values.WORKSPACE_ID;
  const steps = (statePath && readJson(statePath))?.workspaces?.[workspaceId]?.steps;
  if (steps) Object.assign(values, { SQL_DATABASE_ID: steps.database?.id, SEMANTIC_MODEL_ID: steps.model?.id });
  Object.assign(values, overrides);
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value));
}

function capture(n, options) {
  const { defaultAppDir, statePath } = resolveLabDir(options['lab-dir']);
  const appDir = resolve(options['app-dir'] ?? defaultAppDir);
  checkApp(appDir);
  if (n <= BASE_CHECKPOINT) throw new UserError(`Patches start after checkpoint ${BASE_CHECKPOINT}, which creates the app from the template.`);

  const dirty = git(appDir, ['status', '--porcelain']);
  if (dirty) {
    log('Warning: these changes aren\'t committed, so they aren\'t in the patch:');
    log(dirty.replace(/^/gm, '  '));
    log('Commit them and capture again if they belong to the checkpoint.\n');
  }

  const baseN = latestCheckpoint(appDir, n);
  const base = baseN === null ? git(appDir, ['rev-list', '--max-parents=0', 'HEAD']).split('\n').pop() : `${TAG_PREFIX}${baseN}`;
  const from = baseN ?? BASE_CHECKPOINT;
  const skipped = listPatches().filter((patch) => patch.n > from && patch.n < n);
  if (skipped.length) {
    throw new UserError(
      `The app is at checkpoint ${from}, but app/${skipped[0].file} comes before checkpoint ${n}. ` +
        `Apply it first with npm run patch:apply -- ${skipped[0].n} --app-dir "${appDir}", then redo your changes on top.`,
    );
  }
  const commits = git(appDir, ['rev-list', '--reverse', `${base}..HEAD`]).split('\n').filter(Boolean);
  if (!commits.length) throw new UserError(`No commits since ${baseN === null ? 'the initial commit' : base}. Commit the checkpoint ${n} changes first.`);

  const values = appValues(appDir, statePath, parsePlaceholders(options.placeholder));
  let text = git(appDir, ['format-patch', '--stdout', '--zero-commit', '--no-signature', `${base}..HEAD`]) + '\n';
  const used = [];
  for (const [name, value] of Object.entries(values).sort((a, b) => b[1].length - a[1].length)) {
    const pattern = new RegExp(escapeRegExp(value), 'gi');
    if (pattern.test(text)) {
      used.push(name);
      text = text.replace(pattern, `{{${name}}}`);
    }
  }

  const allowed = new Set((options.allow ?? []).map((value) => value.toLowerCase()));
  const leaks = new Set();
  for (const line of text.split('\n')) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    for (const pattern of LEAKS) for (const match of line.match(pattern) ?? []) if (!allowed.has(match.toLowerCase())) leaks.add(match);
  }
  if (leaks.size) {
    throw new UserError(
      `The changes add values that look specific to your workspace or deployment:\n${[...leaks].map((leak) => `  ${leak}`).join('\n')}\n` +
        'Replace each one with a placeholder, with --placeholder NAME=<value> (then use the same name when applying), ' +
        'or keep it with --allow <value> if it\'s the same for everyone.',
    );
  }

  const existing = listPatches().filter((patch) => patch.n === n);
  const subject = git(appDir, ['log', '-1', '--format=%s', commits[0]]);
  const slug = options.name ? slugify(options.name) : (existing[0]?.slug ?? slugify(subject));
  for (const patch of existing) unlinkSync(patch.path);
  mkdirSync(PATCH_DIR, { recursive: true });
  const path = join(PATCH_DIR, `${pad(n)}-${slug}.patch`);
  writeFileSync(path, text);
  git(appDir, ['tag', '-f', `${TAG_PREFIX}${n}`]);

  log(`Saved ${commits.length} commit(s) since ${baseN === null ? 'the initial commit' : base} to ${path}.`);
  log(`Placeholders: ${used.length ? used.map((name) => `{{${name}}}`).join(', ') : 'none'}.`);
  log(`Tagged the app's HEAD ${TAG_PREFIX}${n}.`);
  log(`\nNext, check the patches apply to a fresh app and build: npm run patch:verify`);
}

// Rayfin adds the hosting URL (and 127.0.0.1) to allowedRedirectUris when it deploys, without committing it.
function onlyRedirectUris(appDir, dirty) {
  if (dirty !== 'M rayfin/rayfin.yml') return false;
  const changes = git(appDir, ['diff', '-U0', '--', 'rayfin/rayfin.yml'])
    .split('\n')
    .filter((line) => /^[+-]/.test(line) && !/^(\+\+\+|---) /.test(line));
  return changes.length > 0 && changes.every((line) => /^\+\s*-\s*https?:\/\/\S+\s*$/.test(line));
}

function apply(n, options, { appDir, values: givenValues } = {}) {
  let statePath;
  if (!appDir) {
    const lab = resolveLabDir(options['lab-dir']);
    appDir = resolve(options['app-dir'] ?? lab.defaultAppDir);
    statePath = lab.statePath;
  }
  checkApp(appDir);
  const current = latestCheckpoint(appDir) ?? BASE_CHECKPOINT;
  const patches = listPatches().filter((patch) => patch.n > current && patch.n <= n);
  if (!patches.length) {
    log(`The app already has the changes up to checkpoint ${n}${current > n ? ` (it's at checkpoint ${current})` : ''}.`);
    return;
  }

  const values = givenValues ?? appValues(appDir, statePath, parsePlaceholders(options.placeholder));
  const contents = patches.map((patch) => {
    const text = readFileSync(patch.path, 'utf8');
    const missing = [...new Set([...text.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)].map((match) => match[1]))].filter((name) => !values[name]);
    if (missing.length) {
      throw new UserError(
        `app/${patch.file} needs ${missing.map((name) => `{{${name}}}`).join(', ')}, which aren't known for this app. ` +
          'Deploy the app and run the checkpoint first, or pass --placeholder NAME=<value>.',
      );
    }
    return text.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (_, name) => values[name]);
  });

  const dirty = git(appDir, ['status', '--porcelain', '--untracked-files=no']);
  let stashed = false;
  if (dirty) {
    if (!onlyRedirectUris(appDir, dirty)) {
      throw new UserError(`The app has uncommitted changes. Commit or stash them first:\n${dirty.replace(/^/gm, '  ')}`);
    }
    git(appDir, ['stash', 'push', '--quiet', '-m', 'lab: redirect URIs from the deployment', '--', 'rayfin/rayfin.yml']);
    stashed = true;
  }

  const identity = git(appDir, ['config', 'user.email'], { allowFail: true }) ? [] : ['-c', 'user.name=Lab User', '-c', 'user.email=lab.user@example.com'];
  const tempDir = mkdtempSync(join(tmpdir(), 'prel40-patch-'));
  try {
    patches.forEach((patch, index) => {
      const file = join(tempDir, patch.file);
      writeFileSync(file, contents[index]);
      if (git(appDir, [...identity, 'am', '--3way', '--quiet', file], { allowFail: true }) === null) {
        git(appDir, ['am', '--abort'], { allowFail: true });
        throw new UserError(
          `app/${patch.file} doesn't apply: the app differs from what the patch expects. ` +
            `The app is back at checkpoint ${latestCheckpoint(appDir) ?? BASE_CHECKPOINT}.`,
        );
      }
      git(appDir, ['tag', '-f', `${TAG_PREFIX}${patch.n}`]);
      log(`Applied app/${patch.file}; tagged ${TAG_PREFIX}${patch.n}.`);
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
    if (stashed && git(appDir, ['stash', 'pop', '--quiet'], { allowFail: true }) === null) {
      log('Warning: couldn\'t restore the redirect URIs in rayfin/rayfin.yml. Run "git stash pop" in the app and fix the conflict.');
    }
  }
}

// Same as checkpoint 4: rayfin init from the lab template, with the Rayfin CLI version that checkpoint.mjs pins.
function createApp(root, options) {
  const rayfinCli = readFileSync(join(scriptDir, 'checkpoint.mjs'), 'utf8').match(/const RAYFIN_CLI = '([^']+)'/)?.[1];
  if (!rayfinCli) throw new UserError("Can't find RAYFIN_CLI in checkpoint.mjs.");
  // The lab folder's template if there is one, like checkpoint 4; otherwise the repository's.
  let labDir = null;
  try {
    labDir = resolveLabDir(options['lab-dir']).labDir;
  } catch {}
  const template = prepareTemplate(labDir ?? root);
  log(`Creating the app from ${template.path} with ${rayfinCli}...`);
  try {
    run('npx', ['--yes', '--package', rayfinCli, 'rayfin', 'init', APP_NAME, '--template', template.path, '--yes'], root);
  } finally {
    template.cleanup();
  }
  const appDir = join(root, APP_NAME);
  git(appDir, ['init', '--quiet']);
  git(appDir, ['config', 'user.name', 'Lab User']);
  git(appDir, ['config', 'user.email', 'lab.user@example.com']);
  git(appDir, ['add', '-A']);
  git(appDir, ['commit', '--quiet', '-m', INITIAL_COMMIT]);
  git(appDir, ['tag', `${TAG_PREFIX}${BASE_CHECKPOINT}`]);
  return appDir;
}

function verify(n, options) {
  const patches = listPatches().filter((patch) => n === undefined || patch.n <= n);
  if (!patches.length) {
    log(`No patches in ${PATCH_DIR}${n === undefined ? '' : ` up to checkpoint ${n}`} yet. Capture one with npm run patch:capture -- <N>.`);
    return;
  }
  const upTo = n ?? patches.at(-1).n;
  const root = mkdtempSync(join(tmpdir(), 'prel40-verify-'));
  let passed = false;
  try {
    const appDir = createApp(root, options);
    log(`\nApplying ${patches.length} patch(es) with dummy values...`);
    const values = { ...DUMMY_VALUES };
    for (const patch of patches) {
      for (const [, name] of readFileSync(patch.path, 'utf8').matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)) values[name] ??= DUMMY_OTHER;
    }
    apply(upTo, options, { appDir, values });

    const scripts = readJson(join(appDir, 'package.json'))?.scripts ?? {};
    for (const script of ['typecheck', 'build', 'test'].filter((name) => scripts[name])) {
      log(`\nnpm run ${script}`);
      run('npm', ['run', script], appDir);
    }
    passed = true;
    log(`\nPASS  The patches up to checkpoint ${upTo} apply to a fresh app, and it type-checks, builds and passes its tests.`);
  } finally {
    if (passed && !options.keep) rmSync(root, { recursive: true, force: true });
    else log(`The app is in ${join(root, APP_NAME)}. Delete ${root} when you're done.`);
  }
}

function main() {
  const { values: options, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'lab-dir': { type: 'string' },
      'app-dir': { type: 'string' },
      name: { type: 'string' },
      placeholder: { type: 'string', multiple: true },
      allow: { type: 'string', multiple: true },
      keep: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [command, rawN] = positionals;
  if (options.help || !command) return log(USAGE);
  const n = rawN === undefined ? undefined : Number(rawN);
  if (rawN !== undefined && !Number.isInteger(n)) throw new UserError(`The checkpoint must be a number. Got: ${rawN}`);
  if (command === 'verify') return verify(n, options);
  if (n === undefined) throw new UserError(`${command} needs a checkpoint number, like: ${command} 6`);
  if (command === 'capture') return capture(n, options);
  if (command === 'apply') return apply(n, options);
  throw new UserError(`Unknown command: ${command}\n\n${USAGE}`);
}

try {
  main();
} catch (error) {
  console.error(`\nError: ${error instanceof UserError ? error.message : (error.stack ?? error.message)}`);
  process.exitCode = 1;
}
