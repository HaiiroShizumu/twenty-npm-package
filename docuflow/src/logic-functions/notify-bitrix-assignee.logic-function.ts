import { defineLogicFunction } from 'twenty-sdk/define';
import {
  type DatabaseEventPayload,
  type ObjectRecordUpdateEvent,
} from 'twenty-sdk/logic-function';

import { isBitrixConfigured, callBitrix } from 'src/shared/bitrix/bitrix-client';
import { DOCFLOW_SECTION } from 'src/shared/docflow.constants';
import { getLinkedBitrixPortal } from 'src/server/bitrix-portal';
import { readRestRecord } from 'src/shared/api/rest-response.util';
import { restClient, type DocflowTaskRecord } from 'src/server/records';
import { NOTIFY_BITRIX_ASSIGNEE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// A docflow task given to someone shows up as a Bitrix24 notification of
// that person, found by e-mail, with a link into the CRM.
const handler = async (
  event: DatabaseEventPayload<ObjectRecordUpdateEvent<DocflowTaskRecord>>,
) => {
  const task = event.properties.after;
  const previousAssigneeId = event.properties.before?.assigneeId;

  if (
    !isBitrixConfigured() ||
    task?.smbSection !== DOCFLOW_SECTION ||
    typeof task.assigneeId !== 'string' ||
    task.assigneeId === previousAssigneeId
  ) {
    return { skipped: true };
  }

  const portal = await getLinkedBitrixPortal();

  if (portal === null) {
    return { skipped: 'NO_PORTAL' };
  }

  const member = readRestRecord<{ userEmail?: string | null }>(
    await restClient('application').get(`/rest/workspaceMembers/${task.assigneeId}`),
  );

  if (typeof member?.userEmail !== 'string') {
    return { skipped: 'NO_EMAIL' };
  }

  const [bitrixUser] = await callBitrix<{ ID: string }[]>({
    restEndpoint: portal.restEndpoint,
    accessToken: portal.accessToken,
    method: 'user.get',
    params: { FILTER: { EMAIL: member.userEmail } },
  });

  if (bitrixUser === undefined) {
    return { skipped: 'NO_BITRIX_USER' };
  }

  const crmUrl = process.env.CRM_PUBLIC_URL?.trim().replace(/\/$/, '');
  const title = task.title?.trim() || 'Без названия';

  await callBitrix({
    restEndpoint: portal.restEndpoint,
    accessToken: portal.accessToken,
    method: 'im.notify.system.add',
    params: {
      USER_ID: bitrixUser.ID,
      MESSAGE:
        crmUrl !== undefined && crmUrl.length > 0
          ? `Новое задание документооборота: [URL=${crmUrl}/object/task/${event.recordId}]${title}[/URL]`
          : `Новое задание документооборота: ${title}`,
    },
  });

  return { status: 'NOTIFIED' };
};

export default defineLogicFunction({
  universalIdentifier: NOTIFY_BITRIX_ASSIGNEE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-notify-bitrix-assignee',
  description: 'Уведомляет исполнителя задания в Битрикс24',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'task.*',
    updatedFields: ['assigneeId', 'smbSection'],
  },
});
