import { defineRole, SystemPermissionFlag } from 'twenty-sdk/define';

import { DOCFLOW_MEMBER_ROLE_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

// Twenty lets only a person with the "Workflows" permission answer a step of
// a running process. Whoever fills process tasks or launches processes with
// parameters on a plain Twenty needs this role (or the permission in their
// own role). It also lets them edit processes: give it to those who own them.
export default defineRole({
  universalIdentifier: DOCFLOW_MEMBER_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Документооборот: участник процессов',
  description:
    'Записи CRM и право «Рабочие процессы», без которого Twenty не даёт отвечать на шаги процессов',
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.WORKFLOWS],
});
