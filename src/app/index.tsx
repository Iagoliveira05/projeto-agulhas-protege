import { useEffect, useState } from 'react';
import { Linking, Pressable, Share, Text, View } from 'react-native';

import { LevelChart } from '@/components/level-chart';
import { Button, Card, ErrorState, LoadingState, RiskBadge, Screen, SectionTitle, Segmented } from '@/components/ui';
import { useHistorico, useStatusAtual } from '@/hooks/queries';
import { syncRiskState } from '@/lib/alert-monitor';
import { formatDataHora, formatMetros, formatRelativo, RISK } from '@/lib/risk';

const PERIODOS = [
  { value: 24, label: '24h' },
  { value: 72, label: '72h' },
  { value: 168, label: '7 dias' },
];

/** Portal do cidadão: equivalente mobile da HomePublica do site. */
export default function NivelScreen() {
  const status = useStatusAtual();
  const [estacaoId, setEstacaoId] = useState<string>();
  const [horas, setHoras] = useState(24);

  const estacoes = status.data ?? [];
  const estacao = estacoes.find((e) => e.estacao_id === estacaoId) ?? estacoes[0];
  const historico = useHistorico(estacao?.estacao_id, horas);

  // Mantém o estado de risco salvo em sincronia e avisa se mudou enquanto o app está aberto.
  useEffect(() => {
    if (status.data) {
      syncRiskState(status.data).catch((error) => console.warn('Falha ao sincronizar alertas de risco.', error));
    }
  }, [status.data]);

  const refresh = () => {
    void status.refetch();
    void historico.refetch();
  };

  const compartilhar = () => {
    if (!estacao) return;
    const info = RISK[estacao.classificacao_risco];
    void Share.share({
      message:
        `🌊 Agulhas Protege — ${estacao.rio}\n` +
        `${estacao.nome}: ${formatMetros(estacao.nivel_atual_metros)} (${info.display})\n` +
        `${info.label}. Leitura de ${formatDataHora(estacao.data_hora_leitura)}.\n` +
        `Emergência: Defesa Civil 199 · Bombeiros 193`,
    });
  };

  return (
    <Screen
      title="Agulhas Protege"
      subtitle="Nível do rio em tempo real · Resende-RJ"
      refreshing={status.isRefetching}
      onRefresh={refresh}>
      {status.isPending ? <LoadingState message="Consultando telemetria..." /> : null}
      {status.isError ? <ErrorState error={status.error} onRetry={refresh} /> : null}

      {estacao ? (
        <>
          {estacoes.length > 1 ? (
            <Segmented
              options={estacoes.map((e) => ({ value: e.estacao_id, label: e.rio }))}
              value={estacao.estacao_id}
              onChange={setEstacaoId}
            />
          ) : null}

          <View className={`gap-3 rounded-3xl border-2 p-5 ${RISK[estacao.classificacao_risco].cardClass}`}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">{estacao.rio}</Text>
                <Text className="text-base text-slate-500 dark:text-slate-400">{estacao.nome}</Text>
              </View>
              <RiskBadge nivel={estacao.classificacao_risco} size="lg" />
            </View>
            <Text
              className={`text-6xl font-black ${RISK[estacao.classificacao_risco].textClass}`}
              accessibilityLabel={`Nível atual ${formatMetros(estacao.nivel_atual_metros)}`}>
              {formatMetros(estacao.nivel_atual_metros)}
            </Text>
            <Text className="text-base font-medium text-slate-700 dark:text-slate-200">
              {RISK[estacao.classificacao_risco].label}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              Atualizado {formatRelativo(estacao.data_hora_leitura)} · {formatDataHora(estacao.data_hora_leitura)}
            </Text>
            {estacao.dados_desatualizados ? (
              <View className="rounded-xl bg-amber-100 p-3 dark:bg-amber-900/40">
                <Text className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  ⏱️ Leitura defasada: sem telemetria há mais de 2 horas.
                </Text>
              </View>
            ) : null}
          </View>

          <Card>
            <SectionTitle>O que fazer agora</SectionTitle>
            <View className="gap-2">
              {RISK[estacao.classificacao_risco].orientacoes.map((texto) => (
                <View key={texto} className="flex-row gap-2">
                  <Text className="text-base text-brand">•</Text>
                  <Text className="flex-1 text-base text-slate-700 dark:text-slate-200">{texto}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card className="gap-3">
            <SectionTitle>Histórico do nível</SectionTitle>
            <Segmented options={PERIODOS} value={horas} onChange={setHoras} />
            {historico.isPending ? (
              <LoadingState />
            ) : historico.isError ? (
              <ErrorState error={historico.error} onRetry={() => historico.refetch()} />
            ) : (
              <LevelChart leituras={historico.data} cotas={estacao.cotas} />
            )}
          </Card>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Compartilhar" icon="📤" variant="secondary" onPress={compartilhar} />
            </View>
            <View className="flex-1">
              <Button label="Ligar 199" icon="📞" variant="danger" onPress={() => Linking.openURL('tel:199')} />
            </View>
          </View>
          <Pressable onPress={() => Linking.openURL('tel:193')} className="items-center py-2">
            <Text className="text-sm text-slate-500 underline dark:text-slate-400">Corpo de Bombeiros: 193</Text>
          </Pressable>
        </>
      ) : null}

      {status.isSuccess && estacoes.length === 0 ? (
        <Card>
          <Text className="text-center text-slate-500">Nenhuma estação ativa cadastrada.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
