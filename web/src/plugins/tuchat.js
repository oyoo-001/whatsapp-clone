import { registerPlugin } from '@capacitor/core';

const TuChat = registerPlugin('TuChat', {
  web: () => import('./tuchat.web').then(m => new m.TuChatWeb()),
});

export default TuChat;
