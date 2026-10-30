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
//   --to 6  Everything above, then Exercise 6:
//           7. applies the app changes from ./app (see app-patches.mjs) as Git commits, installs the
//              dependencies if they changed, and deploys the app again.
//   --to 7  Everything above, then the app changes of Exercise 7, the same way. The attendee uploads the
//           HL-1042 sample files in the app.
//   --to 8  Everything above, then the app changes of Exercise 8 (Rayfin Functions and the handoff brief), the same
//           way, and the FOUNDRY_ENDPOINT and FOUNDRY_API_KEY secrets of the deployed app: from the FOUNDRY_ENDPOINT
//           and FOUNDRY_API_KEY environment variables, the gpt-6-luna deployment found in Azure, or a terminal prompt.
//
// Usage: npm install, then node checkpoint.mjs --to <3|4|6|7|8> [options]. Run with --help for the options.
// Lab folder: C:\LabFiles on the lab VM. On another machine, pass --lab-dir or set PREL40_LABFILES (see lab.mjs).
// Sign-in: uses the Azure CLI if you're signed in with `az login`, otherwise opens a browser.

import { AzureCliCredential, ChainedTokenCredential, InteractiveBrowserCredential } from '@azure/identity';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { Connection, Request } from 'tedious';
import { apply as applyPatches, BASE_CHECKPOINT, INITIAL_COMMIT, latestCheckpoint, resetApp, TAG_PREFIX } from './app-patches.mjs';
import { APP_NAME, findManifest, findSeed, prepareTemplate, resolveLabDir, UserError } from './lab.mjs';

const WORKSPACE_PREFIX = 'PREL40-homeloans';
const DATABASE_NAME = 'CaldovaHomeLoans';
const MODEL_NAME = 'CaldovaPortfolio';
const TABLES = ['Branch', 'Date', 'LoanApplication', 'LoanProduct'];
const OPEN_EXCLUDED_STAGES = ['Closed', 'Withdrawn'];
const RAYFIN_CLI = '@microsoft/rayfin-cli@1.36.2';
const RAYFIN_PLUGIN = 'rayfin@awesome-copilot';
const CHECKPOINTS = {
  3: { label: 'Exercises 2 and 3', next: 'Exercise 4' },
  4: { label: 'Exercises 2 to 4', next: 'Exercise 5' },
  6: { label: 'Exercises 2 to 6', next: 'Exercise 7' },
  7: { label: 'Exercises 2 to 7', next: 'Exercise 8' },
  8: { label: 'Exercises 2 to 8', next: 'Exercise 9' },
};
// Exercise 8, Task 1: the Foundry model deployment the handoff brief function calls, and its secrets.
const FOUNDRY_MODEL = 'gpt-6-luna';
const FOUNDRY_SECRETS = ['FOUNDRY_ENDPOINT', 'FOUNDRY_API_KEY'];

