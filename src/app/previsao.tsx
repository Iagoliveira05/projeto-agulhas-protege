import { Linking, Text, View } from 'react-native';

import { Button, Card, ErrorState, LoadingState, RiskBadge, Screen, SectionTitle, StatRow } from '@/components/ui';
import { usePrevisaoReal, useStatusAtual } from '@/hooks/queries';
import type { PrevisaoReal } from '@/lib/previsao';
import { formatMetros, RISK } from '@/lib/risk';

function mm(value: number) {
  return `${value.toFixed(1).replace('.', ',')} mm`;
}

function tendenciaTexto(tendencia: number | null) {
  if (tendencia === null) return '—';
  const cm = Math.round(tendencia * 100);
  if (Math.abs(cm) < 2) return 'Estável';
  return cm > 0 ? `Subindo (+${cm} cm)` : `Baixando (${cm} cm)`;
}

function montarBoletim(rio: string, nivelAtual: string, previsao: PrevisaoReal) {
  const linhas = previsao.previsoes.map(
    (p) =>
      `• ${p.rotulo}: ${formatMetros(p.nivelEstimado)} (${RISK[p.classificacao].display}) · chuva prevista ${mm(p.chuvaCabeceira)} na cabeceira / ${mm(p.chuvaResende)} em Resende`,
  );
  return [
    `🌊 *Agulhas Protege — Boletim ${rio}*`,
    `Nível medido agora: ${formatMetros(nivelAtual)} (CEMADEN)`,
    `Chuva 24h: ${mm(previsao.condicoes.chuva24hCabeceira)} na cabeceira, ${mm(previsao.condicoes.chuva24hResende)} em Resende`,
    '',
    '*Estimativa para os próximos dias:*',
    ...linhas,
    '',
    'Emergência: Defesa Civil 199 · Bombeiros 193',
  ].join('\n');
}

/** Estimativa de 1 a 3 dias calculada com o nível real (CEMADEN) e a chuva prevista (Open-Meteo). */
export default function PrevisaoScreen() {
  const status = useStatusAtual();
  const estacao = status.data?.[0];
  const { data, isPending, isError, error, refetch, isRefetching } = usePrevisaoReal(estacao?.cotas);

  const enviarWhatsApp = async () => {
    if (!data || !estacao) return;
    const texto = encodeURIComponent(montarBoletim(estacao.rio, estacao.nivel_atual_metros, data));
    // Abre direto o app do WhatsApp; se não estiver instalado, cai no link web.
    const appUrl = `whatsapp://send?text=${texto}`;
    const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
    await Linking.openURL(canOpen ? appUrl : `https://wa.me/?text=${texto}`);
  };

  const carregando = status.isPending || (Boolean(estacao) && isPending);

  return (
    <Screen
      title="Previsão"
      subtitle="Estimativa para os próximos 3 dias"
      refreshing={isRefetching}
      onRefresh={() => {
        void status.refetch();
        void refetch();
      }}>
      {carregando ? <LoadingState message="Calculando com dados reais..." /> : null}
      {status.isError ? <ErrorState error={status.error} onRetry={() => status.refetch()} /> : null}
      {isError ? <ErrorState error={error} onRetry={() => refetch()} /> : null}

      {data && estacao ? (
        <>
          <Card className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-slate-500 dark:text-slate-400">{estacao.rio} · Resende-RJ</Text>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatMetros(estacao.nivel_atual_metros)}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                nível medido agora · {tendenciaTexto(data.condicoes.tendencia6h)} em 6h
              </Text>
            </View>
            <RiskBadge nivel={estacao.classificacao_risco} size="lg" />
          </Card>

          <SectionTitle>Próximos dias</SectionTitle>
          {data.previsoes.map((p) => (
            <Card key={p.diaOffset} className={`gap-3 border-l-4 ${RISK[p.classificacao].cardClass}`}>
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-slate-900 dark:text-white">{p.rotulo}</Text>
                <RiskBadge nivel={p.classificacao} />
              </View>
              <View className="flex-row items-end gap-2">
                <Text className={`text-4xl font-black ${RISK[p.classificacao].textClass}`}>
                  {formatMetros(p.nivelEstimado)}
                </Text>
                <Text className="pb-1 text-sm text-slate-500 dark:text-slate-400">estimado</Text>
              </View>
              <View className="flex-row gap-2">
                <Metric label="Chuva cabeceira" value={mm(p.chuvaCabeceira)} />
                <Metric label="Chuva Resende" value={mm(p.chuvaResende)} />
                <Metric label="Chance de chuva" value={`${Math.round(p.probabilidadeChuva)}%`} />
              </View>
            </Card>
          ))}

          <Card>
            <SectionTitle>Condições da bacia (últimas 24h)</SectionTitle>
            <StatRow label="Chuva em S. J. do Barreiro (cabeceira)" value={mm(data.condicoes.chuva24hCabeceira)} />
            <StatRow label="Chuva em Resende (pluviômetro CEMADEN)" value={mm(data.condicoes.chuva24hResende)} />
            <StatRow label="Saturação estimada do solo (48h)" value={`${data.condicoes.saturacaoSolo}%`} />
            <StatRow label="Tendência do nível (6h)" value={tendenciaTexto(data.condicoes.tendencia6h)} last />
          </Card>

          <Button label="Enviar boletim no WhatsApp" icon="💬" variant="whatsapp" onPress={enviarWhatsApp} />
          <Text className="px-2 text-center text-xs text-slate-400">
            Estimativa calculada no app com dados reais: nível da estação do CEMADEN e chuva observada/prevista do
            Open-Meteo para Resende e São José do Barreiro. Modelo simplificado — não substitui os comunicados oficiais
            da Defesa Civil.
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
