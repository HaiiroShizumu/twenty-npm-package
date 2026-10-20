#!/usr/bin/env node
// Installs or updates this application on a CRM with one command:
//
//   npx @haiiro/docuflow install --url https://crm.example.ru --api-key <key>
//
// The published package of this very version is uploaded to the CRM as an
// application archive and installed, the way the platform CLI deploys an app.
// It does not depend on the marketplace catalog, so it works the same on any
// server, including one where the app was installed before from sources.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGISTRY_URL = 'https://registry.npmjs.org';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(packageDir, 'manifest.json'), 'utf8'));

const fail = (message) => {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
};

const readOptions = (args) => {
  const options = {};

  for (let index = 0; index < args.length; index++) {
    const [key, inlineValue] = args[index].split('=', 2);

    if (key === '--url' || key === '--api-key' || key === '--version') {
      options[key.slice(2)] = inlineValue ?? args[++index];
    } else if (key === '--help' || key === '-h') {
      options.help = true;
    } else if (key !== 'install') {
      fail(`Неизвестный параметр ${key}`);
    }
  }

  return {
    url: options.url ?? process.env.CRM_URL,
    apiKey: options['api-key'] ?? process.env.CRM_API_KEY,
    version: options.version ?? packageJson.version,
    help: options.help === true,
  };
};

const printHelp = () =>
  console.log(`
${packageJson.description}

Установка и обновление:
  npx ${packageJson.name} install --url https://crm.example.ru --api-key <ключ>

  --url       адрес CRM (или переменная CRM_URL)
  --api-key   ключ API администратора, «Настройки → API и вебхуки» (или CRM_API_KEY)
  --version   версия пакета, по умолчанию ${packageJson.version}
`);

