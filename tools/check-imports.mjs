/**
 * Static import checker — run by `npm run check` and CI.
 *
 * Catches the mistakes a no-build project would otherwise only find at
 * runtime in the browser:
 *   - a relative import pointing at a file that doesn't exist
 *   - a named import the target module doesn't export
 *   - anything under engine/ importing from game/ (the engine must stay
 *     content-agnostic; games talk to it through engine/core/Content.js)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['engine', 'game', 'tests', 'tools'];

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const full = path.join(dir, e.name);
  if (e.isDirectory()) return walk(full);
  return /\.m?js$/.test(e.name) ? [full] : [];
});

const exportCache = new Map();
function exportsOf(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/^export (?:const|let|class|function|async function) ([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export \{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const [name, alias] = part.trim().split(/\s+as\s+/);
      if (name) names.add((alias || name).trim());
    }
  }
  for (const m of src.matchAll(/^export \* as (\w+)/gm)) names.add(m[1]);
  exportCache.set(file, names);
  return names;
}

const isUnder = (file, dir) => file.startsWith(path.join(ROOT, dir) + path.sep);
const problems = [];
const files = DIRS.filter((d) => fs.existsSync(path.join(ROOT, d))).flatMap((d) => walk(path.join(ROOT, d)));

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  for (const m of src.matchAll(/import\s+(?:\{([^}]*)\}\s+from\s+)?'([^']+)'/g)) {
    const [, named, spec] = m;
    if (!spec.startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), spec);
    if (!fs.existsSync(target)) { problems.push(`${rel}: "${spec}" does not exist`); continue; }
    if (isUnder(file, 'engine') && isUnder(target, 'game')) problems.push(`${rel}: engine code imports game code ("${spec}")`);
    if (!named) continue;
    const available = exportsOf(target);
    for (const part of named.split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name && !available.has(name)) problems.push(`${rel}: "${name}" is not exported by "${spec}"`);
    }
  }
}

for (const p of problems) console.error(`  ✗ ${p}`);
console.log(`${files.length} modules checked, ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
