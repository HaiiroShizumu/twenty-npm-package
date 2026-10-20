import { defineFrontComponent } from 'twenty-sdk/define';
import { getApplicationVariable } from 'twenty-sdk/front-component';

import { ForkEngineNotice, MessengerRoot } from 'src/front/ui/components';
import { MessengerView } from 'src/front/ui/messenger-view';
import { isAppEngine } from 'src/shared/engine';
import { MESSENGER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/universal-identifiers';

const Messenger = () => (
  <MessengerRoot>
    {isAppEngine(getApplicationVariable('MESSENGER_ENGINE')) ? (
      <MessengerView />
    ) : (
      <ForkEngineNotice />
    )}
  </MessengerRoot>
);

export default defineFrontComponent({
  universalIdentifier: MESSENGER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'messenger',
  description: 'Список бесед, переписка и новая беседа',
  component: Messenger,
});
