import {
  defineObject,
  FieldType,
  MetadataReadability,
  MetadataWritability,
  NumberDataType,
} from 'twenty-sdk/define';

import {
  CONVERSATION_MEMBER_KEY_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MEMBER_LAST_READ_SEQ_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MEMBER_MUTED_UNTIL_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  CONVERSATION_MEMBER_ROLE_UNIVERSAL_IDENTIFIER,
} from 'src/universal-identifiers';

export default defineObject({
  universalIdentifier: CONVERSATION_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'smbConversationMember',
  namePlural: 'smbConversationMembers',
  labelSingular: 'Участник беседы',
  labelPlural: 'Участники бесед',
  description: 'Участник беседы и докуда он прочитал',
  icon: 'IconUsers',
  readability: MetadataReadability.APPLICATION,
  writability: MetadataWritability.APPLICATION,
  isSearchable: false,
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    CONVERSATION_MEMBER_KEY_UNIVERSAL_IDENTIFIER,
  fields: [
    // Один участник в беседе один раз: «беседа:сотрудник».
    {
      universalIdentifier: CONVERSATION_MEMBER_KEY_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      label: 'Ключ участника',
      icon: 'IconKey',
      name: 'memberKey',
      isNullable: true,
      defaultValue: null,
      isUnique: true,
    },
    {
      universalIdentifier: CONVERSATION_MEMBER_ROLE_UNIVERSAL_IDENTIFIER,
      type: FieldType.SELECT,
      label: 'Роль',
      icon: 'IconUserShield',
      name: 'memberRole',
      defaultValue: "'MEMBER'",
      options: [
        {
          id: 'ef544e72-4ef6-436d-a78c-6130daa67ca3',
          value: 'OWNER',
          label: 'Владелец',
          position: 0,
          color: 'blue',
        },
        {
          id: '4e4dae9b-9903-497f-9d68-8093a9814e0a',
          value: 'MEMBER',
          label: 'Участник',
          position: 1,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier:
        CONVERSATION_MEMBER_LAST_READ_SEQ_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      label: 'Прочитано до',
      icon: 'IconChecks',
      name: 'lastReadSeq',
      defaultValue: 0,
      universalSettings: { dataType: NumberDataType.INT, decimals: 0 },
    },
    {
      universalIdentifier: CONVERSATION_MEMBER_MUTED_UNTIL_UNIVERSAL_IDENTIFIER,
      type: FieldType.DATE_TIME,
      label: 'Без звука до',
      icon: 'IconBellOff',
      name: 'mutedUntil',
      isNullable: true,
      defaultValue: null,
    },
  ],
});
