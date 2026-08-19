#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rm, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const packageDirs = process.argv.slice(2);

if (packageDirs.length === 0) {
  console.error('Usage: node scripts/packages/pack-smoke.mjs <package-dir> [<package-dir> ...]');
  process.exit(1);
}

function isTestArtifact(filePath) {
  return (
    filePath.endsWith('.test.js') ||
    filePath.endsWith('.test.d.ts') ||
    filePath.endsWith('.stories.js') ||
    filePath.endsWith('.stories.d.ts')
  );
}

for (const packageDirArg of packageDirs) {
  const packageDir = path.resolve(workspaceRoot, packageDirArg);
  const distDir = path.join(packageDir, 'dist');

  try {
    const distStat = await stat(distDir);
    if (!distStat.isDirectory()) throw new Error('path is not a directory');
  } catch (error) {
    throw new Error(
      `${packageDirArg}: missing publish directory ${distDir}; run "npm run build:publish" before "npm run pack:smoke"`,
      { cause: error },
    );
  }

  const { stdout } = await execFileAsync('npm', ['pack', '--json'], {
    cwd: distDir,
    encoding: 'utf8',
  });

  const [packResult] = JSON.parse(stdout);
  const leakedTestArtifacts = packResult.files.filter((file) => isTestArtifact(file.path));
  if (leakedTestArtifacts.length > 0) {
    throw new Error(
      `${packageDirArg} tarball still includes test artifacts: ${leakedTestArtifacts
        .map((file) => file.path)
        .join(', ')}`,
    );
  }

  await rm(path.join(distDir, packResult.filename), { force: true });
  console.log(
    `${packageDirArg}: packed ${packResult.filename} (${packResult.entryCount} entries, ${packResult.size} bytes)`,
  );
}
