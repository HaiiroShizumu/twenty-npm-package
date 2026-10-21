import { escapeHtml } from 'src/shared/bitrix/bitrix.util';

const BX24_SDK_URL = 'https://api.bitrix24.com/api/v1/';

export type BitrixPageTask = { title: string; url?: string; dueAt?: string };

// Bitrix loads the handler in an iframe via POST and expects HTML. An empty
// HTTP 303 leaves a white frame: the CRM page is loaded with location.replace
// after the portal is allowed in workspace.allowedIframeOrigins.
export const renderBitrixRedirectPage = (url: string): string => `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Документооборот</title>
<meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #333; background: #fff; }
  a { color: #1961ed; }
</style>
</head>
<body>
<p>Открываем документооборот…</p>
<p><a href="${escapeHtml(url)}">Продолжить</a></p>
<script>window.location.replace(${JSON.stringify(url)});</script>
</body>
</html>`;

// The page shown inside the portal frame for errors and install.
export const renderBitrixPage = ({
  title,
  message,
  crmUrl,
  tasks,
  isInstall,
}: {
  title: string;
  message: string;
  crmUrl?: string;
  tasks: BitrixPageTask[];
  isInstall: boolean;
}): string => `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<script src="${BX24_SDK_URL}"></script>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #333; background: #fff; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #666; margin: 0 0 16px; }
  a.button { display: inline-block; padding: 8px 16px; border-radius: 8px; background: #1961ed; color: #fff; text-decoration: none; }
  ul { list-style: none; padding: 0; margin: 16px 0 0; }
  li { padding: 8px 0; border-top: 1px solid #eee; display: flex; justify-content: space-between; gap: 16px; }
  li a { color: #1961ed; text-decoration: none; }
  .due { color: #999; white-space: nowrap; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(message)}</p>
${crmUrl !== undefined ? `<a class="button" href="${escapeHtml(crmUrl)}" target="_blank" rel="noopener">Открыть документооборот</a>` : ''}
${tasks.length > 0 ? `<ul>${tasks
  .map(
    (task) =>
      `<li>${task.url !== undefined ? `<a href="${escapeHtml(task.url)}" target="_blank" rel="noopener">${escapeHtml(task.title)}</a>` : escapeHtml(task.title)}<span class="due">${escapeHtml(task.dueAt ?? '')}</span></li>`,
  )
  .join('')}</ul>` : ''}
${isInstall ? '<script>if (window.BX24) { BX24.init(function () { BX24.installFinish(); }); }</script>' : ''}
</body>
</html>`;
