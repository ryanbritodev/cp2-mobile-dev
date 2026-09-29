import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.port, () => {
  console.log(`API de notificações ouvindo na porta ${env.port}`);
  if (!env.firebase) {
    console.warn('Credenciais do Firebase ausentes: configure as variáveis secretas FIREBASE_* na hospedagem.');
  }
});
