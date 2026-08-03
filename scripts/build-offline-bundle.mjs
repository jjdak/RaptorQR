import { createHash } from 'node:crypto';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webDist = join(repoRoot, 'apps', 'web', 'dist');
const launcherSource = join(repoRoot, 'deploy', 'offline');
const releaseRoot = join(repoRoot, 'release');
const outputRoot = join(releaseRoot, 'raptorqr-offline');
const outputWeb = join(outputRoot, 'web');

assertFile(join(webDist, 'index.html'), 'Run `pnpm build` before creating the offline bundle.');
assertFile(join(launcherSource, 'start-windows.cmd'));
assertFile(join(launcherSource, 'start-unix.sh'));

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
cpSync(webDist, outputWeb, { recursive: true });
cpSync(launcherSource, outputRoot, { recursive: true });
chmodSync(join(outputRoot, 'start-unix.sh'), 0o755);

validateWebBuild(outputWeb);

const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const manifestPath = join(outputRoot, 'offline-manifest.json');
const files = collectFiles(outputRoot)
  .filter((path) => path !== manifestPath)
  .map((path) => ({
    path: relative(outputRoot, path).replaceAll('\\', '/'),
    bytes: statSync(path).size,
    sha256: sha256(path),
  }));

writeFileSync(
  manifestPath,
  `${JSON.stringify({
    name: 'RaptorQR offline deployment',
    version: packageJson.version,
    files,
  }, null, 2)}\n`,
);

console.log(`Offline deployment created at ${outputRoot}`);
console.log(`Included ${files.length} files (${formatBytes(files.reduce((sum, file) => sum + file.bytes, 0))}).`);

function assertFile(path, hint = '') {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Required file is missing: ${path}${hint ? `\n${hint}` : ''}`);
  }
}

function validateWebBuild(root) {
  const paths = collectFiles(root);
  const wasmFiles = paths.filter((path) => path.endsWith('.wasm'));
  const workerFiles = paths.filter((path) => /worker[^/\\]*\.js$/i.test(path));

  if (wasmFiles.length < 4) {
    throw new Error(`Offline web build is incomplete: expected at least 4 WASM files, found ${wasmFiles.length}.`);
  }
  if (workerFiles.length < 4) {
    throw new Error(`Offline web build is incomplete: expected at least 4 worker files, found ${workerFiles.length}.`);
  }

  const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
  const remoteAsset = /<(?:script|link)\b[^>]+(?:src|href)=["']https?:\/\//i.exec(indexHtml);
  if (remoteAsset) {
    throw new Error(`Offline index.html contains a remote runtime asset: ${remoteAsset[0]}`);
  }
}

function collectFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  visit(root);
  return files.sort();
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
