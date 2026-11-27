import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return [absolute];
  });
}

for (const file of walk(path.join(root, 'server')).concat(walk(path.join(root, 'client', 'js')))) {
  if (path.extname(file) !== '.js') continue;
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch {
    failures.push(`${path.relative(root, file)}: JavaScript syntax check failed`);
  }
}

for (const file of walk(path.join(root, 'client')).filter((value) => value.endsWith('.html'))) {
  const content = fs.readFileSync(file, 'utf8');
  if (/<script(?:\s[^>]*)?>\s*[^<\s]/i.test(content)) {
    failures.push(`${path.relative(root, file)}: inline script conflicts with the CSP`);
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exitCode = 1;
} else {
  console.log('PASS JavaScript syntax and CSP inline-script checks');
}
