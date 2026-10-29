#!/usr/bin/env node
// PREL40 lab checkpoints: does the lab exercises for you, so attendees who are behind can catch up,
// and testers or attendees can jump straight to a later part of the lab.
//
//   --to 3  Exercises 2 and 3, in the Fabric workspace you created in Exercise 1
//           (or in a new one: pass --workspace <name> and the script creates it on your Fabric capacity):
//           1. creates the CaldovaHomeLoans SQL database (or reuses it) and runs portfolio-seed.sql,
//           2. creates the CaldovaPortfolio Direct Lake semantic model from ./CaldovaPortfolio.SemanticModel
//              (or updates it), then refreshes it,
//           3. checks the measures against the reference values in manifest.json.
//   --to 4  Everything above, then Exercise 4:
//           4. installs the rayfin plugin from the awesome-copilot marketplace in the GitHub Copilot app,
//           5. creates the home-loan-desk Rayfin app from the lab template, with an initial Git commit
//              (or reuses the folder if it already exists),
//           6. signs in to Rayfin and deploys the app to the workspace, then checks the hosted URL
//              (retrying with plaintext token storage if the OS keychain isn't available).
//
// Usage: npm install, then node checkpoint.mjs --to <3|4> [options]. Run with --help for the options.
// Sign-in: uses the Azure CLI if you're signed in with `az login`, otherwise opens a browser.

import { AzureCliCredential, ChainedTokenCredential, InteractiveBrowserCredential } from '@azure/identity';
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Connection, Request } from 'tedious';

const WORKSPACE_PREFIX = 'PREL40-homeloans';
const DATABASE_NAME = 'CaldovaHomeLoans';
const MODEL_NAME = 'CaldovaPortfolio';
const TABLES = ['Branch', 'Date', 'LoanApplication', 'LoanProduct'];
const OPEN_EXCLUDED_STAGES = ['Closed', 'Withdrawn'];
const APP_NAME = 'home-loan-desk';
const RAYFIN_CLI = '@microsoft/rayfin-cli@1.36.2';
const RAYFIN_PLUGIN = 'rayfin@awesome-copilot';
const CHECKPOINTS = {
  3: { label: 'Exercises 2 and 3', next: 'Exercise 4' },
  4: { label: 'Exercises 2 to 4', next: 'Exercise 5' },
};

const FABRIC_API = 'https://api.fabric.microsoft.com/v1';
const POWERBI_API = 'https://api.powerbi.com/v1.0/myorg';
const ONELAKE = 'https://onelake.dfs.fabric.microsoft.com';
const SCOPES = {
  fabric: 'https://api.fabric.microsoft.com/.default',
  powerbi: 'https://analysis.windows.net/powerbi/api/.default',
  sql: 'https://database.windows.net/.default',
  storage: 'https://storage.azure.com/.default',
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const modelDir = join(scriptDir, `${MODEL_NAME}.SemanticModel`);

class UserError extends Error {}
class RefreshError extends UserError {}

const log = (message = '') => process.stderr.write(`${message}\n`);
const step = (message) => log(`\n> ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isGuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// ---------------------------------------------------------------------------
// Inputs

function findFile(label, candidates) {
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) throw new UserError(`Can't find ${label}. Looked in:\n  ${candidates.filter(Boolean).join('\n  ')}`);
  return found;
}

// On the VM: C:\LabFiles\checkpoints next to C:\LabFiles\data. In the repo: scripts/checkpoints next to data/.
function loadInputs(sqlPath) {
  const seedPath = findFile('portfolio-seed.sql', [
    sqlPath,
    join(scriptDir, '..', 'data', 'portfolio-seed.sql'),
    join(scriptDir, '..', '..', 'data', 'portfolio-seed.sql'),
  ]);
  const manifestPath = findFile('manifest.json', [
    join(scriptDir, 'manifest.json'),
    join(scriptDir, '..', '..', 'data', 'generator', 'manifest.json'),
  ]);
  if (!existsSync(join(modelDir, 'definition.pbism'))) throw new UserError(`Missing semantic model definition in ${modelDir}`);
  return { seedPath, seedSql: readFileSync(seedPath, 'utf8'), manifest: JSON.parse(readFileSync(manifestPath, 'utf8')) };
}

// ---------------------------------------------------------------------------
// Auth and HTTP

function createTokenProvider(tenantId) {
  const credential = new ChainedTokenCredential(
    new AzureCliCredential(tenantId ? { tenantId } : {}),
    new InteractiveBrowserCredential(tenantId ? { tenantId } : {}),
  );
  const cache = new Map();
  return async (scope) => {
    const cached = cache.get(scope);
    if (cached && cached.expiresOnTimestamp - Date.now() > 5 * 60 * 1000) return cached.token;
    const token = await credential.getToken(scope);
    if (!token) throw new UserError(`Couldn't get a token for ${scope}.`);
    cache.set(scope, token);
    return token.token;
  };
}

async function request(getToken, method, url, { scope = SCOPES.fabric, body, allow = [] } = {}) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${await getToken(scope)}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (response.status === 429 && attempt <= 5) {
      await sleep(Number(response.headers.get('retry-after') ?? 10) * 1000);
      continue;
    }
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    if (!response.ok && !allow.includes(response.status)) {
      const reason = json?.error?.message ?? json?.message ?? json?.errorCode ?? text ?? response.statusText;
      throw new UserError(`${method} ${url} failed (${response.status}): ${reason}`);
    }
    return { status: response.status, headers: response.headers, json };
  }
}

