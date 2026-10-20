#!/usr/bin/env node
// Reinstalls the @haiiro/* packages into the CRM.
//
//   yarn reinstall                       все три пакета, последние версии из npm
//   yarn reinstall docuflow chats        только эти пакеты
//   yarn reinstall --local               локальная сборка из packages/*, без npm
//   yarn reinstall --clean               сначала удалить приложения из CRM
//                                        (их объекты и данные удаляются тоже)
//   yarn reinstall docuflow --version 0.0.5
//   yarn reinstall interface --no-restart  не перезапускать контейнер после скина
//
// Apps (docuflow, chats) go through the CRM metadata API, so only CRM_URL and
// CRM_API_KEY matter; nothing on the server side has to be configured.
// The skin (interface) is patched into the built Twenty front: inside the
// docker container TWENTY_CONTAINER, or into the folder TWENTY_FRONT_DIR.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  PACKAGES,
  buildAndStage,
  getDevVersion,
  capture,
  downloadTarball,
  fail,
  getCrmConnection,
  getInstalledApp,
  packStaged,
  parseArgs,
  run,
  step,
  uninstallApp,
  uploadAndInstallApp,
} from './lib/common.mjs';

const { names, options } = parseArgs(process.argv.slice(2), { booleans: ['local', 'clean', 'no-restart', 'help'] });

if (options.help) {
  console.log(
    (await import('node:fs')).readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 15).join('\n'),
  );
  process.exit(0);
}

const DEFAULT_CONTAINER = 'twenty-app-dev';
const CONTAINER_FRONT_DIR = '/app/packages/twenty-server/dist/front';

const waitForCrm = async () => {
  const url = (process.env.CRM_URL ?? 'http://localhost:2020').replace(/\/+$/, '');

  for (let attempt = 0; attempt < 90; attempt++) {
    const response = await fetch(`${url}/`, { headers: { accept: 'text/html' } }).catch(() => null);

    if (response?.ok) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  fail(`CRM ${url} не поднялась после перезапуска за 3 минуты`);
};

const readTarballManifest = (tarball) =>
  JSON.parse(
    execFileSync('tar', ['-xzOf', '-', 'package/manifest.json'], { input: tarball, encoding: 'utf8' }),
  );

const readTarballVersion = (tarball) =>
  JSON.parse(execFileSync('tar', ['-xzOf', '-', 'package/package.json'], { input: tarball, encoding: 'utf8' }))
    .version;

// Where the package comes from: the npm registry or a build of packages/*
const getTarball = async (key) => {
  const { name } = PACKAGES[key];

  if (options.local) {
    const tarball = packStaged(buildAndStage(key, { version: getDevVersion(key) }));

    return { tarball, version: readTarballVersion(tarball), origin: 'локальная сборка' };
  }

  const { tarball, version } = await downloadTarball(name, options.version ?? 'latest');

  return { tarball, version, origin: 'npm' };
};

const reinstallApp = async (key, connection) => {
  const { name } = PACKAGES[key];
  const { tarball, version, origin } = await getTarball(key);
  const { application } = readTarballManifest(tarball);
  const label = `${name}@${version}`;

  console.log(`\n════════ ${label} (${origin}) ════════`);

  const installed = await getInstalledApp(connection, application.universalIdentifier);

  if (options.clean && installed !== null) {
    step(`удаляю «${installed.name}» ${installed.version} из CRM`);
    await uninstallApp(connection, application.universalIdentifier);
  }

  step(`загружаю в CRM ${connection.url} (${(tarball.length / 1e6).toFixed(1)} МБ)`);
  await uploadAndInstallApp(connection, {
    label,
    tarball,
    universalIdentifier: application.universalIdentifier,
    version,
  });

  console.log(`✓ «${application.displayName}» ${version} установлен`);
};

// The skin is not a Twenty app: its installer copies files into the built
// front and adds two tags to index.html.
const reinstallSkin = async (key) => {
  const { name } = PACKAGES[key];
  const workDir = mkdtempSync(join(tmpdir(), 'nordiv-skin-'));

  try {
    let packageDir;
    let version;

    if (options.local) {
      version = getDevVersion(key);
      packageDir = buildAndStage(key, { version });
    } else {
      const download = await downloadTarball(name, options.version ?? 'latest');

      version = download.version;
      writeFileSync(join(workDir, 'skin.tgz'), download.tarball);
      execFileSync('tar', ['-xzf', join(workDir, 'skin.tgz'), '-C', workDir]);
      packageDir = join(workDir, 'package');
    }

    console.log(`\n════════ ${name}@${version} (${options.local ? 'локальная сборка' : 'npm'}) ════════`);

    const frontDir = process.env.TWENTY_FRONT_DIR;

    if (frontDir !== undefined && frontDir !== '') {
      if (!existsSync(join(frontDir, 'index.html'))) {
        fail(`TWENTY_FRONT_DIR=${frontDir}: там нет index.html собранного фронта Twenty`);
      }

      if (options.clean) {
        run('node', [join(packageDir, 'bin/nordiv-skin.mjs'), 'uninstall', frontDir]);
      }
      run('node', [join(packageDir, 'bin/nordiv-skin.mjs'), 'install', frontDir]);
    } else {
      const container = process.env.TWENTY_CONTAINER || DEFAULT_CONTAINER;
      const remoteDir = `/tmp/nordiv-skin-${version}`;

      if (capture('docker', ['ps', '-q', '-f', `name=^${container}$`]) === '') {
        fail(`Контейнер ${container} не запущен. Укажите TWENTY_CONTAINER или TWENTY_FRONT_DIR в .env`);
      }

      step(`ставлю в контейнер ${container}:${CONTAINER_FRONT_DIR}`);
      run('docker', ['exec', container, 'rm', '-rf', remoteDir]);
      run('docker', ['cp', packageDir, `${container}:${remoteDir}`]);

      if (options.clean) {
        run('docker', ['exec', container, 'node', `${remoteDir}/bin/nordiv-skin.mjs`, 'uninstall', CONTAINER_FRONT_DIR]);
      }
      run('docker', ['exec', container, 'node', `${remoteDir}/bin/nordiv-skin.mjs`, 'install', CONTAINER_FRONT_DIR]);
      run('docker', ['exec', container, 'rm', '-rf', remoteDir]);

      // The server reads index.html once at start, so it serves the new tags
      // only after a restart.
      if (options['no-restart'] !== true) {
        step(`перезапускаю ${container}`);
        run('docker', ['restart', container], { stdio: 'ignore' });
        await waitForCrm();
      }
    }

    console.log(`✓ скин ${version} установлен (обновите страницу CRM с очисткой кэша)`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
};

const appKeys = names.filter((key) => PACKAGES[key].kind === 'app');
const connection = appKeys.length > 0 ? getCrmConnection() : null;
const failures = [];

for (const key of names) {
  try {
    if (PACKAGES[key].kind === 'app') {
      await reinstallApp(key, connection);
    } else {
      await reinstallSkin(key);
    }
  } catch (error) {
    console.error(`✗ ${PACKAGES[key].name}: ${error.message}`);
    failures.push(key);
  }
}

if (failures.length > 0) {
  fail(`Не установлено: ${failures.join(', ')}`);
}

console.log('\n✓ Готово. Обновите страницу CRM.');