const FABRIC_API = 'https://api.fabric.microsoft.com/v1';
const POWERBI_API = 'https://api.powerbi.com/v1.0/myorg';
const ARM = 'https://management.azure.com';
const ONELAKE = 'https://onelake.dfs.fabric.microsoft.com';
const SCOPES = {
  fabric: 'https://api.fabric.microsoft.com/.default',
  powerbi: 'https://analysis.windows.net/powerbi/api/.default',
  sql: 'https://database.windows.net/.default',
  storage: 'https://storage.azure.com/.default',
  arm: 'https://management.azure.com/.default',
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const modelDir = join(scriptDir, `${MODEL_NAME}.SemanticModel`);

class RefreshError extends UserError {}

const logLine = (message = '') => process.stderr.write(`${message}\n`);
const log = logLine;
const step = (message) => log(`\n> ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isGuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// ---------------------------------------------------------------------------
// Inputs

function loadInputs(labDir, sqlPath) {
  const seedPath = findSeed(labDir, sqlPath);
  const manifestPath = findManifest(labDir);
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
  const mismatches = stageMismatches(rows, manifest);
  for (const { stage } of manifest.byStage) log(`  ${stage.padEnd(20)} ${String(counts[stage] ?? '-').padStart(3)}`);
  if (mismatches.length > 0) throw new UserError(`Seed counts don't match manifest.json for: ${mismatches.join(', ')}`);
  log('Seeded 200 applications. Stage counts match the reference.');
}

function stageMismatches(rows, manifest) {
  const counts = Object.fromEntries(rows.map((row) => [row.CurrentStage, row.Applications]));
  const extra = rows.filter((row) => !manifest.byStage.some(({ stage }) => stage === row.CurrentStage)).map((row) => row.CurrentStage);
  return [...manifest.byStage.filter(({ stage, applications }) => counts[stage] !== applications).map(({ stage }) => stage), ...extra];
}

// True when the database already holds the seeded portfolio: the same number of applications in each stage.
async function isSeeded(getToken, database, manifest) {
  try {
    const rows = await runSql(
      database,
      await getToken(SCOPES.sql),
      'SELECT CurrentStage, COUNT(*) AS Applications FROM dbo.LoanApplication GROUP BY CurrentStage',
    );
    return stageMismatches(rows, manifest).length === 0;
  } catch {
    return false;
  }
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
async function checkMeasures(getToken, workspaceId, modelId, manifest, { quiet = false } = {}) {
  const log = quiet ? () => {} : logLine;
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

// capture: collect the output instead of showing it. tee: show it and also collect it. input: write it to stdin.
function runCommand(command, args, { cwd, capture = false, tee = false, input } = {}) {
  return new Promise((done, fail) => {
    const windows = process.platform === 'win32';
    const stdin = input !== undefined ? 'pipe' : capture ? 'ignore' : 'inherit';
    const child = spawn(command, windows ? args.map(quote) : args, {
      cwd,
      shell: windows,
      stdio: capture ? [stdin, 'pipe', 'pipe'] : tee ? [stdin, 'pipe', 'pipe'] : [stdin, 'inherit', 'inherit'],
    });
    if (input !== undefined) child.stdin.end(input);
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

async function createApp(appDir, labDir) {
  if (existsSync(join(appDir, 'rayfin', 'rayfin.yml'))) {
    log(`${appDir} already exists; reusing it.`);
    return;
  }
  if (existsSync(appDir) && readdirSync(appDir).length > 0) {
    throw new UserError(`${appDir} exists but isn't a Rayfin app. Move or delete it, or pick another folder with --app-dir.`);
  }

  const template = prepareTemplate(labDir);
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
  await runCommand('git', ['commit', '--quiet', '-m', INITIAL_COMMIT], { cwd: appDir });
  await runCommand('git', ['tag', `${TAG_PREFIX}${BASE_CHECKPOINT}`], { cwd: appDir });
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

function findDeployment(appDir, workspaceId) {
  const deploymentsPath = join(appDir, 'rayfin', '.deployments.json');
  if (!existsSync(deploymentsPath)) return undefined;
  const deployments = JSON.parse(readFileSync(deploymentsPath, 'utf8')).deployments ?? {};
  return Object.values(deployments).find((entry) => entry.fabricWorkspaceId === workspaceId && entry.hostingUrl);
}

// ---------------------------------------------------------------------------
// Exercise 8: Foundry secrets

async function armList(getToken, url) {
  const items = [];
  for (let next = url; next; ) {
    const { json } = await request(getToken, 'GET', next, { scope: SCOPES.arm });
    items.push(...(json?.value ?? []));
    next = json?.nextLink;
  }
  return items;
}

// The endpoint and key of the one Foundry resource the user can see with a gpt-6-luna deployment and key access.
async function findFoundryInAzure(getToken) {
  const api = 'api-version=2024-10-01';
  const usable = [];
  const keyless = [];
  for (const subscription of await armList(getToken, `${ARM}/subscriptions?api-version=2022-12-01`)) {
    const accounts = await armList(getToken, `${ARM}/subscriptions/${subscription.subscriptionId}/providers/Microsoft.CognitiveServices/accounts?${api}`).catch(() => []);
    for (const account of accounts.filter((a) => a.kind === 'AIServices' || a.kind === 'OpenAI')) {
      const deployments = await armList(getToken, `${ARM}${account.id}/deployments?${api}`).catch(() => []);
      if (!deployments.some((deployment) => deployment.name === FOUNDRY_MODEL)) continue;
      (account.properties?.disableLocalAuth ? keyless : usable).push(account);
    }
  }
  if (usable.length !== 1) {
    const names = (list) => list.map((account) => account.name).join(', ');
    if (usable.length > 1) log(`  Found several Foundry resources with a ${FOUNDRY_MODEL} deployment: ${names(usable)}.`);
    else if (keyless.length) log(`  Found ${names(keyless)} with a ${FOUNDRY_MODEL} deployment, but API keys are disabled on it.`);
    else log(`  Found no Foundry resource with a ${FOUNDRY_MODEL} deployment in your Azure subscriptions.`);
    return null;
  }
  const [account] = usable;
  const { json } = await request(getToken, 'POST', `${ARM}${account.id}/listKeys?${api}`, { scope: SCOPES.arm, allow: [400, 403] });
  if (!json?.key1) {
    log(`  Found ${account.name}, but couldn't read its API key: ${json?.error?.message ?? 'no key returned'}.`);
    return null;
  }
  const base =
    account.properties?.endpoints?.['OpenAI Language Model Instance API'] ??
    `https://${account.properties?.customSubDomainName ?? account.name}.openai.azure.com/`;
  return { FOUNDRY_ENDPOINT: new URL('openai/v1/responses', base).href, FOUNDRY_API_KEY: json.key1, source: `${account.name} in Azure` };
}

// Reads a line from the terminal. With `hidden`, doesn't echo what's typed.
function promptLine(question, { hidden = false } = {}) {
  return new Promise((done) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    if (hidden) rl._writeToOutput = (text) => text.startsWith(question) && process.stderr.write(question);
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stderr.write('\n');
      done(answer.trim());
    });
  });
}

// From the environment, then Azure, then the terminal. Values never go in arguments or logs.
async function foundrySecrets(getToken) {
  const { FOUNDRY_ENDPOINT, FOUNDRY_API_KEY } = process.env;
  if (FOUNDRY_ENDPOINT && FOUNDRY_API_KEY) return { FOUNDRY_ENDPOINT, FOUNDRY_API_KEY, source: 'the FOUNDRY_ENDPOINT and FOUNDRY_API_KEY environment variables' };
  log(`Looking for the ${FOUNDRY_MODEL} deployment in Microsoft Foundry...`);
  const found = await findFoundryInAzure(getToken).catch((error) => {
    log(`  Couldn't search Azure: ${error.message.split('\n')[0]}`);
    return null;
  });
  if (found) return found;
  if (!process.stdin.isTTY) return null;
  log(`Copy them from the ${FOUNDRY_MODEL} deployment details in Microsoft Foundry (https://ai.azure.com), as in Exercise 8, Task 1.`);
  log('Leave a value empty to skip setting the secrets.');
  const endpoint = await promptLine('  OpenAI-compatible endpoint (ends with /openai/v1/responses): ');
  if (!endpoint) return null;
  const apiKey = await promptLine('  API key (hidden): ', { hidden: true });
  return apiKey ? { FOUNDRY_ENDPOINT: endpoint, FOUNDRY_API_KEY: apiKey, source: 'your input' } : null;
}

// The names of the secrets set on the app's active deployment.
async function deployedSecretNames(appDir) {
  const output = await runCommand('npx', ['rayfin', '--json', 'secret', 'list'], { cwd: appDir, capture: true }).catch((error) => error.output ?? '');
  const line = output.split('\n').reverse().find((text) => text.trim().startsWith('{'));
  try {
    return JSON.parse(line).secrets?.map((secret) => secret.name) ?? [];
  } catch {
    return [];
  }
}

async function setSecret(appDir, name, value) {
  await runCommand('npx', ['rayfin', 'secret', 'set', name, '--stdin'], { cwd: appDir, capture: true, input: value });
}

// Static hosting is protected, so the app may answer with a redirect to sign in: anything but a server error is fine.
async function isResponding(url, { retries = 0 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const status = await fetch(url, { redirect: 'manual' }).then(
      (response) => response.status,
      () => 0,
    );
    if (status > 0 && status < 500) return status;
    if (attempt >= retries) return false;
    log(`  The app isn't responding yet (${status || 'no response'}). Trying again in 10 seconds...`);
    await sleep(10000);
  }
}

async function deployApp(appDir, workspaceId, tenantId) {
  await runRayfin(['up', '--workspace-id', workspaceId, '--tenant', tenantId, '--yes'], appDir);
  const deployment = findDeployment(appDir, workspaceId);
  if (!deployment) throw new UserError(`The deployment finished, but rayfin/.deployments.json in ${appDir} has no hosted URL for this workspace.`);
  const status = await isResponding(deployment.hostingUrl, { retries: 5 });
  if (!status) throw new UserError(`The app was deployed, but ${deployment.hostingUrl} doesn't respond.`);
  log(`  PASS  ${deployment.hostingUrl} responds (${status})`);
  return deployment;
}

const gitHead = (appDir) => runCommand('git', ['rev-parse', 'HEAD'], { cwd: appDir, capture: true }).catch(() => undefined);

// ---------------------------------------------------------------------------
// Progress, saved in <lab>/checkpoints/.state.json for each workspace, so a later run skips the steps already done.

const STEPS = [
  { name: 'database', checkpoint: 3, label: 'Exercise 2: SQL database' },
  { name: 'seed', checkpoint: 3, label: 'Exercise 2: portfolio data' },
  { name: 'model', checkpoint: 3, label: 'Exercise 3: semantic model' },
  { name: 'plugin', checkpoint: 4, label: 'Exercise 4: Rayfin plugin' },
  { name: 'app', checkpoint: 4, label: 'Exercise 4: home-loan-desk app' },
  { name: 'deploy', checkpoint: 4, label: 'Exercise 4: deployment' },
  { name: 'code', checkpoint: 6, label: 'Exercise 6 and later: app changes' },
  { name: 'secrets', checkpoint: 8, label: 'Exercise 8: Foundry secrets' },
];

function loadState(statePath) {
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return { workspaces: {} };
  }
}

function saveState(statePath, state) {
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

// ---------------------------------------------------------------------------

async function main() {
  const { values } = parseArgs({
    options: {
      to: { type: 'string' },
      workspace: { type: 'string', short: 'w' },
      capacity: { type: 'string' },
      tenant: { type: 'string', short: 't' },
      'lab-dir': { type: 'string' },
      'app-dir': { type: 'string' },
      sql: { type: 'string' },
      'skip-seed': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      redo: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const usage = () => {
    log('Usage: node checkpoint.mjs --to <checkpoint> [options]');
    log('');
    log('Does the lab exercises for you, up to the checkpoint you pick:');
    for (const [id, { label, next }] of Object.entries(CHECKPOINTS)) log(`  --to ${id}  ${label}; then continue with ${next}`);
    log('');
    log('Steps already done in an earlier run are skipped. Steps: ' + STEPS.map((s) => s.name).join(', '));
    log('');
    log(`  -w, --workspace <name|id>  Fabric workspace, created if no workspace has this name. Default: the one workspace named ${WORKSPACE_PREFIX}*`);
    log('      --capacity <name|id>   Capacity for a new workspace. Default: your one active Fabric capacity');
    log('  -t, --tenant <id>          Microsoft Entra tenant to sign in to. Default: your Azure CLI or browser default');
    log(`      --lab-dir <path>       Lab folder: lab files, app and progress. Default: $PREL40_LABFILES, or C:\\LabFiles on the lab VM`);
    log(`      --app-dir <path>       App folder (--to 4 and later). Default: ~/${APP_NAME} on the lab VM, else <lab folder>/${APP_NAME}`);
    log('      --sql <path>           Seed script. Default: <lab folder>/data/portfolio-seed.sql, or the one in the repository');
    log('      --skip-seed            Keep the existing database data; only deploy and check the semantic model');
    log('      --redo <step,...>      Run these steps again, even if they were done before');
    log('      --force                Run every step again, ignoring earlier runs');
  };
  if (values.help) return usage();
  const checkpoint = CHECKPOINTS[values.to];
  if (!checkpoint) {
    usage();
    throw new UserError(values.to ? `Unknown checkpoint "${values.to}".` : 'Pick a checkpoint with --to.');
  }
  const to = Number(values.to);
  const { labDir, defaultAppDir, statePath } = resolveLabDir(values['lab-dir']);
  const appDir = resolve(values['app-dir'] ?? defaultAppDir);
  const redo = new Set((values.redo ?? '').split(',').map((name) => name.trim().toLowerCase()).filter(Boolean));
  const unknown = [...redo].filter((name) => !STEPS.some((s) => s.name === name));
  if (unknown.length > 0) throw new UserError(`Unknown step for --redo: ${unknown.join(', ')}. Steps: ${STEPS.map((s) => s.name).join(', ')}`);

  const { seedPath, seedSql, manifest } = loadInputs(labDir, values.sql);
  log(`Lab folder: ${labDir}`);
  const getToken = createTokenProvider(values.tenant);

  step('Signing in and finding your workspace');
  const workspace = await resolveWorkspace(getToken, values.workspace, values.capacity);
  const state = loadState(statePath);
  state.workspaces ??= {};
  const progress = (state.workspaces[workspace.id] ??= { name: workspace.displayName, checkpoint: 0, steps: {} });
  progress.name = workspace.displayName;
  const record = (name, data = {}) => {
    progress.steps[name] = { ...data, at: new Date().toISOString() };
    saveState(statePath, state);
  };
  const forget = (name) => {
    delete progress.steps[name];
    saveState(statePath, state);
  };

  const portal = 'https://app.fabric.microsoft.com';
  const printLinks = () => {
    const { database, model, app, deploy } = progress.steps;
    if (database?.id) log(`  SQL database:   ${portal}/groups/${workspace.id}/sqldatabases/${database.id}`);
    if (model?.id) log(`  Semantic model: ${portal}/groups/${workspace.id}/semanticmodels/${model.id}`);
    if (to >= 4 && app?.dir) log(`  App folder:     ${app.dir}`);
    if (to >= 4 && deploy?.url) log(`  Hosted app:     ${deploy.url}`);
  };

  // The app is local, so check it's the same folder with no new commits since the last deployment.
  const appUpToDate =
    to < 4 ||
    (progress.steps.app?.dir === appDir &&
      existsSync(join(appDir, 'rayfin', 'rayfin.yml')) &&
      progress.steps.deploy?.commit === (await gitHead(appDir)) &&
      (to < 6 || (latestCheckpoint(appDir) ?? 0) >= to));
  if (!values.force && redo.size === 0 && progress.checkpoint >= to && appUpToDate) {
    log(`\nAlready at checkpoint ${progress.checkpoint} in this workspace: nothing to do.`);
    printLinks();
    log(`\nContinue with ${checkpoint.next}. To run the steps again, add --redo <step,...> or --force.`);
    return;
  }
  if (progress.checkpoint > 0 && !values.force) log(`An earlier run reached checkpoint ${progress.checkpoint} here: skipping the steps it did.`);

  // A step runs when forced, or when it's neither recorded in the state nor already done according to its check.
  const steps = Object.fromEntries(STEPS.map((s) => [s.name, s]));
  const plan = async (name, check) => {
    if (values.force || redo.has(name)) return true;
    if (progress.steps[name]) {
      log('Skipping: done in an earlier run.');
      return false;
    }
    if (check && (await check())) {
      log('Skipping: already in place.');
      return false;
    }
    return true;
  };

  let database;
  const getDatabase = async () => (database ??= await ensureDatabase(getToken, workspace.id));

  step(steps.database.label);
  if (await plan('database')) record('database', { id: (await getDatabase()).id });

  step(steps.seed.label);
  let seeded = false;
  if (values['skip-seed']) log('Skipped seeding (--skip-seed).');
  else if (await plan('seed', async () => isSeeded(getToken, await getDatabase(), manifest))) {
    forget('seed');
    forget('model');
    log(`Running ${seedPath}...`);
    await seedDatabase(getToken, await getDatabase(), seedSql, manifest);
    seeded = true;
    record('seed');
  } else if (!progress.steps.seed) record('seed');

  step(steps.model.label);
  const existingModel = async () => (await findItem(getToken, workspace.id, 'SemanticModel', MODEL_NAME))?.id;
  let modelId = progress.steps.model?.id;
  const modelOk = async () => {
    modelId = await existingModel();
    if (!modelId) return false;
    // After a reseed, the refresh below checks the measures.
    if (seeded) return true;
    const problems = await checkMeasures(getToken, workspace.id, modelId, manifest, { quiet: true }).catch(() => ['error']);
    return problems.length === 0;
  };
  if (await plan('model', modelOk)) {
    forget('model');
    await waitForReplication(getToken, workspace.id, (await getDatabase()).id);
    modelId = await deployModel(getToken, workspace.id, (await getDatabase()).id);
    log('Refreshing and checking the measures...');
    await refreshAndCheck(getToken, workspace.id, modelId, manifest);
  } else if (seeded) {
    // New data: the model is fine, but it must pick up the re-created tables.
    await waitForReplication(getToken, workspace.id, (await getDatabase()).id);
    modelId ??= await existingModel();
    log('Refreshing the semantic model for the new data, and checking the measures...');
    await refreshAndCheck(getToken, workspace.id, modelId, manifest);
  }
  if (!progress.steps.model || progress.steps.model.id !== modelId) record('model', { id: modelId });
  progress.checkpoint = Math.max(progress.checkpoint, 3);
  saveState(statePath, state);

  let restartApp = false;
  let secretsMissing = false;
  if (to >= 4) {
    const claims = tokenClaims(await getToken(SCOPES.fabric));
    const tenantId = values.tenant ?? claims.tid;

    step(steps.plugin.label);
    if (await plan('plugin')) {
      restartApp = await installRayfinPlugin();
      record('plugin');
    }

    step(steps.app.label);
    const appRecorded = progress.steps.app?.dir === appDir && existsSync(join(appDir, 'rayfin', 'rayfin.yml'));
    if (values.force || redo.has('app') || !appRecorded) {
      await createApp(appDir, labDir);
      record('app', { dir: appDir });
    } else log('Skipping: done in an earlier run.');

    // Deploys when the app has commits that the last deployment doesn't have.
    // `again`: a redeployment after new commits, which --force and --redo deploy don't repeat.
    const deploy = async (label, { again = false } = {}) => {
      step(label);
      const head = await gitHead(appDir);
      const deployed = progress.steps.deploy;
      let deployment;
      if ((again || (!values.force && !redo.has('deploy'))) && deployed?.dir === appDir && deployed.commit === head) {
        log('Skipping: done in an earlier run, and the app has no new commits since.');
      } else if (!values.force && !redo.has('deploy') && !deployed && (deployment = findDeployment(appDir, workspace.id)) && (await isResponding(deployment.hostingUrl))) {
        log(`Skipping: already deployed to ${deployment.hostingUrl}.`);
        record('deploy', { dir: appDir, commit: head, url: deployment.hostingUrl });
      } else {
        await rayfinSignIn(appDir, tenantId, claims.upn ?? claims.unique_name ?? claims.preferred_username);
        log('Deploying the app (the first deployment takes a few minutes)...');
        deployment = await deployApp(appDir, workspace.id, tenantId);
        record('deploy', { dir: appDir, commit: head, url: deployment.hostingUrl });
      }
    };

    await deploy(steps.deploy.label);
    progress.checkpoint = Math.max(progress.checkpoint, 4);
    saveState(statePath, state);

    if (to >= 6) {
      step(`Exercise${to > 6 ? `s 6 to ${to}` : ' 6'}: app changes`);
      const at = latestCheckpoint(appDir) ?? BASE_CHECKPOINT;
      if (!redo.has('code') && at >= to) {
        log(`Skipping: the app already has the changes up to checkpoint ${at}.`);
      } else {
        if (redo.has('code')) {
          const backup = resetApp(appDir);
          log(`Reset the app's code to checkpoint ${BASE_CHECKPOINT}.${backup ? ` Your earlier commits are in the ${backup} branch.` : ''}`);
        }
        const before = await gitHead(appDir);
        const deployment = findDeployment(appDir, workspace.id);
        const patchValues = Object.fromEntries(
          Object.entries({
            WORKSPACE_ID: workspace.id,
            TENANT_ID: tenantId,
            SQL_DATABASE_ID: progress.steps.database?.id,
            SEMANTIC_MODEL_ID: modelId,
            HOSTING_URL: deployment?.hostingUrl,
            APP_ITEM_ID: deployment?.fabricItemId,
          }).filter(([, value]) => value),
        );
        try {
          applyPatches(to, {}, { appDir, values: patchValues });
        } catch (error) {
          if (!(error instanceof UserError) || !/doesn't apply/.test(error.message)) throw error;
          throw new UserError(
            `${error.message}\n` +
              'You may have done some of these exercises yourself. If your app already works, continue with the lab instead.\n' +
              'To replace your app changes with the checkpoint\'s, run again with --redo code: your commits are kept in a backup branch.',
          );
        }
        const changed = await runCommand('git', ['diff', '--name-only', before, 'HEAD'], { cwd: appDir, capture: true });
        if (changed.split('\n').some((file) => /(^|\/)package(-lock)?\.json$/.test(file.trim()))) {
          log('Installing the updated dependencies...');
          await runCommand('npm', ['install', '--no-audit', '--no-fund'], { cwd: appDir });
        }
        record('code', { checkpoint: to });
      }
      await deploy(`Exercise ${to}: redeployment`, { again: true });
      progress.checkpoint = Math.max(progress.checkpoint, Math.min(to, 7));
      saveState(statePath, state);
    }

    // The secrets live on the deployed app, so the state can't tell: always check them.
    if (to >= 8) {
      step(steps.secrets.label);
      const deployedNames = await deployedSecretNames(appDir);
      const missing = FOUNDRY_SECRETS.filter((name) => !deployedNames.includes(name));
      if (!values.force && !redo.has('secrets') && missing.length === 0) {
        log('Skipping: the deployed app already has both secrets.');
        record('secrets');
      } else {
        const secrets = await foundrySecrets(getToken);
        if (secrets) {
          log(`Setting ${FOUNDRY_SECRETS.join(' and ')} on the deployed app, from ${secrets.source}...`);
          for (const name of FOUNDRY_SECRETS) await setSecret(appDir, name, secrets[name]);
          log('  PASS  Both secrets are set.');
          record('secrets');
        } else {
          forget('secrets');
          secretsMissing = true;
          log(`  WARN  The secrets aren't set: the handoff brief shows a configuration error until they are.`);
        }
      }
    }
    if (!secretsMissing) progress.checkpoint = Math.max(progress.checkpoint, to);
    saveState(statePath, state);
  }

  log(`\nDone. ${checkpoint.label} are set up.`);
  printLinks();
  if (to >= 4) {
    log('\nBefore you continue, in the GitHub Copilot app:');
    let n = 1;
    if (restartApp) log(`  ${n++}. Restart the app so it loads the rayfin plugin.`);
    log(`  ${n++}. Add the ${appDir} folder as a project.`);
    log(`  ${n++}. Create a new session in the home-loan-desk project, and change New worktree to Current checkout.`);
  }
  if (to >= 7) {
    const samples = [join(labDir, 'data', 'samples'), join(scriptDir, '..', '..', 'data', 'samples')].map((dir) => resolve(dir)).find(existsSync) ?? join(labDir, 'data', 'samples');
    log("\nThe checkpoint doesn't upload HL-1042's files. To have them, upload them in the app's HL-1042 case, as in");
    log(`Exercise 7, Task 3: ${join(samples, 'HL-1042-floor-plan.pdf')} and ${join(samples, 'HL-1042-kitchen-current.jpg')}.`);
  }
  if (secretsMissing) {
    log(`\nThe Foundry secrets aren't set. Set them as in Exercise 8, Task 1: in ${appDir}, run`);
    log(`"npx rayfin secret set FOUNDRY_ENDPOINT" and "npx rayfin secret set FOUNDRY_API_KEY", and paste the values from`);
    log(`the ${FOUNDRY_MODEL} deployment in Microsoft Foundry when asked. Or set the FOUNDRY_ENDPOINT and FOUNDRY_API_KEY`);
    log('environment variables, or run the checkpoint again in a terminal to type them. Then run the checkpoint again.');
  }
  log(`\nThen continue with ${checkpoint.next}.`);
}

main().catch((error) => {
  log(`\nError: ${error instanceof UserError ? error.message : (error.stack ?? error.message)}`);
  process.exitCode = 1;
});
