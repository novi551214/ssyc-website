import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root })
  .toString('utf8').split('\0').filter(Boolean);
const failures = [];
const blockedPath = /(^|\/)(\.env(?:\..+)?|node_modules)(\/|$)|\.(?:db|sqlite|sqlite3|pem|key|p12|pfx)$/i;
const secretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/],
  ['Stripe live secret', /\bsk_live_[A-Za-z0-9]{16,}\b/],
  ['Stripe webhook secret', /\bwhsec_[A-Za-z0-9]{16,}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
];

for (const relative of files) {
  if (relative !== '.env.example' && blockedPath.test(relative)) {
    failures.push(`${relative}: sensitive/generated path is publishable`);
    continue;
  }
  const absolute = path.join(root, relative);
  const stat = fs.statSync(absolute);
  if (stat.size > 10 * 1024 * 1024) failures.push(`${relative}: file exceeds 10 MiB`);
  if (stat.size === 0 || stat.size > 2 * 1024 * 1024) continue;
  const content = fs.readFileSync(absolute);
  if (content.includes(0)) continue;
  const text = content.toString('utf8');
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(text)) failures.push(`${relative}: possible ${label}`);
  }
}

if (fs.existsSync(path.join(root, '.env'))) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--', '.env'], { cwd: root, stdio: 'ignore' });
  } catch {
    failures.push('.env: local sensitive file exists but is not ignored');
  }
}

const placeholder = 'TODO-REPLACE-WITH-REAL-INVITE-LINK';
if (files.some((relative) => fs.readFileSync(path.join(root, relative)).toString('utf8').includes(placeholder))) {
  failures.push(`unresolved public placeholder: ${placeholder}`);
}

if (failures.length) {
  [...new Set(failures)].sort().forEach((failure) => console.error(`FAIL ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`PASS checked ${files.length} publishable files`);
}
