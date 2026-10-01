import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { hostname } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CHECKS = [
  { name: 'docs', script: 'docs:check', timeout: 30000 },
  { name: 'tooling', script: 'test:tooling', timeout: 60000 },
  { name: 'test', script: 'test', timeout: 120000 },
  { name: 'lint', script: 'lint', timeout: 120000 },
  { name: 'typecheck', script: 'typecheck', timeout: 180000 },
  { name: 'build', script: 'build', timeout: 300000 },
];
const EXCLUDED_DIRECTORIES = new Set(['node_modules', '.git', '.next', 'dist', 'out', 'build', 'coverage', '.codex', '.claude', '.agents', 'secrets']);
const INPUT_EXTENSION = /\.(?:[cm]?js|jsx|[cm]?ts|tsx|json|css|sql|md|mdc|svg|png|jpe?g|gif|webp|ico|woff2?|ttf)$/i;
const PRIVATE_FILE = /^(?:\.env(?:\.|$)|\.mcp\.json$|mcp\.json$|settings(?:\.local)?\.json$)|credential|secret|\.(?:pem|key|p12|pfx)$/i;

export function sourceFingerprint(root) {
  const files = new Set();
  function walk(directory) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (path === join(root, 'docs', 'history')) continue;
      if (entry.isDirectory() && !EXCLUDED_DIRECTORIES.has(entry.name)) walk(path);
      else if (entry.isFile() && INPUT_EXTENSION.test(entry.name) && !PRIVATE_FILE.test(entry.name) && entry.name !== 'next-env.d.ts') files.add(path);
    }
  }
  // tsconfig includes **/*.ts(x): additional source folders also affect checks.
  walk(root);
  for (const file of ['docs/history/README.md', 'docs/history/.gitignore']) if (existsSync(join(root, file))) files.add(join(root, file));
  const hash = createHash('sha256');
  for (const file of [...files].sort()) {
    hash.update(relative(root, file).replaceAll('\\', '/') + '\0');
    hash.update(createHash('sha256').update(readFileSync(file)).digest());
  }
  return hash.digest('hex');
}

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 5000, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  return result.status === 0 ? result.stdout.trim() : null;
}

function snapshot(root) {
  const status = git(root, ['status', '--porcelain']);
  return { commit: git(root, ['rev-parse', 'HEAD']), branch: git(root, ['rev-parse', '--abbrev-ref', 'HEAD']), dirty: status === null ? null : status.length > 0, fingerprint: sourceFingerprint(root) };
}

function npmCommand(check, root) {
  const npmCli = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  if (!existsSync(npmCli)) throw new Error('Ejecuta esta herramienta mediante npm run verify.');
  return spawnSync(process.execPath, [npmCli, 'run', check.script], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: check.timeout,
    maxBuffer: 16 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0' },
  });
}

export function parseArgs(args) {
  if (!args.length) return { mode: 'run', selected: CHECKS.map((check) => check.name) };
  if (args.length === 1 && ['--history', '--help'].includes(args[0])) return { mode: args[0].slice(2) };
  if (args.length === 1 && args[0] === '--quick') return { mode: 'run', selected: CHECKS.filter((check) => check.name !== 'build').map((check) => check.name) };
  if (args.length === 2 && args[0] === '--only') {
    const names = args[1].split(',');
    if (names.some((name) => !CHECKS.some((check) => check.name === name)) || new Set(names).size !== names.length) {
      throw new Error(`Selección inválida. Controles: ${CHECKS.map((check) => check.name).join(',')}`);
    }
    return { mode: 'run', selected: CHECKS.filter((check) => names.includes(check.name)).map((check) => check.name) };
  }
  throw new Error('Usa --quick, --only docs,test, --history o --help, sin combinarlos.');
}

