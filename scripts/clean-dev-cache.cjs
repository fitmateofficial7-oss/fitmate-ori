const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const targets = [
  path.join(projectRoot, '.next'),
  path.join(projectRoot, 'tsconfig.tsbuildinfo'),
];

for (const target of targets) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[clean-dev-cache] removed ${path.relative(projectRoot, target)}`);
  } catch (error) {
    console.error(`[clean-dev-cache] failed to remove ${target}:`, error);
    process.exitCode = 1;
  }
}
