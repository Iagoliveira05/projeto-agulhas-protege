/**
 * Monitoramento de risco em segundo plano.
 *
 * Funcionalidade exclusiva do app: periodicamente (mesmo com o app fechado) consulta
 * GET /estacoes/status-atual da mesma API do site e dispara uma notificação local
 * quando a classificação de risco de alguma estação muda.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { EstacaoStatus } from '@/lib/api';
import { loadApiUrl } from '@/lib/config';
import { fetchStatusReal } from '@/lib/nivel-real';
import { formatMetros, RISK, riskIndex } from '@/lib/risk';

export const ALERT_TASK = 'agulhas-protege-risk-monitor';
const ENABLED_KEY = 'agulhas:alerts-enabled';
const LAST_RISK_KEY = 'agulhas:last-risk';
const CHANNEL_ID = 'alertas-cheia';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Precisa estar no escopo global (fora de componentes React).
TaskManager.defineTask(ALERT_TASK, async () => {
  try {
    await loadApiUrl();
    await syncRiskState(await fetchStatusReal());
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function isAlertsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
}

/**
 * Cria o canal Android dos alertas. Retorna o channelId a usar, ou undefined para cair
 * no canal padrão: no Expo Go o setNotificationChannelAsync falha internamente
 * (NullPointerException no gerenciador de canais do Expo Go); no APK funciona normalmente.
 */
async function ensureChannel(): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Alertas de cheia',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#dc2626',
    });
    return CHANNEL_ID;
  } catch (error) {
    console.warn('Canal de notificação indisponível, usando o canal padrão.', error);
    return undefined;
  }
}

/** Pede permissão de notificação e registra a tarefa periódica. Retorna false se negado. */
export async function enableAlerts(): Promise<boolean> {
  // No Android 13+ o canal precisa existir antes do pedido de permissão para o diálogo aparecer.
  await ensureChannel();
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return false;

  await AsyncStorage.setItem(ENABLED_KEY, 'true');
  if (!(await TaskManager.isTaskRegisteredAsync(ALERT_TASK))) {
    // 15 minutos é o mínimo permitido pelo sistema operacional.
    await BackgroundTask.registerTaskAsync(ALERT_TASK, { minimumInterval: 15 });
  }
  return true;
}

export async function disableAlerts() {
  await AsyncStorage.setItem(ENABLED_KEY, 'false');
  if (await TaskManager.isTaskRegisteredAsync(ALERT_TASK)) {
    await BackgroundTask.unregisterTaskAsync(ALERT_TASK);
  }
}

/**
 * Compara as classificações recebidas com as últimas conhecidas e notifica mudanças.
 * Usado tanto pela tarefa em segundo plano quanto pela tela inicial (primeiro plano).
 */
export async function syncRiskState(estacoes: EstacaoStatus[]) {
  const raw = await AsyncStorage.getItem(LAST_RISK_KEY);
  const previous: Record<string, string> = raw ? JSON.parse(raw) : {};
  const enabled = await isAlertsEnabled();
  const next: Record<string, string> = {};

  for (const estacao of estacoes) {
    const atual = estacao.classificacao_risco;
    const anterior = previous[estacao.estacao_id] as EstacaoStatus['classificacao_risco'] | undefined;
    next[estacao.estacao_id] = atual;

    if (!enabled || !anterior || anterior === atual) continue;

    const subiu = riskIndex(atual) > riskIndex(anterior);
    const channelId = await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: subiu
          ? `⚠️ ${RISK[atual].display}: ${estacao.rio}`
          : `✅ Nível baixando: ${estacao.rio}`,
        body: `${estacao.nome}: ${formatMetros(estacao.nivel_atual_metros)} — ${RISK[atual].label}.`,
        data: { estacaoId: estacao.estacao_id },
        color: RISK[atual].color,
      },
      trigger: channelId ? { channelId } : null,
    });
  }

  await AsyncStorage.setItem(LAST_RISK_KEY, JSON.stringify(next));
}
