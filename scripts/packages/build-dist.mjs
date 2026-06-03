#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readdir, copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const packageDir = process.cwd();
const workspaceRoot = path.resolve(packageDir, '..', '..');
const srcDir = path.join(packageDir, 'src');
const distDir = path.join(packageDir, 'dist');
const packageJsonPath = path.join(packageDir, 'package.json');
const packageReadmePath = path.join(packageDir, 'README.md');
const tsconfigPath = path.join(packageDir, 'tsconfig.json');
const tempTsconfigPath = path.join(packageDir, '.tsconfig.build-dist.tmp.json');
const tempTsbuildInfoPath = path.join(packageDir, '.tsconfig.build-dist.tmp.tsbuildinfo');
const publishPackageJsonPath = path.join(distDir, 'package.json');
const publishIgnorePath = path.join(distDir, '.npmignore');
const publishReadmePath = path.join(distDir, 'README.md');
const assetSuffixes = ['.css', '.vm.js'];
const publishArtifactIgnorePattern = /\.(test|stories)\.(d\.ts|js)$/;

function isAssetFile(filename) {
  return assetSuffixes.some((suffix) => filename.endsWith(suffix));
}

async function walkAssets(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkAssets(fullPath)));
      continue;
    }
    if (entry.isFile() && isAssetFile(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function rewritePathTarget(target) {
  if (target.startsWith('./src/')) {
    if (target.endsWith('.vm.js') || target.endsWith('.css')) {
      return target.replace(/^\.\/src\//, './dist/');
    }
    if (target.endsWith('.ts') || target.endsWith('.tsx')) {
      return target
        .replace(/^\.\/src\//, './dist/')
        .replace(/\.(ts|tsx)$/, '.d.ts');
    }
  }
  if (target.endsWith('/src/index.ts')) {
    return target.replace(/\/src\/index\.ts$/, '/dist/index.d.ts');
  }
  if (target.match(/\/src\/.+\.(ts|tsx)$/)) {
    return target.replace(/\/src\/(.+)\.(ts|tsx)$/, '/dist/$1.d.ts');
  }
  if (target.match(/\/src\/.+\.css$/) || target.match(/\/src\/.+\.vm\.js$/)) {
    return target.replace(/\/src\/(.+)$/, '/dist/$1');
  }
  if (target.endsWith('/src/*')) {
    return target.replace(/\/src\/\*$/, '/dist/*');
  }
  if (target.endsWith('/src')) {
    return target.replace(/\/src$/, '/dist/index.d.ts');
  }
  return target;
}

async function listWorkspacePackageDirs() {
  const packageRoots = [path.join(workspaceRoot, 'packages'), path.join(workspaceRoot, 'apps')];
  const dirs = [];

  for (const root of packageRoots) {
    let entries;
    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      dirs.push(path.join(root, entry.name));
    }
  }

  return dirs;
}

async function readWorkspacePackages() {
  const packageDirs = await listWorkspacePackageDirs();
  const packages = [];

  for (const candidateDir of packageDirs) {
    const candidatePackageJsonPath = path.join(candidateDir, 'package.json');
    let candidatePackageJsonRaw;
    try {
      candidatePackageJsonRaw = await readFile(candidatePackageJsonPath, 'utf8');
    } catch {
      continue;
    }

    const candidatePackageJson = JSON.parse(candidatePackageJsonRaw);
    const candidatePackageName = String(candidatePackageJson.name ?? '').trim();
    if (!candidatePackageName) {
      continue;
    }

    packages.push({
      dir: candidateDir,
      name: candidatePackageName,
      version: String(candidatePackageJson.version ?? '').trim(),
      packageJson: candidatePackageJson,
    });
  }

  return packages;
}

function collectExportTargets(packageName, packageDirname, packageJson) {
  const targets = new Map();
  const exportsField = packageJson.exports;

  if (typeof exportsField === 'string') {
    targets.set(packageName, exportsField);
    return targets;
  }

  if (exportsField && typeof exportsField === 'object' && !Array.isArray(exportsField)) {
    for (const [key, value] of Object.entries(exportsField)) {
      if (typeof value !== 'string') {
        continue;
      }
      if (key === '.') {
        targets.set(packageName, value);
        continue;
      }
      if (!key.startsWith('./')) {
        continue;
      }
      targets.set(`${packageName}/${key.slice(2)}`, value);
    }
  }

  if (!targets.has(packageName)) {
    if (typeof packageJson.types === 'string') {
      targets.set(packageName, packageJson.types);
    } else if (typeof packageJson.main === 'string') {
      targets.set(packageName, packageJson.main);
    }
  }

  const resolvedTargets = new Map();
  for (const [alias, target] of targets.entries()) {
    const rewrittenTarget = rewritePathTarget(target);
    const absoluteTarget = rewrittenTarget.startsWith('.')
      ? path.resolve(packageDirname, rewrittenTarget)
      : path.resolve(packageDirname, rewrittenTarget);
    resolvedTargets.set(alias, [path.relative(packageDir, absoluteTarget)]);
  }

  return resolvedTargets;
}

async function buildWorkspacePackagePaths(currentPackageName) {
  const workspacePackages = await readWorkspacePackages();
  const generatedPaths = {};

  for (const workspacePackage of workspacePackages) {
    const candidateDir = workspacePackage.dir;
    if (candidateDir === packageDir) {
      continue;
    }
    const candidatePackageName = workspacePackage.name;
    if (!candidatePackageName || candidatePackageName === currentPackageName) {
      continue;
    }

    const exportTargets = collectExportTargets(
      candidatePackageName,
      candidateDir,
      workspacePackage.packageJson,
    );
    for (const [alias, values] of exportTargets.entries()) {
      generatedPaths[alias] = values;
    }
  }

  return generatedPaths;
}

async function writeBuildTsconfig() {
  const [packageJsonRaw, tsconfigRaw] = await Promise.all([
    readFile(packageJsonPath, 'utf8'),
    readFile(tsconfigPath, 'utf8'),
  ]);

  const packageJson = JSON.parse(packageJsonRaw);
  const tsconfig = JSON.parse(tsconfigRaw);
  const packageName = String(packageJson.name ?? '').trim();
  const currentPaths = tsconfig.compilerOptions?.paths ?? {};
  const rewrittenPaths = await buildWorkspacePackagePaths(packageName);

  for (const [key, values] of Object.entries(currentPaths)) {
    if (!Array.isArray(values)) {
      rewrittenPaths[key] = values;
      continue;
    }

    const isSelfAlias =
      key === packageName ||
      key === `${packageName}/*`;

    rewrittenPaths[key] = isSelfAlias
      ? values
      : values.map((value) => (typeof value === 'string' ? rewritePathTarget(value) : value));
  }

  const buildTsconfig = {
    ...tsconfig,
    references: undefined,
    compilerOptions: {
      ...(tsconfig.compilerOptions ?? {}),
      noEmit: false,
      declaration: true,
      declarationMap: false,
      sourceMap: false,
      outDir: distDir,
      tsBuildInfoFile: tempTsbuildInfoPath,
      allowImportingTsExtensions: false,
      paths: rewrittenPaths,
    },
  };

  await writeFile(tempTsconfigPath, `${JSON.stringify(buildTsconfig, null, 2)}\n`, 'utf8');
}

function runTscBuild() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['exec', '--', 'tsc', '-p', tempTsconfigPath], {
    cwd: packageDir,
    stdio: 'inherit',
  });

  return result.status ?? 1;
}

async function copyAssets() {
  const assets = await walkAssets(srcDir);
  for (const sourcePath of assets) {
    const relativePath = path.relative(srcDir, sourcePath);
    const targetPath = path.join(distDir, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }
  return assets.length;
}

async function removeIgnoredPublishArtifacts() {
  const files = await walkFiles(distDir);
  const ignoredFiles = files.filter((file) => publishArtifactIgnorePattern.test(file));
  await Promise.all(ignoredFiles.map((file) => rm(file, { force: true })));
  return ignoredFiles.length;
}

function shouldRewriteRelativeSpecifier(specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return false;
  }
  return !path.extname(specifier);
}

function rewriteRelativeSpecifier(specifier) {
  return shouldRewriteRelativeSpecifier(specifier) ? `${specifier}.js` : specifier;
}

function rewriteEsmRelativeImports(source) {
  return source
    .replace(/(\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"])(\.{1,2}\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => {
      return `${prefix}${rewriteRelativeSpecifier(specifier)}${suffix}`;
    })
    .replace(/(\bimport\s*\(\s*['"])(\.{1,2}\/[^'"]+)(['"]\s*\))/g, (_match, prefix, specifier, suffix) => {
      return `${prefix}${rewriteRelativeSpecifier(specifier)}${suffix}`;
    });
}

async function rewriteDistEsmImports() {
  const files = await walkFiles(distDir);
  const jsFiles = files.filter((file) => file.endsWith('.js'));
  let rewrittenCount = 0;
  for (const file of jsFiles) {
    const source = await readFile(file, 'utf8');
    const rewritten = rewriteEsmRelativeImports(source);
    if (rewritten !== source) {
      await writeFile(file, rewritten, 'utf8');
      rewrittenCount += 1;
    }
  }
  return rewrittenCount;
}

function rewritePublishRuntimeTarget(target) {
  if (typeof target !== 'string') {
    return target;
  }
  const normalizedTarget = target.startsWith('src/') ? `./${target}` : target;
  if (normalizedTarget.startsWith('./src/')) {
    const publishTarget = `./${normalizedTarget.slice('./src/'.length)}`;
    if (publishTarget.endsWith('.ts') || publishTarget.endsWith('.tsx')) {
      return publishTarget.replace(/\.(ts|tsx)$/, '.js');
    }
    return publishTarget;
  }
  return target;
}

function rewritePublishTypesTarget(target) {
  if (typeof target !== 'string') {
    return target;
  }
  const normalizedTarget = target.startsWith('src/') ? `./${target}` : target;
  if (normalizedTarget.startsWith('./src/')) {
    const publishTarget = `./${normalizedTarget.slice('./src/'.length)}`;
    if (publishTarget.endsWith('.ts') || publishTarget.endsWith('.tsx')) {
      return publishTarget.replace(/\.(ts|tsx)$/, '.d.ts');
    }
    return publishTarget;
  }
  return target;
}

function rewriteStringLeafs(value, mapper) {
  if (typeof value === 'string') {
    return mapper(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => rewriteStringLeafs(entry, mapper));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, rewriteStringLeafs(entry, mapper)]),
    );
  }
  return value;
}

