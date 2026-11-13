import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Share, Text, View } from 'react-native';

import { LevelChart } from '@/components/level-chart';
import { Button, Card, ErrorState, LoadingState, RiskBadge, Screen, SectionTitle, Segmented } from '@/components/ui';
import { useChuvaEstacao, useHistorico, useImagemEstacao, useStatusAtual } from '@/hooks/queries';
import { syncRiskState } from '@/lib/alert-monitor';
import { formatDataHora, formatMetros, formatRelativo, RISK } from '@/lib/risk';

// O CEMADEN mantém ~4 dias de série horária para esta estação.
const PERIODOS = [
  { value: 24, label: '24h' },
  { value: 48, label: '48h' },
  { value: 96, label: '4 dias' },
];

function mm(valor: number) {
  return `${valor.toFixed(1).replace('.', ',')} mm`;
}

/** Portal do cidadão: nível real do Rio Sesmaria medido pela estação do CEMADEN. */
export default function NivelScreen() {
  const status = useStatusAtual();
  const [horas, setHoras] = useState(24);

  const estacao = status.data?.[0];
  const historico = useHistorico(estacao?.cotas, horas);
  const chuva = useChuvaEstacao();
  const imagem = useImagemEstacao();

  // Mantém o estado de risco salvo em sincronia e avisa se mudou enquanto o app está aberto.
  useEffect(() => {
    if (status.data) {
      syncRiskState(status.data).catch((error) => console.warn('Falha ao sincronizar alertas de risco.', error));
    }
  }, [status.data]);

  const refresh = () => {
    void status.refetch();
    void historico.refetch();
    void chuva.refetch();
    void imagem.refetch();
  };

  const compartilhar = () => {
    if (!estacao) return;
    const info = RISK[estacao.classificacao_risco];
    void Share.share({
      message:
        `🌊 Agulhas Protege — ${estacao.rio}\n` +
        `Nível agora: ${formatMetros(estacao.nivel_atual_metros)} (${info.display})\n` +
        `${info.label}. Leitura de ${formatDataHora(estacao.data_hora_leitura)} (fonte: CEMADEN).\n` +
        `Emergência: Defesa Civil 199 · Bombeiros 193`,
    });
  };

  return (
    <Screen
      title="Agulhas Protege"
      subtitle="Nível real do rio · Resende-RJ"
      refreshing={status.isRefetching}
      onRefresh={refresh}>
      {status.isPending ? <LoadingState message="Consultando a estação do CEMADEN..." /> : null}
      {status.isError ? <ErrorState error={status.error} onRetry={refresh} /> : null}

      {estacao ? (
        <>
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
              Medido {formatRelativo(estacao.data_hora_leitura)} · {formatDataHora(estacao.data_hora_leitura)} · {estacao.fonte}
            </Text>
            {estacao.dados_desatualizados ? (
              <View className="rounded-xl bg-amber-100 p-3 dark:bg-amber-900/40">
                <Text className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  ⏱️ Leitura defasada: a estação não envia dados há mais de 2 horas.
                </Text>
              </View>
            ) : null}
            {!estacao.apiOnline ? (
              <View className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                <Text className="text-xs text-slate-600 dark:text-slate-300">
                  Servidor do Agulhas Protege indisponível: usando as cotas de risco padrão.
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

          {chuva.data ? (
            <View className="flex-row gap-3">
              <Card className="flex-1">
                <Text className="text-xs text-slate-500 dark:text-slate-400">🌧️ Chuva na última hora</Text>
                <Text className="text-2xl font-bold text-slate-900 dark:text-white">{mm(chuva.data.ultimaHora)}</Text>
              </Card>
              <Card className="flex-1">
                <Text className="text-xs text-slate-500 dark:text-slate-400">Chuva em 24h</Text>
                <Text className="text-2xl font-bold text-slate-900 dark:text-white">{mm(chuva.data.ultimas24h)}</Text>
              </Card>
            </View>
          ) : null}

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

          {imagem.data ? (
            <Card className="gap-3">
              <SectionTitle>Câmera da estação</SectionTitle>
              <Image
                source={{ uri: imagem.data.url }}
                style={{ width: '100%', aspectRatio: 704 / 576, borderRadius: 12 }}
                contentFit="cover"
                transition={200}
                accessibilityLabel="Foto do Rio Sesmaria tirada pela câmera da estação"
              />
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Foto de {formatDataHora(imagem.data.dataHora)} ({formatRelativo(imagem.data.dataHora)}) · uma foto por hora
              </Text>
            </Card>
          ) : null}

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
          <Text className="px-2 text-center text-xs text-slate-400">
            Nível, chuva e foto: estação hidrológica do CEMADEN no Rio Sesmaria, atualizada a cada hora. Cotas de risco
            definidas pela Defesa Civil no sistema Agulhas Protege.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}
