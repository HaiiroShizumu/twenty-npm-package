// Builds what a stock Twenty install needs (one script, one stylesheet with
// its fonts) and the library entry with declarations for npm consumers
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(packageDirectory, 'dist');

rmSync(outputDirectory, { recursive: true, force: true });

await build({
  entryPoints: [resolve(packageDirectory, 'src/standalone/index.ts')],
  outfile: resolve(outputDirectory, 'standalone/standalone.js'),
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
});

await build({
  entryPoints: [resolve(packageDirectory, 'styles/standalone-entry.css')],
  outfile: resolve(outputDirectory, 'standalone/skin.css'),
  bundle: true,
  minify: true,
  loader: { '.woff2': 'file' },
  assetNames: 'fonts/[name]',
});

await build({
  entryPoints: [resolve(packageDirectory, 'src/index.ts')],
  outfile: resolve(outputDirectory, 'index.js'),
  bundle: true,
  format: 'esm',
  target: ['es2020'],
});

execFileSync(
  'npx',
  ['tsc', '-p', resolve(packageDirectory, 'tsconfig.build.json')],
  { stdio: 'inherit' },
);
