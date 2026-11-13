/**
 * Chuva observada e prevista (Open-Meteo, sem chave de API) para dois pontos da bacia:
 * Resende, junto à estação do Sesmaria, e a cabeceira em São José do Barreiro-SP,
 * cuja chuva chega ao Sesmaria com algumas horas de atraso.
 */
import { CEMADEN_ESTACAO } from '@/lib/cemaden';

export const PONTOS_BACIA = {
  resende: { nome: 'Resende', latitude: CEMADEN_ESTACAO.latitude, longitude: CEMADEN_ESTACAO.longitude },
  cabeceira: { nome: 'São José do Barreiro', latitude: -22.6447, longitude: -44.5772 },
};

export interface SerieChuva {
  /** Horário local de São Paulo, "2026-11-13T14:00". */
  horas: string[];
  precipitacao: number[];
  probabilidade: number[];
}

interface OpenMeteoRaw {
  hourly: { time: string[]; precipitation: (number | null)[]; precipitation_probability: (number | null)[] };
}

export async function fetchChuvaBacia(): Promise<{ resende: SerieChuva; cabeceira: SerieChuva }> {
  const { resende, cabeceira } = PONTOS_BACIA;
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${resende.latitude},${cabeceira.latitude}` +
    `&longitude=${resende.longitude},${cabeceira.longitude}` +
    '&hourly=precipitation,precipitation_probability&past_days=2&forecast_days=4&timezone=America%2FSao_Paulo';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let dados: OpenMeteoRaw[];
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error();
    dados = (await response.json()) as OpenMeteoRaw[];
  } catch {
    throw new Error('Não foi possível obter a previsão de chuva. Verifique a internet.');
  } finally {
    clearTimeout(timer);
  }

  const toSerie = (raw: OpenMeteoRaw): SerieChuva => ({
    horas: raw.hourly.time,
    precipitacao: raw.hourly.precipitation.map((v) => v ?? 0),
    probabilidade: raw.hourly.precipitation_probability.map((v) => v ?? 0),
  });
  return { resende: toSerie(dados[0]), cabeceira: toSerie(dados[1]) };
}
