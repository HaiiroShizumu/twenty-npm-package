import {
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import {
  CONVERSATION_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MEMBER_WORKSPACE_MEMBER_UNIVERSAL_IDENTIFIER,
  WORKSPACE_MEMBER_CONVERSATION_MEMBERSHIPS_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default defineField({
  universalIdentifier:
    CONVERSATION_MEMBER_WORKSPACE_MEMBER_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CONVERSATION_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'workspaceMember',
  label: 'Сотрудник',
  icon: 'IconUser',
  isNullable: false,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    WORKSPACE_MEMBER_CONVERSATION_MEMBERSHIPS_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'workspaceMemberId',
  },
});
