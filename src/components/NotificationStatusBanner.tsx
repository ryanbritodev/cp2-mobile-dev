import type { NotificationRegistrationStatus } from '../types/notification';
import { Banner } from './Banner';

type NotificationStatusBannerProps = {
  status: NotificationRegistrationStatus;
  errorMessage: string | null;
  onRetry: () => void;
  onOpenSettings: () => void;
};

export function NotificationStatusBanner({ status, errorMessage, onRetry, onOpenSettings }: NotificationStatusBannerProps) {
  if (status === 'permission-denied') {
    return (
      <Banner
        tone="warning"
        message="Notificações desativadas. Você não receberá avisos de novas mensagens."
        actionLabel="Ativar"
        onAction={onOpenSettings}
      />
    );
  }
  if (status === 'no-token') {
    return <Banner tone="info" message="Este dispositivo não possui token de push (use um aparelho físico)." />;
  }
  if (status === 'error') {
    return (
      <Banner
        tone="danger"
        message={errorMessage ?? 'Falha ao registrar notificações.'}
        actionLabel="Tentar"
        onAction={onRetry}
      />
    );
  }
  return null;
}
