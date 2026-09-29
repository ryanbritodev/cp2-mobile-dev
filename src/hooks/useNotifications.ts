import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import {
  addNotificationTapListener,
  addTokenRefreshListener,
  consumeInitialNotification,
  getPermissionState,
  getPushToken,
  registerDevice,
  requestPermission,
} from '../services/notificationService';
import type { NotificationRegistrationStatus, PushPayloadData } from '../types/notification';
import { getErrorMessage } from '../utils/errors';

export type UseNotificationsResult = {
  status: NotificationRegistrationStatus;
  errorMessage: string | null;
  retry: () => void;
  openSettings: () => void;
};

/**
 * Solicita permissão, registra o token do dispositivo no Firestore, acompanha a
 * renovação do token e direciona o toque na notificação para a conversa correta.
 * Com `uid` nulo (usuário deslogado) nenhum registro é feito.
 */
export function useNotifications(
  uid: string | null,
  onOpenConversation: (payload: PushPayloadData) => void,
): UseNotificationsResult {
  const [status, setStatus] = useState<NotificationRegistrationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onOpenRef = useRef(onOpenConversation);

  useEffect(() => {
    onOpenRef.current = onOpenConversation;
  }, [onOpenConversation]);

  const register = useCallback(async () => {
    if (!uid) return;
    setStatus('registering');
    setErrorMessage(null);
    try {
      const permission = await requestPermission();
      if (permission !== 'granted') {
        setStatus('permission-denied');
        return;
      }
      const token = await getPushToken();
      if (!token) {
        setStatus('no-token');
        return;
      }
      await registerDevice(uid, token);
      setStatus('registered');
    } catch (error) {
      setStatus('error');
      setErrorMessage(getErrorMessage(error, 'Não foi possível registrar este dispositivo para notificações.'));
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setStatus('idle');
      setErrorMessage(null);
      return undefined;
    }
    void register();
    return addTokenRefreshListener(uid, (error) =>
      setErrorMessage(getErrorMessage(error, 'Falha ao atualizar o token de notificações.')),
    );
  }, [register, uid]);

  // Ao voltar das configurações do sistema, registra de novo se a permissão passou a ser concedida
  // (sem exibir o diálogo de permissão novamente a cada retorno ao app).
  useEffect(() => {
    if (status !== 'permission-denied' && status !== 'error') return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      getPermissionState()
        .then((permission) => {
          if (permission === 'granted') void register();
        })
        .catch(() => undefined);
    });
    return () => subscription.remove();
  }, [register, status]);

  // Toque na notificação: app aberto/em segundo plano (listener) ou fechado (resposta inicial).
  useEffect(() => {
    const removeTapListener = addNotificationTapListener((payload) => onOpenRef.current(payload));
    consumeInitialNotification()
      .then((payload) => {
        if (payload) onOpenRef.current(payload);
      })
      .catch(() => undefined);
    return removeTapListener;
  }, []);

  const retry = useCallback(() => void register(), [register]);
  const openSettings = useCallback(() => void Linking.openSettings(), []);

  return useMemo(() => ({ status, errorMessage, retry, openSettings }), [status, errorMessage, retry, openSettings]);
}