// Fabric long-running operations: 202 with a Location header to poll until Succeeded or Failed.
async function waitForOperation(getToken, response, label) {
  if (response.status !== 202) return;
  const location = response.headers.get('location');
  if (!location) return;
  for (let attempt = 0; attempt < 120; attempt++) {
    await sleep(Number(response.headers.get('retry-after') ?? 5) * 1000);
    const { json } = await request(getToken, 'GET', location);
    if (json?.status === 'Succeeded') return;
    if (json?.status === 'Failed') throw new UserError(`${label} failed: ${json.error?.message ?? JSON.stringify(json)}`);
  }
  throw new UserError(`${label} didn't finish in time.`);
}

async function listAll(getToken, url) {
  const items = [];
  let next = url;
  while (next) {
    const { json } = await request(getToken, 'GET', next);
    items.push(...(json.value ?? []));
    next = json.continuationUri;
  }
  return items;
}

// ---------------------------------------------------------------------------
// Workspace

async function resolveWorkspace(getToken, wanted, capacity) {
  const workspaces = (await listAll(getToken, `${FABRIC_API}/workspaces`)).filter((ws) => ws.type === 'Workspace');
  let matches;
  if (wanted && isGuid(wanted)) matches = workspaces.filter((ws) => ws.id.toLowerCase() === wanted.toLowerCase());
  else if (wanted) matches = workspaces.filter((ws) => ws.displayName.toLowerCase() === wanted.toLowerCase());
  else matches = workspaces.filter((ws) => ws.displayName.toLowerCase().startsWith(WORKSPACE_PREFIX.toLowerCase()));

  if (matches.length === 1) {
    log(`Using workspace ${matches[0].displayName} (${matches[0].id}).`);
    return matches[0];
  }
  if (matches.length === 0 && wanted && !isGuid(wanted)) return createWorkspace(getToken, wanted, capacity);
  const visible = workspaces.map((ws) => `  ${ws.displayName} (${ws.id})`).join('\n') || '  (none)';
  if (matches.length === 0) {
    const what = wanted ? `"${wanted}"` : `a name starting with ${WORKSPACE_PREFIX}`;
    throw new UserError(
      `No workspace found with ${what}. Create it in Exercise 1, or pass --workspace <name> to create it.\n` +
        `If you signed in to the wrong tenant, pass --tenant <tenant-id>.\nWorkspaces you can see:\n${visible}`,
    );
  }
  throw new UserError(`Several workspaces match. Pass --workspace <name|id>:\n${matches.map((ws) => `  ${ws.displayName} (${ws.id})`).join('\n')}`);
}

