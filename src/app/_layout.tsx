import '@/global.css';
// Importado no topo para registrar a tarefa em segundo plano no escopo global.
import '@/lib/alert-monitor';

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { useOcorrencias } from '@/hooks/queries';
import { AuthProvider, useAuth } from '@/lib/auth';
import { loadApiUrl } from '@/lib/config';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// No mobile, "foco" é o app voltar para o primeiro plano: revalida os dados nesse momento.
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));

function Tabs() {
  const scheme = useColorScheme();
  const { isOperador } = useAuth();
  const { data: ocorrencias } = useOcorrencias();
  const abertas = ocorrencias?.filter((o) => o.status === 'ABERTA').length ?? 0;
  const dark = scheme === 'dark';

  return (
    <NativeTabs
      backgroundColor={dark ? '#0f172a' : '#ffffff'}
      indicatorColor={dark ? '#1e3a5f' : '#e0f2fe'}
      tintColor="#0284c7"
      labelStyle={{ selected: { color: dark ? '#38bdf8' : '#0369a1' } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Nível</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="drop.fill" md="water_drop" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="previsao">
        <NativeTabs.Trigger.Label>Previsão</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="query_stats" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="ocorrencias">
        <NativeTabs.Trigger.Label>Ocorrências</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.clipboard.fill" md="assignment" />
        {isOperador && abertas > 0 ? <NativeTabs.Trigger.Badge>{String(abertas)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="conta">
        <NativeTabs.Trigger.Label>Conta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadApiUrl().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <Tabs />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
