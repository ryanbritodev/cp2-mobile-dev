import { createContext, useContext, type ReactNode } from 'react';
import { useNotifications, type UseNotificationsResult } from '../hooks/useNotifications';
import type { PushPayloadData } from '../types/notification';

const NotificationContext = createContext<UseNotificationsResult | null>(null);

type NotificationProviderProps = {
  uid: string | null;
  onOpenConversation: (payload: PushPayloadData) => void;
  children: ReactNode;
};

/** Registra o dispositivo uma vez por sessão e compartilha o estado das notificações com as telas. */
export function NotificationProvider({ uid, onOpenConversation, children }: NotificationProviderProps) {
  const value = useNotifications(uid, onOpenConversation);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationStatus(): UseNotificationsResult {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationStatus deve ser usado dentro de <NotificationProvider>.');
  return context;
}
