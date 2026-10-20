import {
  FieldType,
  OnDeleteAction,
  RelationType,
  defineField,
} from 'twenty-sdk/define';

import {
  CONVERSATION_MEMBERS_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MEMBER_CONVERSATION_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  CONVERSATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default defineField({
  universalIdentifier: CONVERSATION_MEMBER_CONVERSATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CONVERSATION_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'conversation',
  label: 'Беседа',
  icon: 'IconMessages',
  isNullable: false,
  relationTargetObjectMetadataUniversalIdentifier:
    CONVERSATION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_MEMBERS_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'conversationId',
  },
});