// Like the portal, put the new workspace on the Fabric capacity you can use. Premium Per User capacities
// (PP SKUs) can't hold Fabric items, so only F SKUs (including trials, FT) count.
async function pickCapacity(getToken, wanted) {
  const capacities = await listAll(getToken, `${FABRIC_API}/capacities`);
  const describe = (list) => list.map((c) => `  ${c.displayName} (${c.id}, ${c.sku}, ${c.region}, ${c.state})`).join('\n') || '  (none)';
  if (wanted) {
    const match = capacities.find((c) => c.id.toLowerCase() === wanted.toLowerCase() || c.displayName.toLowerCase() === wanted.toLowerCase());
    if (!match) throw new UserError(`No capacity found with "${wanted}". Capacities you can use:\n${describe(capacities)}`);
    return match;
  }
  const fabric = capacities.filter((c) => c.state === 'Active' && /^F/i.test(c.sku));
  if (fabric.length === 1) return fabric[0];
  if (fabric.length === 0) {
    throw new UserError(`No active Fabric capacity found to create the workspace on. Capacities you can use:\n${describe(capacities)}`);
  }
  throw new UserError(`Several Fabric capacities are available. Pass --capacity <name|id>:\n${describe(fabric)}`);
}

async function createWorkspace(getToken, name, capacityName) {
  const capacity = await pickCapacity(getToken, capacityName);
  log(`Creating workspace ${name} on capacity ${capacity.displayName} (${capacity.sku}, ${capacity.region})...`);
  const { json } = await request(getToken, 'POST', `${FABRIC_API}/workspaces`, {
    body: { displayName: name, capacityId: capacity.id },
  });
  log(`Created workspace ${json.displayName} (${json.id}).`);
  return json;
}

async function findItem(getToken, workspaceId, type, name) {
  const items = await listAll(getToken, `${FABRIC_API}/workspaces/${workspaceId}/items?type=${type}`);
  return items.find((item) => item.displayName.toLowerCase() === name.toLowerCase());
}

// ---------------------------------------------------------------------------
// SQL database

async function ensureDatabase(getToken, workspaceId) {
  let database = await findItem(getToken, workspaceId, 'SQLDatabase', DATABASE_NAME);
  if (database) {
    log(`Reusing SQL database ${DATABASE_NAME} (${database.id}).`);
  } else {
    log(`Creating SQL database ${DATABASE_NAME}. This takes a minute or two...`);
    const response = await request(getToken, 'POST', `${FABRIC_API}/workspaces/${workspaceId}/sqlDatabases`, {
      body: { displayName: DATABASE_NAME },
    });
    await waitForOperation(getToken, response, 'Creating the SQL database');
    database = response.json?.id ? response.json : await findItem(getToken, workspaceId, 'SQLDatabase', DATABASE_NAME);
    if (!database) throw new UserError('The SQL database was created but not found in the workspace.');
    log(`Created SQL database ${DATABASE_NAME} (${database.id}).`);
  }

  for (let attempt = 0; attempt < 60; attempt++) {
    const { json } = await request(getToken, 'GET', `${FABRIC_API}/workspaces/${workspaceId}/sqlDatabases/${database.id}`);
    if (json.properties?.serverFqdn && json.properties?.databaseName) return { id: database.id, ...json.properties };
    await sleep(5000);
  }
  throw new UserError('The SQL database has no connection details yet. Try again in a few minutes.');
}

function runSql({ serverFqdn, databaseName }, token, sql) {
  const [server, port] = serverFqdn.split(',');
  return new Promise((resolve, reject) => {
    const connection = new Connection({
      server,
      authentication: { type: 'azure-active-directory-access-token', options: { token } },
      options: { database: databaseName, port: Number(port || 1433), encrypt: true, connectTimeout: 60000, requestTimeout: 300000 },
    });
    connection.on('connect', (error) => {
      if (error) return reject(error);
      const rows = [];
      const sqlRequest = new Request(sql, (requestError) => {
        connection.close();
        if (requestError) reject(requestError);
        else resolve(rows);
      });
      sqlRequest.on('row', (columns) => rows.push(Object.fromEntries(columns.map((column) => [column.metadata.colName, column.value]))));
      connection.execSql(sqlRequest);
    });
    connection.connect();
  });
}

