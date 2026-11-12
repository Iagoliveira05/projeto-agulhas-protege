import { useState } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import type { LeituraHistorico } from '@/lib/api';
import { formatDataHora, formatMetros, RISK } from '@/lib/risk';

interface LevelChartProps {
  leituras: LeituraHistorico[];
  cotas: { atencao: string; alerta: string; emergencia: string };
}

const HEIGHT = 200;
const PAD = { top: 12, right: 8, bottom: 22, left: 36 };

/**
 * Gráfico do histórico de nível (equivalente ao GraficoHistorico/Recharts do site),
 * desenhado em SVG nativo. Arraste o dedo sobre o gráfico para inspecionar cada leitura.
 */
export function LevelChart({ leituras, cotas }: LevelChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  if (leituras.length === 0) {
    return <Text className="py-10 text-center text-slate-500">Sem leituras no período.</Text>;
  }

  const niveis = leituras.map((l) => Number(l.nivel_metros));
  const limites = [Number(cotas.atencao), Number(cotas.alerta), Number(cotas.emergencia)];
  const min = Math.max(0, Math.min(...niveis) - 0.3);
  const max = Math.max(...niveis, limites[1]) + 0.2;
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (leituras.length === 1 ? plotW / 2 : (i / (leituras.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

  const linePath = niveis.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  const areaPath = `${linePath} L${x(niveis.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;

  const ticks = [min, (min + max) / 2, max];
  const cotaLines = [
    { value: limites[0], color: RISK.ATENCAO.color },
    { value: limites[1], color: RISK.ALERTA.color },
    { value: limites[2], color: RISK.EMERGENCIA.color },
  ].filter((c) => c.value <= max);

  const pick = (event: GestureResponderEvent) => {
    const touchX = event.nativeEvent.locationX - PAD.left;
    const index = Math.round((touchX / plotW) * (leituras.length - 1));
    setSelected(Math.min(leituras.length - 1, Math.max(0, index)));
  };

  const ponto = selected !== null ? leituras[selected] : leituras[leituras.length - 1];

  return (
    <View>
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">{formatMetros(ponto.nivel_metros)}</Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {selected !== null ? formatDataHora(ponto.data_hora) : 'Última leitura · arraste para inspecionar'}
        </Text>
      </View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderRelease={() => setSelected(null)}
        accessibilityLabel={`Gráfico de nível com ${leituras.length} leituras`}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0284c7" stopOpacity={0.35} />
                <Stop offset="1" stopColor="#0284c7" stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {ticks.map((t) => (
              <SvgText key={t} x={PAD.left - 6} y={y(t) + 4} fontSize={10} fill="#94a3b8" textAnchor="end">
                {t.toFixed(1)}
              </SvgText>
            ))}
            {cotaLines.map((c) => (
              <Line key={c.value} x1={PAD.left} x2={width - PAD.right} y1={y(c.value)} y2={y(c.value)} stroke={c.color} strokeDasharray="5 4" strokeWidth={1.2} />
            ))}
            <Path d={areaPath} fill="url(#area)" />
            <Path d={linePath} stroke="#0284c7" strokeWidth={2.5} fill="none" strokeLinejoin="round" />
            {selected !== null ? (
              <>
                <Line x1={x(selected)} x2={x(selected)} y1={PAD.top} y2={PAD.top + plotH} stroke="#64748b" strokeWidth={1} />
                <Circle cx={x(selected)} cy={y(niveis[selected])} r={5} fill="#0284c7" stroke="#fff" strokeWidth={2} />
              </>
            ) : (
              <Circle cx={x(niveis.length - 1)} cy={y(niveis[niveis.length - 1])} r={4.5} fill="#0284c7" />
            )}
            <SvgText x={PAD.left} y={HEIGHT - 6} fontSize={10} fill="#94a3b8">
              {formatDataHora(leituras[0].data_hora)}
            </SvgText>
            <SvgText x={width - PAD.right} y={HEIGHT - 6} fontSize={10} fill="#94a3b8" textAnchor="end">
              {formatDataHora(leituras[leituras.length - 1].data_hora)}
            </SvgText>
          </Svg>
        ) : (
          <View style={{ height: HEIGHT }} />
        )}
      </View>
      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
        {(['ATENCAO', 'ALERTA', 'EMERGENCIA'] as const).map((nivel, i) => (
          <View key={nivel} className="flex-row items-center gap-1.5">
            <View className="h-0.5 w-4" style={{ backgroundColor: RISK[nivel].color }} />
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              {RISK[nivel].display} {formatMetros(limites[i])}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
