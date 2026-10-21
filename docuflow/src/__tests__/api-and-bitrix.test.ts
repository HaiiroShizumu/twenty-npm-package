import { describe, expect, it } from 'vitest';

import { restAnd, restEq, restIlike, restIn, sanitizeFilterText } from 'src/shared/api/rest-filter.util';
import { readRestList, readRestRecord } from 'src/shared/api/rest-response.util';
import { escapeHtml, parseBitrixGrant, parseBitrixRequest } from 'src/shared/bitrix/bitrix.util';
import { getAttachmentTarget, getDocumentNameFromFile, readFileItems } from 'src/shared/documents/attachment-target.util';
import { getDocflowEngine } from 'src/shared/engine';
import { buildBitrixEntryUrl, buildDocflowPagePath } from 'src/shared/bitrix/bitrix-entry-url';
import { parseBitrixPerson } from 'src/server/bitrix-person';

describe('REST helpers', () => {
  it('builds filters the REST parser accepts and strips what breaks it', () => {
    expect(restAnd(restEq('smbSection', 'DOCFLOW'), undefined, restIlike('title', "ООО (Ромашка), 'x'"))).toBe(
      "and(smbSection[eq]:'DOCFLOW',title[ilike]:'%ООО  Ромашка    x%')",
    );
    expect(restIn('origin', ['RECORD', 'PROCESS'])).toBe('origin[in]:["RECORD","PROCESS"]');
    expect(restAnd()).toBeUndefined();
    expect(sanitizeFilterText('a[b]')).toBe('a b');
  });

  it('reads records under the single key of data', () => {
    expect(readRestList({ data: { tasks: [{ id: '1' }] }, pageInfo: { hasNextPage: true } })).toEqual({
      records: [{ id: '1' }],
      pageInfo: { hasNextPage: true },
    });
    expect(readRestRecord({ data: { createTask: { id: '1' } } })).toEqual({ id: '1' });
    expect(readRestRecord({ errors: [] })).toBeUndefined();
  });
});

describe('Bitrix24', () => {
  it('reads an application launch and an event from form fields', () => {
    expect(
      parseBitrixRequest({ rawBody: 'AUTH_ID=a&REFRESH_ID=r&member_id=m', query: { DOMAIN: 'acme.bitrix24.ru' } }),
    ).toMatchObject({ authId: 'a', refreshId: 'r', memberId: 'm', domain: 'acme.bitrix24.ru' });
    expect(
      parseBitrixRequest({
        rawBody: 'event=ONAPPUNINSTALL&auth%5Bapplication_token%5D=t&auth%5Bmember_id%5D=m',
      }),
    ).toMatchObject({ event: 'ONAPPUNINSTALL', applicationToken: 't', memberId: 'm' });
  });

  it('accepts a grant only with an https portal REST address', () => {
    const grant = {
      member_id: 'm',
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600,
      client_endpoint: 'https://acme.bitrix24.ru/rest/',
    };

    expect(parseBitrixGrant(grant, 0)).toMatchObject({
      memberId: 'm',
      portalDomain: 'acme.bitrix24.ru',
      expiresAt: 3_600_000,
    });
    expect(parseBitrixGrant({ ...grant, client_endpoint: 'http://evil/rest/' }, 0)).toBeUndefined();
    expect(parseBitrixGrant({ ...grant, client_endpoint: 'https://a.ru/rest/?x=1' }, 0)).toBeUndefined();
  });

  it('escapes what goes into the portal page', () => {
    expect(escapeHtml('<b>"Акт"</b>')).toBe('&lt;b&gt;&quot;Акт&quot;&lt;/b&gt;');
  });

  it('reads the portal employee profile for CRM entry', () => {
    expect(
      parseBitrixPerson({
        ID: 17,
        EMAIL: 'Anna@Acme.RU',
        NAME: 'Анна',
        LAST_NAME: 'Петрова',
        WORK_POSITION: 'Юрист',
      }),
    ).toEqual({
      bitrixUserId: '17',
      email: 'anna@acme.ru',
      firstName: 'Анна',
      lastName: 'Петрова',
      jobTitle: 'Юрист',
    });
    expect(parseBitrixPerson({ ID: '1', EMAIL: 'not-an-email' })?.email).toBeUndefined();
    expect(parseBitrixPerson({ EMAIL: 'a@b.ru' })).toBeUndefined();
  });

  it('sends new employees to the standard invite and members to the docflow page', () => {
    expect(buildDocflowPagePath('layout-1')).toBe('/page/layout-1');
    expect(
      buildBitrixEntryUrl({
        crmUrl: 'https://acme.example.ru',
        inviteHash: 'inv-hash',
        pageLayoutId: 'layout-1',
        email: 'anna@acme.ru',
        memberExists: false,
      }),
    ).toBe(
      'https://acme.example.ru/invite/inv-hash?email=anna%40acme.ru&returnToPath=%2Fpage%2Flayout-1',
    );
    expect(
      buildBitrixEntryUrl({
        crmUrl: 'https://acme.example.ru',
        inviteHash: 'inv-hash',
        pageLayoutId: 'layout-1',
        email: 'anna@acme.ru',
        memberExists: true,
      }),
    ).toBe('https://acme.example.ru/page/layout-1');
  });
});

describe('documents', () => {
  it('finds the record an attachment belongs to', () => {
    expect(getAttachmentTarget({ authorId: 'a', targetTaskId: null, targetCompanyId: 'c' })).toEqual({
      objectNameSingular: 'company',
      recordId: 'c',
    });
    expect(getAttachmentTarget({ targetMyDealId: 'd' })).toEqual({ objectNameSingular: 'myDeal', recordId: 'd' });
    expect(getAttachmentTarget({ authorId: 'a' })).toBeUndefined();
  });

  it('reads files and names a document after its file', () => {
    expect(readFileItems([{ fileId: 'f', label: 'Акт.pdf', url: 'u' }, { fileId: '' }])).toEqual([
      { fileId: 'f', label: 'Акт.pdf', url: 'u' },
    ]);
    expect(getDocumentNameFromFile('Договор 12.pdf')).toBe('Договор 12');
    expect(getDocumentNameFromFile('.env')).toBe('.env');
  });
});

describe('engine', () => {
  it('runs on the app unless the fork is named', () => {
    expect(getDocflowEngine(undefined)).toBe('APP');
    expect(getDocflowEngine('FORK')).toBe('FORK');
    expect(getDocflowEngine('fork')).toBe('APP');
  });
});
