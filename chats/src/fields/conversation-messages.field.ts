import { FieldType, RelationType, defineField } from 'twenty-sdk/define';

import {
  CONVERSATION_MESSAGES_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MESSAGE_CONVERSATION_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MESSAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  CONVERSATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default defineField({
  universalIdentifier: CONVERSATION_MESSAGES_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CONVERSATION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'messages',
  label: 'Сообщения',
  icon: 'IconMessage',
  relationTargetObjectMetadataUniversalIdentifier:
    CONVERSATION_MESSAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_MESSAGE_CONVERSATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
