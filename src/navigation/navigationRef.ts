import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

/** Referência global usada para navegar a partir do toque em notificações. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