function rewriteWorkspaceVersion(specifier, resolvedVersion) {
  if (typeof specifier !== 'string' || !specifier.startsWith('workspace:')) {
    return specifier;
  }

  const suffix = specifier.slice('workspace:'.length);
  if (!suffix || suffix === '*') {
    return resolvedVersion;
  }
  if (suffix === '^' || suffix === '~') {
    return `${suffix}${resolvedVersion}`;
  }
  if (suffix.startsWith('^') || suffix.startsWith('~')) {
    return `${suffix[0]}${resolvedVersion}`;
  }
  return suffix;
}

function rewriteDependencyMap(sectionName, dependencies, workspaceVersions) {
  if (!dependencies) {
    return undefined;
  }

  const rewrittenEntries = Object.entries(dependencies).map(([dependencyName, specifier]) => {
    if (typeof specifier !== 'string' || !specifier.startsWith('workspace:')) {
      return [dependencyName, specifier];
    }

    const resolvedVersion = workspaceVersions.get(dependencyName);
    if (!resolvedVersion) {
      throw new Error(`Cannot rewrite ${sectionName} ${dependencyName}=${specifier}: missing workspace version.`);
    }

    return [dependencyName, rewriteWorkspaceVersion(specifier, resolvedVersion)];
  });

  return Object.fromEntries(rewrittenEntries);
}

