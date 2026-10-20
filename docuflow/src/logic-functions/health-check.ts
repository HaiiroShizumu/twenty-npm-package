import { defineHealthCheck } from 'twenty-sdk/define';

import { isBitrixConfigured } from 'src/shared/bitrix/bitrix-client';
import { getDocflowEngine } from 'src/shared/engine';
import { HEALTH_CHECK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

export default defineHealthCheck({
  universalIdentifier: HEALTH_CHECK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'docflow-health-check',
  handler: async () => {
    if (getDocflowEngine() === 'FORK') {
      return {
        status: 'INFO',
        title: 'Серверную работу выполняет форк NorDiv',
        description:
          'Выдача заданий, параметры запуска и сбор документов выключены в приложении (DOCFLOW_ENGINE = FORK).',
      };
    }

    if (!isBitrixConfigured()) {
      return {
        status: 'INFO',
        title: 'Битрикс24 не подключён',
        description:
          'Укажите BITRIX_CLIENT_ID и BITRIX_CLIENT_SECRET локального приложения портала, если нужен Битрикс24.',
      };
    }

    return { status: 'OK' };
  },
});
