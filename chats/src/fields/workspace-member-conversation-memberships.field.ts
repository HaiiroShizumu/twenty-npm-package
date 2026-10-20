import {
  FieldType,
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
    WORKSPACE_MEMBER_CONVERSATION_MEMBERSHIPS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'smbConversationMemberships',
  label: 'Участие в беседах',
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier:
    CONVERSATION_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_MEMBER_WORKSPACE_MEMBER_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