async function writePublishArtifacts() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const workspacePackages = await readWorkspacePackages();
  const workspaceVersions = new Map(
    workspacePackages.map((workspacePackage) => [workspacePackage.name, workspacePackage.version]),
  );

  const publishPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    description: packageJson.description,
    keywords: packageJson.keywords,
    repository: packageJson.repository,
    homepage: packageJson.homepage,
    bugs: packageJson.bugs,
    license: packageJson.license,
    author: packageJson.author,
    sideEffects: packageJson.sideEffects,
    files: packageJson.files,
    exports: rewriteStringLeafs(packageJson.exports, rewritePublishRuntimeTarget),
    main: rewritePublishRuntimeTarget(packageJson.main),
    module: rewritePublishRuntimeTarget(packageJson.module),
    types: rewritePublishTypesTarget(packageJson.types),
    dependencies: rewriteDependencyMap('dependency', packageJson.dependencies, workspaceVersions),
    peerDependencies: rewriteDependencyMap('peerDependency', packageJson.peerDependencies, workspaceVersions),
    optionalDependencies: rewriteDependencyMap(
      'optionalDependency',
      packageJson.optionalDependencies,
      workspaceVersions,
    ),
    peerDependenciesMeta: packageJson.peerDependenciesMeta,
    publishConfig: packageJson.publishConfig,
    engines: packageJson.engines,
  };

  const filteredPublishPackageJson = Object.fromEntries(
    Object.entries(publishPackageJson).filter(([, value]) => value !== undefined),
  );

  await writeFile(publishPackageJsonPath, `${JSON.stringify(filteredPublishPackageJson, null, 2)}\n`, 'utf8');
  await writeFile(publishIgnorePath, '**/*.test.js\n**/*.test.d.ts\n**/*.stories.js\n**/*.stories.d.ts\n', 'utf8');

  try {
    const readme = await readFile(packageReadmePath, 'utf8');
    await writeFile(publishReadmePath, readme, 'utf8');
  } catch {
    await rm(publishReadmePath, { force: true });
  }
}

let exitCode = 0;

try {
  await rm(distDir, { recursive: true, force: true });
  await rm(tempTsconfigPath, { force: true });
  await rm(tempTsbuildInfoPath, { force: true });
  await writeBuildTsconfig();
  exitCode = runTscBuild();
  if (exitCode === 0) {
    const removedIgnoredArtifacts = await removeIgnoredPublishArtifacts();
    const rewrittenImportFiles = await rewriteDistEsmImports();
    const copiedCount = await copyAssets();
    await writePublishArtifacts();
    console.log(
      `Removed ${removedIgnoredArtifacts} ignored publish artifact(s), rewrote ${rewrittenImportFiles} ESM import file(s), and copied ${copiedCount} asset file(s) into ${
        path.relative(packageDir, distDir) || 'dist'
      }.`,
    );
  }
} finally {
  await rm(tempTsconfigPath, { force: true });
  await rm(tempTsbuildInfoPath, { force: true });
}

if (exitCode !== 0) {
  process.exit(exitCode);
}
