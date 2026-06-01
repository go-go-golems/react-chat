#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { getPackageSet, listPackageSetNames } from './package-sets.mjs';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const npmRegistry = 'https://registry.npmjs.org/';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    provenance: true,
    skipExisting: false,
    tag: 'latest',
    packages: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (value === '--skip-existing') {
      args.skipExisting = true;
      continue;
    }
    if (value === '--no-provenance') {
      args.provenance = false;
      continue;
    }
    if (value === '--tag') {
      args.tag = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (value === '--package') {
      args.packages.push(argv[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (!args.packageSetName) {
      args.packageSetName = value;
      continue;
    }
    throw new Error(`Unexpected argument: ${value}`);
  }

  if (!args.packageSetName && args.packages.length === 0) {
    throw new Error(
      `Usage: node scripts/packages/publish-npm-package-set.mjs <package-set> [--tag <npm-tag>] [--skip-existing] [--dry-run] [--no-provenance]\n` +
        `   or: node scripts/packages/publish-npm-package-set.mjs --package <package-dir-or-name> [--package <package-dir-or-name> ...]\n` +
        `Known package sets: ${listPackageSetNames().join(', ')}`,
    );
  }

  if (!args.tag) {
    throw new Error('Expected a non-empty npm tag.');
  }

  if (args.tag === 'latest' && args.dryRun === false && process.env.CONFIRM_LATEST_PUBLISH !== 'true') {
    throw new Error('Refusing real latest publish without CONFIRM_LATEST_PUBLISH=true.');
  }

  return args;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function listWorkspacePackages() {
  const knownDirs = getPackageSet('all');
  const entries = [];
  for (const packageDir of knownDirs) {
    const packageJson = await readJson(path.join(workspaceRoot, packageDir, 'package.json'));
    entries.push({ packageDir, name: packageJson.name });
  }
  return entries;
}

async function resolvePackageArgs(packageArgs) {
  const workspacePackages = await listWorkspacePackages();
  const byName = new Map(workspacePackages.map((entry) => [entry.name, entry.packageDir]));
  const byDir = new Map(workspacePackages.map((entry) => [entry.packageDir, entry.packageDir]));

  return packageArgs.map((packageArg) => {
    if (byName.has(packageArg)) {
      return byName.get(packageArg);
    }
    const normalized = packageArg.replace(/^\.\//, '');
    if (byDir.has(normalized)) {
      return byDir.get(normalized);
    }
    if (normalized.startsWith('packages/')) {
      return normalized;
    }
    throw new Error(`Unknown package: ${packageArg}`);
  });
}

function runNpm(args, cwd, { inherit = true } = {}) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, args, {
    cwd,
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    encoding: inherit ? undefined : 'utf8',
  });

  return result;
}

function npmViewExists(packageName, version) {
  const result = runNpm(
    ['view', `${packageName}@${version}`, 'version', `--registry=${npmRegistry}`],
    workspaceRoot,
    { inherit: false },
  );
  return result.status === 0;
}

function publishPackage(distDir, tag, dryRun, provenance) {
  const publishArgs = [
    'publish',
    distDir,
    '--access',
    'public',
    '--tag',
    tag,
    `--registry=${npmRegistry}`,
  ];

  if (provenance && !dryRun) {
    publishArgs.push('--provenance');
  }

  if (dryRun) {
    publishArgs.push('--dry-run');
  }

  return runNpm(publishArgs, workspaceRoot).status ?? 1;
}

const args = parseArgs(process.argv.slice(2));
const packageDirs = args.packages.length > 0
  ? await resolvePackageArgs(args.packages)
  : getPackageSet(args.packageSetName);

const summary = [];

for (const packageDir of packageDirs) {
  const distDir = path.join(packageDir, 'dist');
  const packageJson = await readJson(path.join(workspaceRoot, distDir, 'package.json'));
  const packageName = packageJson.name;
  const version = packageJson.version;

  console.log(`\n==> ${packageName}@${version} (${distDir})`);

  if (npmViewExists(packageName, version)) {
    if (args.skipExisting) {
      console.log(`${packageName}@${version} already exists on npmjs; skipping.`);
      summary.push({ packageName, version, status: 'skipped-existing' });
      continue;
    }
    throw new Error(`${packageName}@${version} already exists on npmjs.`);
  }

  const exitCode = publishPackage(distDir, args.tag, args.dryRun, args.provenance);
  if (exitCode !== 0) {
    summary.push({ packageName, version, status: 'failed' });
    process.exit(exitCode);
  }

  summary.push({ packageName, version, status: args.dryRun ? 'dry-run' : 'published' });
}

console.log('\nPublish summary:');
for (const entry of summary) {
  console.log(`- ${entry.packageName}@${entry.version}: ${entry.status}`);
}
