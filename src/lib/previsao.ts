/**
 * Estimativa do nível do Rio Sesmaria para +24h, +48h e +72h a partir de dados reais:
 * nível atual (CEMADEN) e chuva observada/prevista na bacia (Open-Meteo).
 *
 * Modelo conceitual simplificado (tanque linear):
 * - a chuva da cabeceira (São José do Barreiro) pesa mais que a de Resende, pois
 *   escoa por toda a bacia até a estação;
 * - quanto mais choveu nas 48h anteriores, mais saturado o solo e maior o escoamento;
 * - sem chuva, o rio recua 20% por dia em direção ao nível de base (mínimo recente).
 * Os coeficientes são aproximações e não substituem a modelagem oficial.
 */
import type { EstacaoStatus, NivelRisco } from '@/lib/api';
import type { PontoNivel } from '@/lib/cemaden';
import { classificarRisco } from '@/lib/nivel-real';
import type { SerieChuva } from '@/lib/open-meteo';

const PESO_CABECEIRA = 0.6;
const PESO_RESENDE = 0.4;
const METROS_POR_MM = 0.025;
const RECESSAO_DIARIA = 0.8;

export interface PrevisaoDia {
  diaOffset: number;
  rotulo: string;
  dataAlvo: Date;
  nivelEstimado: number;
  chuvaResende: number;
  chuvaCabeceira: number;
  probabilidadeChuva: number;
  classificacao: NivelRisco;
}

export interface CondicoesBacia {
  chuva24hResende: number;
  chuva24hCabeceira: number;
  chuva48hBacia: number;
  saturacaoSolo: number;
  /** Variação do nível nas últimas 6h, em metros. */
  tendencia6h: number | null;
}

export interface PrevisaoReal {
  previsoes: PrevisaoDia[];
  condicoes: CondicoesBacia;
}

function soma(valores: number[], inicio: number, fim: number): number {
  return valores.slice(Math.max(0, inicio), Math.max(0, fim)).reduce((a, b) => a + b, 0);
}

/** Índice da hora atual na série do Open-Meteo (horário de Brasília, UTC-3 fixo). */
function indiceAgora(horas: string[]): number {
  const agoraLocal = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 13);
  const indice = horas.findIndex((h) => h.slice(0, 13) === agoraLocal);
  return indice >= 0 ? indice : 48;
}

/** Ponto da série cuja leitura é a mais próxima de `horas` atrás da última. */
function pontoHorasAtras(serie: PontoNivel[], horas: number): PontoNivel | undefined {
  const alvo = new Date(serie[serie.length - 1].dataHora).getTime() - horas * 60 * 60 * 1000;
  return serie.find((p) => new Date(p.dataHora).getTime() >= alvo);
}

/**
 * @param chuvaMedida24hEstacao chuva real medida pelo pluviômetro do CEMADEN em Resende.
 *   Tem prioridade sobre a estimativa do Open-Meteo para o passado, que é dado de modelo.
 */
export function calcularPrevisao(
  serieNivel: PontoNivel[],
  chuva: { resende: SerieChuva; cabeceira: SerieChuva },
  cotas: EstacaoStatus['cotas'],
  chuvaMedida24hEstacao = 0,
): PrevisaoReal {
  if (serieNivel.length === 0) {
    throw new Error('O CEMADEN não retornou leituras recentes para calcular a previsão.');
  }
  const nivelAtual = serieNivel[serieNivel.length - 1].nivel;
  const nivelBase = Math.min(...serieNivel.map((p) => p.nivel));
  const agora = indiceAgora(chuva.resende.horas);

  const chuva24hResende = Math.max(chuvaMedida24hEstacao, soma(chuva.resende.precipitacao, agora - 24, agora));
  const chuva24hCabeceira = soma(chuva.cabeceira.precipitacao, agora - 24, agora);
  const chuva48hResende = Math.max(chuvaMedida24hEstacao, soma(chuva.resende.precipitacao, agora - 48, agora));
  let antecedente =
    PESO_CABECEIRA * soma(chuva.cabeceira.precipitacao, agora - 48, agora) + PESO_RESENDE * chuva48hResende;
  const chuva48hBacia = antecedente;

  const seisHorasAtras = pontoHorasAtras(serieNivel, 6);
  const tendencia6h = seisHorasAtras ? nivelAtual - seisHorasAtras.nivel : null;
  // Se o rio está subindo agora, parte dessa onda ainda chega nas próximas horas.
  const ondaEmCurso = Math.max(0, tendencia6h ?? 0) * 0.5;

  const rotulos = ['+24h (Amanhã)', '+48h (2 dias)', '+72h (3 dias)'];
  let nivel = nivelAtual;
  const previsoes = rotulos.map((rotulo, i) => {
    const inicio = agora + i * 24;
    const fim = inicio + 24;
    const chuvaResende = soma(chuva.resende.precipitacao, inicio, fim);
    const chuvaCabeceira = soma(chuva.cabeceira.precipitacao, inicio, fim);
    const chuvaEfetiva = PESO_CABECEIRA * chuvaCabeceira + PESO_RESENDE * chuvaResende;
    const coeficienteEscoamento = Math.min(0.6, 0.2 + antecedente / 150);

    nivel =
      nivelBase +
      (nivel - nivelBase) * RECESSAO_DIARIA +
      coeficienteEscoamento * chuvaEfetiva * METROS_POR_MM +
      (i === 0 ? ondaEmCurso : 0);
    antecedente = antecedente / 2 + chuvaEfetiva;

    return {
      diaOffset: i + 1,
      rotulo,
      dataAlvo: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
      nivelEstimado: Math.round(nivel * 100) / 100,
      chuvaResende,
      chuvaCabeceira,
      probabilidadeChuva: Math.max(0, ...chuva.resende.probabilidade.slice(inicio, fim)),
      classificacao: classificarRisco(nivel, cotas),
    };
  });

  return {
    previsoes,
    condicoes: {
      chuva24hResende,
      chuva24hCabeceira,
      chuva48hBacia,
      saturacaoSolo: Math.round(Math.min(100, (chuva48hBacia / 80) * 100)),
      tendencia6h,
    },
  };
}
