// Shared by scripts/reinstall.mjs and scripts/publish.mjs: settings from
// .env, the package list, building/staging packages and the CRM metadata API.
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const STAGE_DIR = join(ROOT, '.publish');
export const REGISTRY_URL = 'https://registry.npmjs.org';

if (existsSync(join(ROOT, '.env'))) {
  process.loadEnvFile(join(ROOT, '.env'));
}

// kind "app": a Twenty app (Yarn), built by `twenty dev:build` into
// .twenty/output and installed into the CRM through the metadata API.
// kind "skin": @haiiro/interface (npm), staged by its scripts/stage-publish.mjs
// and patched into the built Twenty front.
export const PACKAGES = {
  docuflow: { name: '@haiiro/docuflow', dir: 'docuflow', kind: 'app' },
  chats: { name: '@haiiro/chats', dir: 'chats', kind: 'app' },
  interface: { name: '@haiiro/interface', dir: 'interface', kind: 'skin' },
};

export const fail = (message) => {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
};

export const step = (message) => console.log(`→ ${message}`);

export const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: 'inherit', cwd: ROOT, ...options });

export const capture = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: ROOT, encoding: 'utf8', ...options }).trim();

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

// Positional names pick packages (all by default); --flag and --flag=value
// or --flag value become options.
export const parseArgs = (argv, { booleans = [] } = {}) => {
  const names = [];
  const options = {};

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];

    if (!argument.startsWith('--')) {
      names.push(argument);
      continue;
    }

    const [key, inlineValue] = argument.slice(2).split('=', 2);

    options[key] = booleans.includes(key) ? true : (inlineValue ?? argv[++index]);
  }

  for (const name of names) {
    if (PACKAGES[name] === undefined) {
      fail(`Неизвестный пакет «${name}». Есть: ${Object.keys(PACKAGES).join(', ')}`);
    }
  }

  return { names: names.length > 0 ? names : Object.keys(PACKAGES), options };
};

export const readPackageJson = (key) => readJson(join(ROOT, PACKAGES[key].dir, 'package.json'));

// Each folder keeps its own package manager: Yarn for the apps, npm for the skin
export const runScript = (key, script) =>
  PACKAGES[key].kind === 'skin'
    ? run('npm', ['run', script], { cwd: join(ROOT, PACKAGES[key].dir) })
    : run('yarn', [script], { cwd: join(ROOT, PACKAGES[key].dir) });

// Builds a package and copies exactly what npm should get into
// .publish/<key>. For an app that is the build output plus the installer,
// the same layout as the published tarballs. `version` overrides the version
// for this build only (the manifest checksums package.json, so it has to be
// in place before the build); package.json is restored afterwards.
export const buildAndStage = (key, { version } = {}) => {
  const { dir, kind } = PACKAGES[key];
  const packageDir = join(ROOT, dir);
  const packageJsonPath = join(packageDir, 'package.json');
  const originalPackageJson = readFileSync(packageJsonPath, 'utf8');
  const stageDir = join(STAGE_DIR, key);

  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  if (version !== undefined) {
    writeFileSync(
      packageJsonPath,
      `${JSON.stringify({ ...JSON.parse(originalPackageJson), version }, null, 2)}\n`,
    );
  }

  try {
    step(`${key}: сборка ${JSON.parse(readFileSync(packageJsonPath, 'utf8')).version}`);

    if (kind === 'skin') {
      // The package's own staging: exports switched from sources to dist
      run('node', ['scripts/stage-publish.mjs'], { cwd: packageDir });
      cpSync(join(packageDir, '.publish'), stageDir, { recursive: true });
    } else {
      run('yarn', ['build'], { cwd: packageDir });
      cpSync(join(packageDir, '.twenty/output'), stageDir, {
        recursive: true,
        filter: (source) => !source.endsWith('.map'),
      });
      cpSync(join(packageDir, 'bin'), join(stageDir, 'bin'), { recursive: true });
    }
  } finally {
    writeFileSync(packageJsonPath, originalPackageJson);
  }

  return stageDir;
};