async function seedDatabase(getToken, database, seedSql, manifest) {
  let rows;
  for (let attempt = 1; ; attempt++) {
    try {
      rows = await runSql(database, await getToken(SCOPES.sql), seedSql);
      break;
    } catch (error) {
      // A new database can refuse connections for a short while after it's provisioned.
      if (attempt >= 6) throw new UserError(`Running portfolio-seed.sql failed: ${error.message}`);
      log(`  Database not ready yet (${error.message.split('\n')[0]}). Retrying in 15 seconds...`);
      await sleep(15000);
    }
  }
  const counts = Object.fromEntries(rows.map((row) => [row.CurrentStage, row.Applications]));
  const mismatches = manifest.byStage.filter(({ stage, applications }) => counts[stage] !== applications);
  for (const { stage } of manifest.byStage) log(`  ${stage.padEnd(20)} ${String(counts[stage] ?? '-').padStart(3)}`);
  if (mismatches.length > 0) throw new UserError(`Seed counts don't match manifest.json for: ${mismatches.map((m) => m.stage).join(', ')}`);
  log('Seeded 200 applications. Stage counts match the reference.');
}

// Every SQL database replicates to OneLake; the semantic model reads that copy.
async function waitForReplication(getToken, workspaceId, databaseId) {
  const pending = new Set(TABLES);
  for (let attempt = 0; attempt < 60 && pending.size > 0; attempt++) {
    for (const table of [...pending]) {
      const directory = `${databaseId}/Tables/dbo/${table}/_delta_log`;
      const { status, json } = await request(
        getToken,
        'GET',
        `${ONELAKE}/${workspaceId}?resource=filesystem&recursive=false&directory=${encodeURIComponent(directory)}`,
        { scope: SCOPES.storage, allow: [404] },
      );
      if (status === 200 && (json?.paths ?? []).length > 0) pending.delete(table);
    }
    if (pending.size > 0) {
      if (attempt === 0) log(`  Waiting for ${[...pending].join(', ')} to replicate to OneLake...`);
      await sleep(10000);
    }
  }
  if (pending.size > 0) throw new UserError(`These tables didn't replicate to OneLake in time: ${[...pending].join(', ')}`);
  log('All four tables are in OneLake.');
}

// ---------------------------------------------------------------------------
// Semantic model

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

function buildDefinition(values) {
  const parts = listFiles(modelDir).map((path) => {
    let content = readFileSync(path, 'utf8');
    for (const [key, value] of Object.entries(values)) content = content.split(`{{${key}}}`).join(value);
    const leftover = content.match(/\{\{[A-Z_]+\}\}/);
    if (leftover) throw new UserError(`Unknown placeholder ${leftover[0]} in ${path}`);
    return {
      path: relative(modelDir, path).split(sep).join('/'),
      payload: Buffer.from(content, 'utf8').toString('base64'),
      payloadType: 'InlineBase64',
    };
  });
  return { parts };
}

async function deployModel(getToken, workspaceId, databaseId) {
  const definition = buildDefinition({ WORKSPACE_ID: workspaceId, SQL_DATABASE_ID: databaseId });
  const existing = await findItem(getToken, workspaceId, 'SemanticModel', MODEL_NAME);
  if (existing) {
    log(`Updating semantic model ${MODEL_NAME} (${existing.id})...`);
    const response = await request(getToken, 'POST', `${FABRIC_API}/workspaces/${workspaceId}/semanticModels/${existing.id}/updateDefinition`, {
      body: { definition },
    });
    await waitForOperation(getToken, response, 'Updating the semantic model');
    return existing.id;
  }
  log(`Creating semantic model ${MODEL_NAME}...`);
  const response = await request(getToken, 'POST', `${FABRIC_API}/workspaces/${workspaceId}/semanticModels`, {
    body: { displayName: MODEL_NAME, definition },
  });
  await waitForOperation(getToken, response, 'Creating the semantic model');
  const model = response.json?.id ? response.json : await findItem(getToken, workspaceId, 'SemanticModel', MODEL_NAME);
  if (!model) throw new UserError('The semantic model was created but not found in the workspace.');
  log(`Created semantic model ${MODEL_NAME} (${model.id}).`);
  return model.id;
}

async function refreshModel(getToken, workspaceId, modelId) {
  const base = `${POWERBI_API}/groups/${workspaceId}/datasets/${modelId}/refreshes`;
  const response = await request(getToken, 'POST', base, { scope: SCOPES.powerbi, body: { type: 'full' } });
  const location = response.headers.get('location');
  if (!location) return;
  for (let attempt = 0; attempt < 60; attempt++) {
    await sleep(5000);
    const { json } = await request(getToken, 'GET', location, { scope: SCOPES.powerbi });
    if (json?.status === 'Completed') return;
    if (json?.status === 'Failed' || json?.status === 'Cancelled') {
      const details = (json.messages ?? []).map((m) => m.message).join(' ') || JSON.stringify(json);
      throw new RefreshError(`Refreshing the semantic model failed: ${details}`);
    }
  }
  throw new UserError("Refreshing the semantic model didn't finish in time.");
}

