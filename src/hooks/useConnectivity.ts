import { useEffect, useState } from 'react';
import { subscribeConnection } from '../services/chatService';

// O `.info/connected` começa como false por alguns instantes; aguardamos antes de avisar.
const OFFLINE_GRACE_MS = 3000;

/** Retorna `false` apenas quando a conexão com o Firebase está de fato indisponível. */
export function useConnectivity(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeConnection((connected) => {
      if (timer) clearTimeout(timer);
      if (connected) setIsOnline(true);
      else timer = setTimeout(() => setIsOnline(false), OFFLINE_GRACE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return isOnline;
}
