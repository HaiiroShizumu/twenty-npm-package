import {
  FieldType,
  OnDeleteAction,
  RelationType,
  defineField,
} from 'twenty-sdk/define';

import {
  CONVERSATION_MESSAGES_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MESSAGE_CONVERSATION_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MESSAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  CONVERSATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default defineField({
  universalIdentifier: CONVERSATION_MESSAGE_CONVERSATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CONVERSATION_MESSAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'conversation',
  label: 'Беседа',
  icon: 'IconMessages',
  isNullable: false,
  relationTargetObjectMetadataUniversalIdentifier:
    CONVERSATION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_MESSAGES_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'conversationId',
  },
});