async function runDax(getToken, workspaceId, modelId, query) {
  const { json } = await request(getToken, 'POST', `${POWERBI_API}/groups/${workspaceId}/datasets/${modelId}/executeQueries`, {
    scope: SCOPES.powerbi,
    body: { queries: [{ query }], serializerSettings: { includeNulls: true } },
  });
  const result = json.results?.[0];
  if (result?.error) throw new UserError(`DAX query failed: ${result.error.message ?? JSON.stringify(result.error)}`);
  return result?.tables?.[0]?.rows ?? [];
}

const TOTALS_QUERY = `EVALUATE
ROW (
    "Open applications", [Open applications],
    "Requested amount in pipeline", [Requested amount in pipeline],
    "Average days in current stage", [Average days in current stage],
    "Stalled applications", [Stalled applications]
)`;

const BY_STAGE_QUERY = `EVALUATE
SUMMARIZECOLUMNS (
    LoanApplication[CurrentStage],
    "Open applications", [Open applications],
    "Stalled applications", [Stalled applications]
)
ORDER BY [Stalled applications] DESC`;

// Returns a list of mismatches; empty when the model returns the reference values.
async function checkMeasures(getToken, workspaceId, modelId, manifest) {
  const problems = [];
  const [totals] = await runDax(getToken, workspaceId, modelId, TOTALS_QUERY);
  for (const [measure, expected] of Object.entries(manifest.referenceValues)) {
    const actual = totals?.[`[${measure}]`];
    const ok = typeof actual === 'number' && Math.round(actual * 100) === Math.round(expected * 100);
    const shown = typeof actual === 'number' ? Number(actual.toFixed(2)).toLocaleString('en-US') : '(blank)';
    log(`  ${ok ? 'PASS' : 'FAIL'}  ${measure.padEnd(30)} ${shown}${ok ? '' : ` (expected ${expected})`}`);
    if (!ok) problems.push(measure);
  }

  const rows = await runDax(getToken, workspaceId, modelId, BY_STAGE_QUERY);
  const byStage = Object.fromEntries(rows.map((row) => [row['LoanApplication[CurrentStage]'], row]));
  for (const { stage, applications, stalled } of manifest.byStage) {
    if (OPEN_EXCLUDED_STAGES.includes(stage)) continue;
    const row = byStage[stage];
    const ok = row?.['[Open applications]'] === applications && (row?.['[Stalled applications]'] ?? 0) === stalled;
    if (!ok) {
      log(`  FAIL  ${stage}: ${row?.['[Open applications]'] ?? 0} open, ${row?.['[Stalled applications]'] ?? 0} stalled (expected ${applications}, ${stalled})`);
      problems.push(stage);
    }
  }
  const top = rows[0]?.['LoanApplication[CurrentStage]'];
  if (problems.length === 0) log(`  PASS  By stage (${top} first, ${rows[0]['[Stalled applications]']} stalled)`);
  return problems;
}

// After a re-seed, OneLake briefly drops or serves the previous copy of the re-created tables, so the
// refresh can fail or return old values. Refresh and check again until the model matches.
async function refreshAndCheck(getToken, workspaceId, modelId, manifest) {
  const attempts = 10;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let problem;
    try {
      await refreshModel(getToken, workspaceId, modelId);
      const mismatches = await checkMeasures(getToken, workspaceId, modelId, manifest);
      if (mismatches.length === 0) return;
      problem = "The measures don't match the reference values.";
    } catch (error) {
      if (!(error instanceof RefreshError)) throw error;
      problem = error.message;
    }
    if (attempt === attempts) throw new UserError(`${problem}\nCheck the model in the Fabric portal, or run the script again in a few minutes.`);
    log(`  Not ready yet: OneLake is probably still replicating the new data. Trying again in 20 seconds (${attempt}/${attempts - 1})...`);
    await sleep(20000);
  }
}

// ---------------------------------------------------------------------------
// Exercise 4: Rayfin app

