#!/usr/bin/env node
// Publishes the @haiiro/* packages to npm.
//
//   yarn release                         все три пакета, версия +patch
//   yarn release docuflow                только docuflow
//   yarn release chats --bump minor      patch | minor | major | 1.2.3
//   yarn release --tag next              npm dist-tag (по умолчанию latest)
//   yarn release --dry-run               собрать и показать архив, не публикуя
//   yarn release --install               после публикации поставить в CRM
//
// Each package is tested, typechecked and built, then staged in .publish/<name>
// and published from there. NPM_TOKEN comes from .env and is written only to
// a temporary npmrc outside the repository.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  PACKAGES,
  ROOT,
  buildAndStage,
  capture,
  fail,
  fetchRegistryVersion,
  parseArgs,
  readPackageJson,
  run,
  runScript,
  step,
} from './lib/common.mjs';

const { names, options } = parseArgs(process.argv.slice(2), {
  booleans: ['dry-run', 'install', 'skip-checks', 'help'],
});

if (options.help) {
  console.log('См. комментарий в начале scripts/publish.mjs');
  process.exit(0);
}

const bump = options.bump ?? 'patch';
const tag = options.tag ?? 'latest';
const isDryRun = options['dry-run'] === true;
const token = process.env.NPM_TOKEN ?? '';

if (!isDryRun && !token.startsWith('npm_')) {
  fail('Нет NPM_TOKEN в .env (токен npm с правом публикации в @haiiro)');
}

const npmConfigDir = mkdtempSync(join(tmpdir(), 'haiiro-npm-'));
const npmrc = join(npmConfigDir, '.npmrc');

writeFileSync(npmrc, `//registry.npmjs.org/:_authToken=${token}\nregistry=https://registry.npmjs.org/\n`, {
  mode: 0o600,
});

const npmEnv = { ...process.env, NPM_CONFIG_USERCONFIG: npmrc };

const getPublishedVersions = async (name) => {
  const response = await fetch(`https://registry.npmjs.org/${name}`, { headers: { 'cache-control': 'no-cache' } });

  return response.ok ? Object.keys((await response.json()).versions ?? {}) : [];
};

const parseVersion = (version) => version.split(/[.-]/).slice(0, 3).map(Number);

const compareVersions = (first, second) => {
  const [a, b] = [parseVersion(first), parseVersion(second)];

  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
};

const incrementVersion = (version, part) => {
  const [major, minor, patch] = parseVersion(version);

  if (part === 'major') return `${major + 1}.0.0`;
  if (part === 'minor') return `${major}.${minor + 1}.0`;
  if (part === 'patch') return `${major}.${minor}.${patch + 1}`;

  fail(`--bump ${part}: нужно patch, minor, major, none или точная версия`);
};

// The next version starts from whichever is higher, the local package.json or
// the latest on npm, so a forgotten bump never collides with a release.
const bumpVersion = async (key) => {
  const { name, dir } = PACKAGES[key];
  const localVersion = readPackageJson(key).version;
  const published = await getPublishedVersions(name);

  let version = localVersion;

  if (/^\d+\.\d+\.\d+/.test(bump)) {
    version = bump;
  } else if (bump !== 'none') {
    const latest = published.length > 0 ? (await fetchRegistryVersion(name)).version : '0.0.0';

    version = incrementVersion(compareVersions(localVersion, latest) >= 0 ? localVersion : latest, bump);
  }

  if (published.includes(version)) {
    fail(`${name}@${version} уже есть в npm`);
  }

  if (version !== localVersion) {
    run('npm', ['version', version, '--no-git-tag-version'], { cwd: join(ROOT, dir), stdio: 'ignore' });
  }

  return version;
};

const published = [];

try {
  if (!isDryRun) {
    step(`npm: ${capture('npm', ['whoami'], { env: npmEnv })}`);
  }

  for (const key of names) {
    const { name, dir } = PACKAGES[key];
    const packageDir = join(ROOT, dir);

    console.log(`\n════════ ${name} ════════`);

    if (options['skip-checks'] !== true) {
      step(`${key}: тесты и типы`);
      runScript(key, 'typecheck');
      runScript(key, 'test');
    }

    const version = isDryRun ? readPackageJson(key).version : await bumpVersion(key);

    step(`${key}: версия ${version}`);

    const stageDir = buildAndStage(key);
    const args = ['publish', stageDir, '--access', 'public', '--tag', tag];

    if (isDryRun) {
      run('npm', ['pack', '--dry-run'], { cwd: stageDir, env: npmEnv });
      continue;
    }

    run('npm', args, { env: npmEnv });
    published.push(key);
    console.log(`✓ ${name}@${version} опубликован (tag ${tag})`);
  }
} finally {
  rmSync(npmConfigDir, { recursive: true, force: true });
}

if (options.install && published.length > 0) {
  // The registry may serve the previous "latest" for a few seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));
  run('node', [join(ROOT, 'scripts/reinstall.mjs'), ...published]);
}