export function runVerification({ root = ROOT, selected = CHECKS.map((check) => check.name), runCommand = npmCommand, report = console.log } = {}) {
  root = resolve(root);
  if (!selected.length || new Set(selected).size !== selected.length || selected.some((name) => !CHECKS.some((check) => check.name === name))) throw new Error('Selección de controles inválida.');
  const history = join(root, 'docs', 'history');
  mkdirSync(history, { recursive: true });
  const lock = join(history, 'verify.lock');
  let descriptor;
  try { descriptor = openSync(lock, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Otro ejecutor tiene verify.lock. Consulta su PID antes de retirar un bloqueo abandonado.');
    throw error;
  }
  const id = new Date().toISOString().replaceAll(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
  try {
    writeFileSync(descriptor, JSON.stringify({ id, pid: process.pid, startedAt: new Date().toISOString() }));
  } finally { closeSync(descriptor); }
  try {
    const started = Date.now();
    const before = snapshot(root);
    const record = { schemaVersion: 1, id, startedAt: new Date(started).toISOString(), machine: hostname(), node: process.version, npm: process.env.npm_config_user_agent?.match(/npm\/([^ ]+)/)?.[1] || null, source: before, selected: CHECKS.filter((check) => selected.includes(check.name)).map((check) => check.name), full: selected.length === CHECKS.length, checks: [] };
    const logs = join(history, 'logs', id);
    mkdirSync(logs, { recursive: true });
    let failed = false;
    for (const check of CHECKS) {
      if (!selected.includes(check.name) || failed) {
        record.checks.push({ name: check.name, status: 'SKIPPED', reason: failed && selected.includes(check.name) ? 'previous_failure' : 'not_selected' });
        continue;
      }
      report(`[verify] ${check.name}: ejecutando npm run ${check.script}`);
      const began = Date.now();
      let result;
      try { result = runCommand(check, root); }
      catch (error) { result = { status: null, error }; }
      const output = (result.stdout || '') + (result.stderr || '') + (result.error ? `\n${result.error.message}\n` : '');
      const log = join(logs, `${check.name}.log`);
      writeFileSync(log, output);
      const passed = result.status === 0 && !result.error;
      const item = { name: check.name, command: `npm run ${check.script}`, status: passed ? 'PASS' : 'FAIL', exitCode: result.status ?? null, signal: result.signal || null, durationMs: Date.now() - began, log: relative(root, log).replaceAll('\\', '/') };
      if (result.error) item.error = result.error.code || 'EXECUTION_ERROR';
      record.checks.push(item);
      failed = !passed;
      report(`[verify] ${check.name}: ${item.status} (${item.durationMs} ms)`);
      if (failed) report(output.trimEnd().split(/\r?\n/).slice(-12).join('\n').slice(-2500));
    }
    record.status = failed ? 'FAIL' : 'PASS';
    try {
      record.sourceAfter = snapshot(root);
      if (!failed && (before.fingerprint !== record.sourceAfter.fingerprint || before.commit !== record.sourceAfter.commit)) {
        record.status = 'INVALIDATED';
        record.reason = 'inputs_changed';
      }
    } catch {
      record.status = 'INVALIDATED';
      record.reason = 'snapshot_failed';
    }
    record.finishedAt = new Date().toISOString();
    record.durationMs = Date.now() - started;
    appendFileSync(join(history, 'verification.jsonl'), JSON.stringify(record) + '\n');
    report(`[verify] ${record.status} | ${record.full ? 'completa' : 'parcial'} | ${id}`);
    report(`[verify] Historial: docs/history/verification.jsonl; logs: docs/history/logs/${id}/`);
    return record;
  } finally {
    // Only remove this invocation's exact scratch file, never a directory tree.
    if (existsSync(lock) && JSON.parse(readFileSync(lock, 'utf8')).id === id) unlinkSync(lock);
  }
}

export function readHistory(root = ROOT, limit = 5) {
  const file = join(root, 'docs', 'history', 'verification.jsonl');
  if (!existsSync(file)) return [];
  const descriptor = openSync(file, 'r');
  try {
    let position = statSync(file).size;
    let tail = Buffer.alloc(0);
    while (position > 0 && tail.toString('utf8').split('\n').length <= limit + 1) {
      const length = Math.min(position, 8192);
      position -= length;
      const chunk = Buffer.alloc(length);
      readSync(descriptor, chunk, 0, length, position);
      tail = Buffer.concat([chunk, tail]);
    }
    const lines = tail.toString('utf8').trimEnd().split('\n');
    if (position > 0) lines.shift();
    return lines.filter(Boolean).slice(-limit).map((line) => JSON.parse(line));
  } finally { closeSync(descriptor); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.mode === 'help') console.log('npm run verify [-- --quick | --only docs,test | --history | --help]');
    else if (options.mode === 'history') {
      const records = readHistory();
      if (!records.length) console.log('Todavía no hay verificaciones registradas.');
      for (const record of records) console.log(`${record.startedAt} | ${record.status} | ${record.full ? 'completa' : 'parcial'} | ${record.selected.join(',')} | ${(record.durationMs / 1000).toFixed(1)}s | ${record.source.commit?.slice(0, 8) || 'sin commit'} | ${record.source.fingerprint.slice(0, 12)}`);
    } else process.exitCode = runVerification(options).status === 'PASS' ? 0 : 1;
  } catch (error) {
    console.error(`[verify] ${error.message}`);
    process.exitCode = 1;
  }
}