const tokenClaims = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));

// On Windows, npx, npm and git shims are .cmd files, which need a shell to run.
function quote(arg) {
  return process.platform === 'win32' && /[\s"&|<>^]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

// capture: collect the output instead of showing it. tee: show it and also collect it.
function runCommand(command, args, { cwd, capture = false, tee = false } = {}) {
  return new Promise((done, fail) => {
    const windows = process.platform === 'win32';
    const child = spawn(command, windows ? args.map(quote) : args, {
      cwd,
      shell: windows,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : tee ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    });
    let output = '';
    if (capture || tee) {
      child.stdout.on('data', (chunk) => {
        output += chunk;
        if (tee) process.stdout.write(chunk);
      });
      child.stderr.on('data', (chunk) => {
        output += chunk;
        if (tee) process.stderr.write(chunk);
      });
    }
    child.on('error', (error) =>
      fail(error.code === 'ENOENT' ? new UserError(`${command} is not installed or not on PATH.`) : error),
    );
    child.on('close', (code) => {
      if (code === 0) return done(output.trim());
      const error = new UserError(`${command} ${args.join(' ')} failed (exit code ${code}).${capture && output ? `\n${output.trim()}` : ''}`);
      error.output = output;
      fail(error);
    });
  });
}

// On the VM the template is C:\LabFiles\template\home-loan-desk. In the repo, src/home-loan-desk can hold
// local state (rayfin/.env, deployments, node_modules), so copy only the files Git tracks to a temp folder.
function prepareTemplate() {
  const vmTemplate = join(scriptDir, '..', 'template', APP_NAME);
  if (existsSync(join(vmTemplate, 'rayfin-template.yml'))) return { path: vmTemplate, cleanup: () => {} };

  const repoTemplate = join(scriptDir, '..', '..', 'src', APP_NAME);
  if (!existsSync(join(repoTemplate, 'rayfin-template.yml'))) {
    throw new UserError(`Can't find the lab template. Looked in:\n  ${vmTemplate}\n  ${repoTemplate}`);
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

// Exercise 4, Task 1 installs the Rayfin plugin from the awesome-copilot marketplace in the GitHub Copilot app.
// The Copilot CLI shares the app's plugins (~/.copilot, or COPILOT_HOME), so install it with the CLI.
// Returns true when the app needs a restart to load the plugin.
async function installRayfinPlugin() {
  // On Windows the shell reports a missing command as a plain failure, so probe it instead of relying on ENOENT.
  const hasCopilot = await runCommand('copilot', ['--version'], { capture: true }).then(
    () => true,
    () => false,
  );
  const copilot = (args, options) =>
    hasCopilot ? runCommand('copilot', args, options) : runCommand('npx', ['--yes', '@github/copilot', ...args], options);
  try {
    const installed = await copilot(['plugin', 'list'], { capture: true });
    const line = installed.split('\n').find((entry) => /^\W*rayfin@awesome-copilot\b/i.test(entry));
    if (line && /\[disabled\]/i.test(line)) {
      log('The rayfin plugin is installed but disabled; enabling it...');
      await copilot(['plugin', 'enable', RAYFIN_PLUGIN], { capture: true });
      return true;
    }
    if (line) {
      log('The rayfin plugin is already installed.');
      return false;
    }
    log(`Installing the ${RAYFIN_PLUGIN} plugin...`);
    await copilot(['plugin', 'install', RAYFIN_PLUGIN], { capture: true });
    log(`  PASS  ${RAYFIN_PLUGIN} installed`);
    return true;
  } catch (error) {
    log(`  WARN  Couldn't install the rayfin plugin: ${error.message}`);
    log(`        Install it from the GitHub Copilot app (Exercise 4, Task 1), or run: copilot plugin install ${RAYFIN_PLUGIN}`);
    return false;
  }
}

async function createApp(appDir) {
  if (existsSync(join(appDir, 'rayfin', 'rayfin.yml'))) {
    log(`${appDir} already exists; reusing it.`);
    return;
  }
  if (existsSync(appDir) && readdirSync(appDir).length > 0) {
    throw new UserError(`${appDir} exists but isn't a Rayfin app. Move or delete it, or pick another folder with --app-dir.`);
  }

  const template = prepareTemplate();
  try {
    log(`Creating the app from ${template.path}...`);
    mkdirSync(dirname(appDir), { recursive: true });
    await runCommand('npx', ['--yes', '--package', RAYFIN_CLI, 'rayfin', 'init', basename(appDir), '--template', template.path, '--yes'], {
      cwd: dirname(appDir),
    });
  } finally {
    template.cleanup();
  }

  log('Initializing a Git repository with an initial commit...');
  await runCommand('git', ['init', '--quiet'], { cwd: appDir });
  const hasIdentity = await runCommand('git', ['config', 'user.email'], { cwd: appDir, capture: true }).then(
    (email) => email.length > 0,
    () => false,
  );
  if (!hasIdentity) {
    await runCommand('git', ['config', 'user.name', 'Lab User'], { cwd: appDir });
    await runCommand('git', ['config', 'user.email', 'lab.user@example.com'], { cwd: appDir });
  }
  await runCommand('git', ['add', '-A'], { cwd: appDir });
  await runCommand('git', ['commit', '--quiet', '-m', 'Initial commit from the lab template'], { cwd: appDir });
}

// Without an OS keychain, Rayfin refuses to store its tokens unless plaintext storage is allowed. Allow it then,
// and keep it for the next Rayfin commands.
let rayfinPlaintextTokens = false;
async function runRayfin(args, appDir) {
  const run = () =>
    runCommand('npx', ['rayfin', ...args, ...(rayfinPlaintextTokens ? ['--encryption-fallback-enabled'] : [])], { cwd: appDir, tee: true });
  try {
    return await run();
  } catch (error) {
    if (rayfinPlaintextTokens || !/OS keychain is not available/i.test(error.output ?? '')) throw error;
    log('No OS keychain is available, so trying again with plaintext token storage (--encryption-fallback-enabled)...');
    rayfinPlaintextTokens = true;
    return run();
  }
}

async function rayfinSignIn(appDir, tenantId, fabricUser) {
  const status = await runCommand('npx', ['rayfin', 'login', 'status'], { cwd: appDir, capture: true }).catch(() => '');
  const field = (name) => status.match(new RegExp(`^\\s*${name}:\\s*(\\S+)`, 'mi'))?.[1];
  if (/^\s*Signed in/m.test(status) && field('Tenant') === tenantId) {
    const rayfinUser = field('User');
    log(`Already signed in to Rayfin${rayfinUser ? ` as ${rayfinUser}` : ''}.`);
    if (rayfinUser && fabricUser && rayfinUser.toLowerCase() !== fabricUser.toLowerCase()) {
      log(`  Note: steps 2 and 3 used ${fabricUser}. If the deployment fails with a permissions error, run`);
      log(`  "npx rayfin login --tenant ${tenantId}" in ${appDir} and pick that account, then run the checkpoint again.`);
    }
    return;
  }
  log('Signing in to Rayfin. In the browser window that opens, pick the same account as before.');
  await runRayfin(['login', '--tenant', tenantId], appDir);
}

async function deployApp(appDir, workspaceId, tenantId) {
  await runRayfin(['up', '--workspace-id', workspaceId, '--tenant', tenantId, '--yes'], appDir);

  const deploymentsPath = join(appDir, 'rayfin', '.deployments.json');
  const deployments = existsSync(deploymentsPath) ? JSON.parse(readFileSync(deploymentsPath, 'utf8')).deployments : {};
  const deployment = Object.values(deployments ?? {}).find((entry) => entry.fabricWorkspaceId === workspaceId);
  if (!deployment?.hostingUrl) throw new UserError(`The deployment finished, but ${deploymentsPath} has no hosted URL for this workspace.`);

  // Static hosting is protected, so the app may answer with a redirect to sign in: anything but a server error is fine.
  for (let attempt = 1; ; attempt++) {
    const status = await fetch(deployment.hostingUrl, { redirect: 'manual' }).then(
      (response) => response.status,
      () => 0,
    );
    if (status > 0 && status < 500) {
      log(`  PASS  ${deployment.hostingUrl} responds (${status})`);
      return deployment;
    }
    if (attempt === 6) throw new UserError(`The app was deployed, but ${deployment.hostingUrl} doesn't respond (${status || 'no response'}).`);
    log(`  The app isn't responding yet (${status || 'no response'}). Trying again in 10 seconds...`);
    await sleep(10000);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const { values } = parseArgs({
    options: {
      to: { type: 'string' },
      workspace: { type: 'string', short: 'w' },
      capacity: { type: 'string' },
      tenant: { type: 'string', short: 't' },
      'app-dir': { type: 'string' },
      sql: { type: 'string' },
      'skip-seed': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const usage = () => {
    log('Usage: node checkpoint.mjs --to <checkpoint> [options]');
    log('');
    log('Does the lab exercises for you, up to the checkpoint you pick:');
    for (const [id, { label, next }] of Object.entries(CHECKPOINTS)) log(`  --to ${id}  ${label}; then continue with ${next}`);
    log('');
    log(`  -w, --workspace <name|id>  Fabric workspace, created if no workspace has this name. Default: the one workspace named ${WORKSPACE_PREFIX}*`);
    log('      --capacity <name|id>   Capacity for a new workspace. Default: your one active Fabric capacity');
    log('  -t, --tenant <id>          Microsoft Entra tenant to sign in to. Default: your Azure CLI or browser default');
    log(`      --app-dir <path>       App folder (--to 4). Default: ${join(homedir(), APP_NAME)}`);
    log('      --sql <path>           Seed script. Default: ../data/portfolio-seed.sql');
    log('      --skip-seed            Keep the existing database data; only deploy and check the semantic model');
  };
  if (values.help) return usage();
  const checkpoint = CHECKPOINTS[values.to];
  if (!checkpoint) {
    usage();
    throw new UserError(values.to ? `Unknown checkpoint "${values.to}".` : 'Pick a checkpoint with --to.');
  }
  const to = Number(values.to);
  const appDir = resolve(values['app-dir'] ?? join(homedir(), APP_NAME));

  const { seedPath, seedSql, manifest } = loadInputs(values.sql);
  const getToken = createTokenProvider(values.tenant);

  step('Signing in and finding your workspace');
  const workspace = await resolveWorkspace(getToken, values.workspace, values.capacity);

  step('Exercise 2: SQL database');
  const database = await ensureDatabase(getToken, workspace.id);
  if (values['skip-seed']) log('Skipped seeding (--skip-seed).');
  else {
    log(`Running ${seedPath}...`);
    await seedDatabase(getToken, database, seedSql, manifest);
  }
  await waitForReplication(getToken, workspace.id, database.id);

  step('Exercise 3: semantic model');
  const modelId = await deployModel(getToken, workspace.id, database.id);
  log('Refreshing and checking the measures...');
  await refreshAndCheck(getToken, workspace.id, modelId, manifest);

  const portal = 'https://app.fabric.microsoft.com';
  const links = [
    `  SQL database:   ${portal}/groups/${workspace.id}/sqldatabases/${database.id}`,
    `  Semantic model: ${portal}/groups/${workspace.id}/semanticmodels/${modelId}`,
  ];

  let restartApp = false;
  if (to >= 4) {
    step('Exercise 4: Home Loan Operations Desk app');
    const claims = tokenClaims(await getToken(SCOPES.fabric));
    const tenantId = values.tenant ?? claims.tid;
    restartApp = await installRayfinPlugin();
    await createApp(appDir);
    await rayfinSignIn(appDir, tenantId, claims.upn ?? claims.unique_name ?? claims.preferred_username);
    log('Deploying the app (the first deployment takes a few minutes)...');
    const deployment = await deployApp(appDir, workspace.id, tenantId);
    links.push(`  App folder:     ${appDir}`, `  Hosted app:     ${deployment.hostingUrl}`);
  }

  log(`\nDone. ${checkpoint.label} are set up.`);
  for (const link of links) log(link);
  if (to >= 4) {
    log('\nBefore you continue, in the GitHub Copilot app:');
    let n = 1;
    if (restartApp) log(`  ${n++}. Restart the app so it loads the rayfin plugin.`);
    log(`  ${n++}. Add the ${appDir} folder as a project.`);
    log(`  ${n++}. Create a new session in the home-loan-desk project, and change New worktree to Current checkout.`);
  }
  log(`\nThen continue with ${checkpoint.next}.`);
}

main().catch((error) => {
  log(`\nError: ${error instanceof UserError ? error.message : (error.stack ?? error.message)}`);
  process.exitCode = 1;
});