// A local build installed into the CRM gets a prerelease of the next patch:
// higher than anything deployed from npm so far, lower than the next release.
export const getDevVersion = (key) => {
  const [major, minor, patch] = readPackageJson(key).version.split(/[.-]/).map(Number);

  return `${major}.${minor}.${patch + 1}-dev.${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
};

// npm pack of a staged folder, for installing a local build without npm.
export const packStaged = (stageDir) => {
  const output = capture('npm', ['pack', '--json', '--pack-destination', STAGE_DIR], {
    cwd: stageDir,
  });
  const [{ filename }] = JSON.parse(output);

  return readFileSync(join(STAGE_DIR, filename));
};

export const fetchRegistryVersion = async (name, version = 'latest') => {
  const response = await fetch(`${REGISTRY_URL}/${name}/${version}`, {
    headers: { 'cache-control': 'no-cache' },
  });

  if (!response.ok) {
    fail(`В npm нет ${name}@${version} (HTTP ${response.status})`);
  }

  return response.json();
};

export const downloadTarball = async (name, version) => {
  const metadata = await fetchRegistryVersion(name, version);
  const response = await fetch(metadata.dist.tarball);

  if (!response.ok) {
    fail(`Не удалось скачать ${name}@${metadata.version} (HTTP ${response.status})`);
  }

  return { version: metadata.version, tarball: Buffer.from(await response.arrayBuffer()) };
};

export const listFiles = (dir) =>
  readdirSync(dir, { recursive: true }).filter((file) => statSync(join(dir, file)).isFile());

// ---------- CRM metadata API ----------

export const getCrmConnection = () => {
  const url = (process.env.CRM_URL ?? 'http://localhost:2020').replace(/\/+$/, '');
  const apiKey = process.env.CRM_API_KEY ?? '';

  if (apiKey === '') {
    fail('Нет CRM_API_KEY в .env: ключ из «Настройки → API и вебхуки» этой CRM');
  }

  if (apiKey.startsWith('npm_')) {
    fail('В CRM_API_KEY лежит токен npm, а нужен ключ API самой CRM');
  }

  return { url, apiKey };
};

export class CrmError extends Error {
  constructor(graphqlError, status) {
    const friendly = graphqlError?.extensions?.userFriendlyMessage;
    const message =
      (typeof friendly === 'string' ? friendly : friendly?.message) ??
      graphqlError?.message ??
      `HTTP ${status}`;

    super(graphqlError?.message && graphqlError.message !== message ? `${message} (${graphqlError.message})` : message);
    this.extensions = graphqlError?.extensions ?? {};
  }
}

export const callMetadata = async ({ url, apiKey }, query, variables) => {
  let response;

  try {
    response = await fetch(`${url}/metadata`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    fail(`CRM ${url} не отвечает: ${error.message}`);
  }

  const body = await response.json().catch(() => undefined);
  const [firstError] = body?.errors ?? [];

  if (
    response.status === 401 ||
    ['UNAUTHENTICATED', 'FORBIDDEN'].includes(firstError?.extensions?.code)
  ) {
    fail(`CRM не приняла ключ API: ${firstError?.message ?? response.status}. Обновите CRM_API_KEY в .env`);
  }

  if (firstError !== undefined || body?.data === undefined) {
    throw new CrmError(firstError, response.status);
  }

  return body.data;
};

// The app as installed in the CRM ({ name, version }), or null
export const getInstalledApp = async (connection, universalIdentifier) => {
  const { findManyApplications } = await callMetadata(
    connection,
    `query FindManyApplications { findManyApplications { id name universalIdentifier version } }`,
  );

  return findManyApplications.find((app) => app.universalIdentifier === universalIdentifier) ?? null;
};

export const uninstallApp = (connection, universalIdentifier) =>
  callMetadata(
    connection,
    `mutation UninstallApplication($universalIdentifier: String!) {
      uninstallApplication(universalIdentifier: $universalIdentifier)
    }`,
    { universalIdentifier },
  );

// The same flow as bin/install.mjs of the packages: the archive goes into
// the CRM file storage, then the app is installed from it.
export const uploadAndInstallApp = async (connection, { label, tarball, universalIdentifier, version }) => {
  const { createFileUpload } = await callMetadata(
    connection,
    `mutation CreateFileUpload($filename: String!, $size: Float!, $fileFolder: FileFolder!) {
      createFileUpload(filename: $filename, size: $size, fileFolder: $fileFolder) { fileId uploadUrl contentType }
    }`,
    { filename: `${label.replace(/[@/]/g, '-')}.tgz`, size: tarball.length, fileFolder: 'AppTarball' },
  );

  const upload = await fetch(createFileUpload.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': createFileUpload.contentType },
    body: tarball,
  });

  if (!upload.ok) {
    throw new Error(`хранилище файлов CRM не приняло архив (HTTP ${upload.status} ${await upload.text()})`);
  }

  let skipTarball = false;

  try {
    await callMetadata(
      connection,
      `mutation CompleteAppTarballUpload($fileId: UUID!) {
        completeAppTarballUpload(fileId: $fileId) { id }
      }`,
      { fileId: createFileUpload.fileId },
    );
  } catch (error) {
    const message = `${error.message}`;

    // The CRM keeps every deployed archive, also after an uninstall: the
    // same version is installed from the copy it already has.
    if (/not higher than the currently deployed/i.test(message)) {
      console.log(`  версия ${version} уже загружена в CRM раньше, ставлю её`);
    } else if (
      // App came from the npm catalog: the server installs the same version
      // from the registry, not from this archive.
      /source channel|Cannot upload tarball|already claimed/i.test(message) ||
      error.extensions?.code === 'SOURCE_CHANNEL_MISMATCH' ||
      error.extensions?.subCode === 'SOURCE_CHANNEL_MISMATCH' ||
      error.extensions?.subCode === 'UNIVERSAL_IDENTIFIER_ALREADY_CLAIMED'
    ) {
      console.log('  приложение из каталога npm — ставлю версию через каталог');
      skipTarball = true;
    } else {
      throw error;
    }
  }

  if (skipTarball && /dev\./.test(version)) {
    throw new Error(
      `Локальная версия ${version} не ставится поверх приложения из npm. Сначала yarn release, затем yarn reinstall без --local`,
    );
  }

  try {
    await callMetadata(
      connection,
      `mutation InstallApplication($universalIdentifier: String!, $version: String) {
        installApplication(universalIdentifier: $universalIdentifier, version: $version) { id }
      }`,
      { universalIdentifier, version },
    );
  } catch (error) {
    // The same version is installed already: nothing to do
    if (!/already installed/i.test(error.message)) {
      throw error;
    }
  }
};
