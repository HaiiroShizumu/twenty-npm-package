import { FieldType, RelationType, defineField } from 'twenty-sdk/define';

import {
  CONVERSATION_MEMBERS_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MEMBER_CONVERSATION_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  CONVERSATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default defineField({
  universalIdentifier: CONVERSATION_MEMBERS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CONVERSATION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'members',
  label: 'Участники',
  icon: 'IconUsers',
  relationTargetObjectMetadataUniversalIdentifier:
    CONVERSATION_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_MEMBER_CONVERSATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
