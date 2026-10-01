import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRIES = [
  ['AGENTS.md', 8000, 120],
  ['CLAUDE.md', 512, 10],
  ['.cursor/rules/project-engineering.mdc', 1500, 20],
  ['.cursor/rules/orchestration.mdc', 1500, 20],
];

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'logs') return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

function localLinks(file, text, root, errors) {
  const targets = [];
  for (const match of text.matchAll(/\[[^\]]+\]\(([^\s)]+)\)/g)) {
    const href = match[1];
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(href)) continue;
    let path;
    try { path = resolve(dirname(file), decodeURIComponent(href.split('#')[0])); }
    catch { errors.push(`${relative(root, file)}: enlace inválido ${href}`); continue; }
    if (path !== root && !path.startsWith(root + sep)) {
      errors.push(`${relative(root, file)}: enlace fuera del repositorio ${href}`);
    } else if (!existsSync(path)) {
      errors.push(`${relative(root, file)}: falta ${href}`);
    } else {
      targets.push(path);
    }
  }
  return targets;
}

export function checkDocumentation(root = ROOT) {
  root = resolve(root);
  const errors = [];
  const index = resolve(root, 'docs/index/MASTER_INDEX.md');
  const checked = new Set();
  for (const [name, bytes, lines] of ENTRIES) {
    const file = resolve(root, name);
    if (!existsSync(file)) { errors.push(`Falta ${name}`); continue; }
    const text = readFileSync(file, 'utf8');
    checked.add(file);
    if (Buffer.byteLength(text) > bytes || text.trimEnd().split(/\r?\n/).length > lines) {
      errors.push(`${name}: supera el presupuesto (${bytes} bytes / ${lines} líneas)`);
    }
    if (name === 'AGENTS.md' && !text.includes('docs/index/MASTER_INDEX.md')) errors.push('AGENTS.md no apunta al índice');
    if (name === 'CLAUDE.md' && !text.includes('@AGENTS.md')) errors.push('CLAUDE.md debe importar @AGENTS.md');
    localLinks(file, text, root, errors);
  }
  if (!existsSync(index)) errors.push('Falta docs/index/MASTER_INDEX.md');
  else {
    checked.add(index);
    const indexed = new Set(localLinks(index, readFileSync(index, 'utf8'), root, errors));
    for (const file of markdownFiles(resolve(root, 'docs'))) {
      if (file !== index && !indexed.has(file)) errors.push(`Sin indexar: ${relative(root, file)}`);
      // Academic and historical documents keep their original references.
      if (file.includes(`${sep}engineering${sep}`) || file === resolve(root, 'docs/history/README.md')) {
        checked.add(file);
        localLinks(file, readFileSync(file, 'utf8'), root, errors);
      }
    }
  }
  return { errors, checked: checked.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkDocumentation();
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Documentación: PASS (${result.checked} entradas y guías, índice y presupuestos válidos).`);
  }
}
