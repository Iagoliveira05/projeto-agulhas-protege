import { Linking, Text, View } from 'react-native';

import { Button, Card, ErrorState, LoadingState, RiskBadge, Screen, SectionTitle, StatRow } from '@/components/ui';
import { useSesmariaDashboard } from '@/hooks/queries';
import { formatMetros, RISK } from '@/lib/risk';

const REMANSO = {
  FAVORAVEL: { label: 'Favorável', className: 'text-risk-normal-dark dark:text-risk-normal-dark-text' },
  ALERTA_REMANSO: { label: 'Alerta de remanso', className: 'text-risk-alerta-dark dark:text-risk-alerta-dark-text' },
  REMANSO_CRITICO: { label: 'Remanso crítico', className: 'text-risk-emergencia-dark dark:text-risk-emergencia-dark-text' },
};

function mm(value: string) {
  return `${Number(value).toFixed(1).replace('.', ',')} mm`;
}

/** Projeção de 1 a 3 dias do módulo de IA do Rio Sesmaria (GET /sesmaria/dashboard-ia). */
export default function PrevisaoScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } = useSesmariaDashboard();

  const enviarWhatsApp = async () => {
    if (!data) return;
    const texto = encodeURIComponent(data.mensagem_alerta_whatsapp);
    // Abre direto o app do WhatsApp; se não estiver instalado, cai no link web.
    const appUrl = `whatsapp://send?text=${texto}`;
    const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
    await Linking.openURL(canOpen ? appUrl : `https://wa.me/?text=${texto}`);
  };

  return (
    <Screen
      title="Previsão"
      subtitle="Projeção por IA para os próximos 3 dias"
      refreshing={isRefetching}
      onRefresh={() => refetch()}>
      {isPending ? <LoadingState message="Calculando projeções..." /> : null}
      {isError ? <ErrorState error={error} onRetry={() => refetch()} /> : null}

      {data ? (
        <>
          <Card className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-slate-500 dark:text-slate-400">{data.rio} · {data.municipio}</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatMetros(data.nivel_atual_metros)}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">nível atual</Text>
            </View>
            <RiskBadge nivel={data.classificacao_risco} size="lg" />
          </Card>

          <SectionTitle>Próximos dias</SectionTitle>
          {data.previsoes.map((p) => (
            <Card key={p.dia_offset} className={`gap-3 border-l-4 ${RISK[p.classificacao_risco].cardClass}`}>
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-slate-900 dark:text-white">{p.rotulo}</Text>
                <RiskBadge nivel={p.classificacao_risco} />
              </View>
              <View className="flex-row items-end gap-2">
                <Text className={`text-4xl font-black ${RISK[p.classificacao_risco].textClass}`}>
                  {formatMetros(p.nivel_estimado_metros)}
                </Text>
                <Text className="pb-1 text-sm text-slate-500 dark:text-slate-400">estimado</Text>
              </View>
              <View className="flex-row gap-2">
                <Metric label="Chuva prevista" value={mm(p.chuva_prevista_mm)} />
                <Metric label="Prob. alerta" value={`${Math.round(p.probabilidade_alerta)}%`} />
                <Metric label="Confiança" value={`${Math.round(p.confiabilidade_percentual)}%`} />
              </View>
            </Card>
          ))}

          <Card>
            <SectionTitle>Condições da bacia</SectionTitle>
            <StatRow label="Chuva em S. J. do Barreiro (24h)" value={mm(data.telemetria.chuva_sjb_acumulada_24h_mm)} />
            <StatRow label="Chuva em Resende (24h)" value={mm(data.telemetria.chuva_resende_acumulada_24h_mm)} />
            <StatRow label="Saturação do solo (cabeceira)" value={`${Math.round(data.telemetria.saturacao_solo_sjb_percent)}%`} />
            <StatRow label="Vazão Represa do Funil" value={`${Number(data.telemetria.vazao_funil_atual_m3s).toFixed(0)} m³/s`} last />
          </Card>

          <Card className="gap-2">
            <SectionTitle>Represa do Funil</SectionTitle>
            <Text className={`text-base font-bold ${REMANSO[data.recomendacao_funil.situacao_remanso].className}`}>
              {REMANSO[data.recomendacao_funil.situacao_remanso].label}
            </Text>
            <Text className="text-base text-slate-700 dark:text-slate-200">{data.recomendacao_funil.acao_preventiva}</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              Tempo de trânsito médio: {data.recomendacao_funil.tempo_transito_medio}
            </Text>
          </Card>

          <Button label="Enviar boletim no WhatsApp" icon="💬" variant="whatsapp" onPress={enviarWhatsApp} />
          <Text className="px-2 text-center text-xs text-slate-400">
            Previsão estatística baseada na correlação entre chuva a montante, vazão do Funil e histórico do rio.
            Não substitui os comunicados oficiais da Defesa Civil.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl bg-white/70 p-2.5 dark:bg-slate-900/40">
      <Text className="text-[11px] text-slate-500 dark:text-slate-400">{label}</Text>
      <Text className="text-base font-bold text-slate-900 dark:text-white">{value}</Text>
    </View>
  );
}
