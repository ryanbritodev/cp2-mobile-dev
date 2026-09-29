import { useConnectivity } from '../hooks/useConnectivity';
import { Banner } from './Banner';

export function ConnectivityBanner() {
  const isOnline = useConnectivity();
  if (isOnline) return null;
  return <Banner tone="warning" message="Sem conexão. Suas mensagens serão enviadas quando a conexão voltar." />;
}
