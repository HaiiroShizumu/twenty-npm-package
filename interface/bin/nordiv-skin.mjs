#!/usr/bin/env node
// Installs the skin into a built Twenty front (the folder with index.html,
// e.g. /app/packages/twenty-server/dist/front in the official image)
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const standaloneDirectory = join(packageDirectory, 'dist/standalone');
const wallpaperDirectory = join(packageDirectory, 'assets/wallpapers');

const START_MARKER = '<!-- nordiv-skin:start -->';
const END_MARKER = '<!-- nordiv-skin:end -->';
const INSTALL_FOLDER = 'nordiv-skin';
const MANIFEST_FILE = 'manifest.json';

// The version in the URLs makes browsers drop the cached files of the
// previous install: the paths themselves never change.
const { version: packageVersion } = JSON.parse(
  readFileSync(join(packageDirectory, 'package.json'), 'utf8'),
);
const ASSET_QUERY = `?v=${encodeURIComponent(packageVersion)}`;

const HEAD_TAGS = [
  START_MARKER,
  `<link rel="stylesheet" href="/${INSTALL_FOLDER}/skin.css${ASSET_QUERY}" />`,
  `<script defer src="/${INSTALL_FOLDER}/standalone.js${ASSET_QUERY}"></script>`,
  END_MARKER,
].join('\n    ');

const fail = (message) => {
  console.error(`nordiv-skin: ${message}`);
  process.exit(1);
};

const removeHeadTags = (html) => {
  const start = html.indexOf(START_MARKER);
  const end = html.indexOf(END_MARKER);

  if (start === -1 || end === -1) {
    return html;
  }

  return (
    html.slice(0, start).replace(/[ \t]*$/, '') +
    html.slice(end + END_MARKER.length).replace(/^\r?\n/, '')
  );
};

const readInstalledWallpapers = (installDirectory) => {
  const manifestPath = join(installDirectory, MANIFEST_FILE);

  if (!existsSync(manifestPath)) {
    return [];
  }

  return JSON.parse(readFileSync(manifestPath, 'utf8')).wallpapers ?? [];
};

const readIndexHtml = (frontDirectory) => {
  const indexPath = join(frontDirectory, 'index.html');

  if (!existsSync(indexPath)) {
    fail(`${indexPath} not found; pass the folder of a built Twenty front`);
  }

  return { indexPath, html: readFileSync(indexPath, 'utf8') };
};

const install = (frontDirectory) => {
  if (!existsSync(join(standaloneDirectory, 'standalone.js'))) {
    fail('dist/standalone is missing; run `yarn build` in the package first');
  }

  const { indexPath, html } = readIndexHtml(frontDirectory);
  const cleanHtml = removeHeadTags(html);

  if (!cleanHtml.includes('</head>')) {
    fail(`${indexPath} has no </head>`);
  }

  const installDirectory = join(frontDirectory, INSTALL_FOLDER);
  const targetWallpaperDirectory = join(frontDirectory, 'wallpapers');
  // A reinstall must still own the wallpapers the first install copied
  const copiedWallpapers = readInstalledWallpapers(installDirectory);

  rmSync(installDirectory, { recursive: true, force: true });
  cpSync(standaloneDirectory, installDirectory, { recursive: true });

  mkdirSync(targetWallpaperDirectory, { recursive: true });

  for (const file of readdirSync(wallpaperDirectory)) {
    const target = join(targetWallpaperDirectory, file);

    if (!existsSync(target)) {
      cpSync(join(wallpaperDirectory, file), target);
      copiedWallpapers.push(file);
    }
  }

  writeFileSync(
    join(installDirectory, MANIFEST_FILE),
    JSON.stringify({ wallpapers: copiedWallpapers }, null, 2),
  );
  writeFileSync(
    indexPath,
    cleanHtml.replace('</head>', `  ${HEAD_TAGS}\n  </head>`),
  );

  console.log(`nordiv-skin: installed into ${frontDirectory}`);
};

const uninstall = (frontDirectory) => {
  const { indexPath, html } = readIndexHtml(frontDirectory);
  const installDirectory = join(frontDirectory, INSTALL_FOLDER);
  for (const file of readInstalledWallpapers(installDirectory)) {
    rmSync(join(frontDirectory, 'wallpapers', file), { force: true });
  }

  const targetWallpaperDirectory = join(frontDirectory, 'wallpapers');

  if (
    existsSync(targetWallpaperDirectory) &&
    readdirSync(targetWallpaperDirectory).length === 0
  ) {
    rmSync(targetWallpaperDirectory, { recursive: true });
  }

  rmSync(installDirectory, { recursive: true, force: true });
  writeFileSync(indexPath, removeHeadTags(html));

  console.log(`nordiv-skin: removed from ${frontDirectory}`);
};

const [command, frontDirectory] = process.argv.slice(2);

if (
  (command !== 'install' && command !== 'uninstall') ||
  frontDirectory === undefined
) {
  fail('usage: nordiv-skin <install|uninstall> <twenty-front-build-folder>');
}

(command === 'install' ? install : uninstall)(resolve(frontDirectory));
