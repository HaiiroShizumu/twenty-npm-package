// Builds the package and stages it in .publish/ with the published manifest:
// exports point at dist instead of the workspace TypeScript sources
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stageDirectory = join(packageDirectory, '.publish');
const manifest = JSON.parse(
  readFileSync(join(packageDirectory, 'package.json'), 'utf8'),
);

execFileSync('node', [join(packageDirectory, 'scripts/build.mjs')], {
  stdio: 'inherit',
});

rmSync(stageDirectory, { recursive: true, force: true });
mkdirSync(stageDirectory);

for (const entry of manifest.files) {
  cpSync(join(packageDirectory, entry), join(stageDirectory, entry), {
    recursive: true,
  });
}

const { publishConfig, scripts, devDependencies, ...publishedManifest } =
  manifest;

writeFileSync(
  join(stageDirectory, 'package.json'),
  `${JSON.stringify(
    {
      ...publishedManifest,
      exports: publishConfig.exports,
      types: './dist/types/index.d.ts',
      sideEffects: ['*.css', './dist/standalone/standalone.js'],
      publishConfig: { access: 'public' },
    },
    null,
    2,
  )}\n`,
);

console.log(`Staged in ${stageDirectory}; publish with: npm publish ${stageDirectory}`);