const callMetadataApi = async ({ url, apiKey }, query, variables) => {
  let response;

  try {
    response = await fetch(`${url}/metadata`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    fail(`CRM по адресу ${url} не отвечает: ${error.message}`);
  }

  const body = await response.json().catch(() => undefined);
  const [firstError] = body?.errors ?? [];

  if (response.status === 401 || firstError?.extensions?.code === 'UNAUTHENTICATED') {
    fail('CRM не приняла ключ API: проверьте ключ и что он создан в этой компании');
  }

  if (firstError !== undefined || body?.data === undefined) {
    throw new CrmApiError(firstError, response.status);
  }

  return body.data;
};

class CrmApiError extends Error {
  constructor(graphqlError, status) {
    const details =
      graphqlError?.extensions?.userFriendlyMessage ?? graphqlError?.message ?? `HTTP ${status}`;

    super(typeof details === 'string' ? details : JSON.stringify(details));
    this.extensions = graphqlError?.extensions ?? {};
    this.rawMessage = graphqlError?.message ?? '';
  }

  // This version's archive was uploaded to the CRM before (also before an
  // uninstall): the server keeps it and installs from that copy.
  get isAlreadyDeployed() {
    return /not higher than the currently deployed/i.test(`${this.message} ${this.rawMessage}`);
  }

  // The app was installed from the marketplace on this CRM: the server keeps
  // it tied to npm and refuses an archive for it.
  get isSourceChannelMismatch() {
    return (
      [this.extensions.code, this.extensions.subCode].includes('SOURCE_CHANNEL_MISMATCH') ||
      /source channel|Cannot upload tarball/i.test(`${this.message} ${this.rawMessage}`)
    );
  }

  // Manifest validation lists what is wrong per entity; the platform CLI
  // prints it the same way.
  describe() {
    const lines = [this.message];
    const { errors } = this.extensions;

    if (this.rawMessage !== '' && this.rawMessage !== this.message) {
      lines.push(this.rawMessage);
    }

    if (errors !== null && typeof errors === 'object') {
      for (const [metadataName, entries] of Object.entries(errors)) {
        for (const entry of entries ?? []) {
          const entity = entry.flatEntityMinimalInformation ?? {};
          const name = entity.name ?? entity.label ?? entity.universalIdentifier ?? '';

          for (const entryError of entry.errors ?? []) {
            const value = entryError.value !== undefined ? ` (значение: ${JSON.stringify(entryError.value)})` : '';

            lines.push(`  ${metadataName} ${name}: ${entryError.code} — ${entryError.message}${value}`);
          }
        }
      }
    }

    return lines.join('\n');
  }
}

const downloadPackageTarball = async (version) => {
  const metadataResponse = await fetch(`${REGISTRY_URL}/${packageJson.name}/${version}`);

  if (!metadataResponse.ok) {
    fail(`В npm нет ${packageJson.name}@${version} (HTTP ${metadataResponse.status})`);
  }

  const { dist } = await metadataResponse.json();
  const tarballResponse = await fetch(dist.tarball);

  if (!tarballResponse.ok) {
    fail(`Не удалось скачать архив пакета (HTTP ${tarballResponse.status})`);
  }

  return Buffer.from(await tarballResponse.arrayBuffer());
};

const install = async (options) => {
  const connection = { url: options.url.replace(/\/+$/, ''), apiKey: options.apiKey };
  const label = `${packageJson.name}@${options.version}`;

  console.log(`→ Скачиваю ${label}`);
  const tarball = await downloadPackageTarball(options.version);

  console.log(`→ Загружаю в CRM ${connection.url} (${(tarball.length / 1e6).toFixed(1)} МБ)`);

  try {
    await uploadArchive(connection, label, tarball);
  } catch (error) {
    if (!(error instanceof CrmApiError) || !(error.isSourceChannelMismatch || error.isAlreadyDeployed)) {
      throw error;
    }

    // Installed from the marketplace before: the server fetches the same
    // version from npm itself. Or this version was uploaded before: the
    // server has its copy.
    console.log(
      error.isAlreadyDeployed
        ? `→ Версия ${options.version} уже загружена в CRM раньше, ставлю её`
        : '→ Приложение подключено из каталога npm, ставлю эту версию через каталог',
    );
  }

  console.log(`→ Устанавливаю «${manifest.application.displayName ?? packageJson.name}» ${options.version}`);

  try {
    await callMetadataApi(
      connection,
      `mutation InstallApplication($universalIdentifier: String!, $version: String) {
        installApplication(universalIdentifier: $universalIdentifier, version: $version) { id }
      }`,
      { universalIdentifier: manifest.application.universalIdentifier, version: options.version },
    );
  } catch (error) {
    if (!(error instanceof CrmApiError) || !/already installed/i.test(`${error.message} ${error.rawMessage}`)) {
      throw error;
    }

    console.log(`\n✓ ${label} уже установлен в этой CRM.\n`);

    return;
  }

  console.log(`\n✓ ${label} установлен. Обновите страницу CRM.\n`);
};

const uploadArchive = async (connection, label, tarball) => {
  const { createFileUpload } = await callMetadataApi(
    connection,
    `mutation CreateFileUpload($filename: String!, $size: Float!, $fileFolder: FileFolder!) {
      createFileUpload(filename: $filename, size: $size, fileFolder: $fileFolder) { fileId uploadUrl contentType }
    }`,
    { filename: `${label.replace(/[@/]/g, '-')}.tgz`, size: tarball.length, fileFolder: 'AppTarball' },
  );

  const uploadResponse = await fetch(createFileUpload.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': createFileUpload.contentType },
    body: tarball,
  });

  if (!uploadResponse.ok) {
    fail(`Хранилище файлов CRM не приняло архив (HTTP ${uploadResponse.status})`);
  }

  await callMetadataApi(
    connection,
    `mutation CompleteAppTarballUpload($fileId: UUID!) {
      completeAppTarballUpload(fileId: $fileId) { id }
    }`,
    { fileId: createFileUpload.fileId },
  );
};

const options = readOptions(process.argv.slice(2));

if (options.help || options.url === undefined || options.apiKey === undefined) {
  printHelp();
  process.exit(options.help ? 0 : 1);
}

if (options.apiKey.startsWith('npm_')) {
  fail('Это токен npm, а нужен ключ API самой CRM: «Настройки → API и вебхуки → Создать ключ»');
}

await install(options).catch((error) =>
  fail(`Установка не прошла: ${error instanceof CrmApiError ? error.describe() : error.message}`),
);
