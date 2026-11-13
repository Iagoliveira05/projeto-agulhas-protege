/**
 * Nível real do Rio Sesmaria combinado com o ecossistema Agulhas Protege.
 *
 * - Estação e cotas de risco: API FastAPI do projeto (as cotas são editadas pelo
 *   administrador no painel web e o app passa a usá-las automaticamente).
 * - Nível medido: estação hidrológica do CEMADEN no Sesmaria (dado real, horário).
 * A classificação segue a mesma regra de app/services/classificacao_risco.py do backend.
 */
import { fetchStatusAtual, type EstacaoStatus, type LeituraHistorico, type NivelRisco } from '@/lib/api';
import { CEMADEN_ESTACAO, fetchNivelSesmaria } from '@/lib/cemaden';

type Cotas = EstacaoStatus['cotas'];

/** Cotas do seed do backend, usadas só se a API do projeto estiver fora do ar. */
const COTAS_PADRAO: Cotas = { atencao: '2.00', alerta: '2.50', emergencia: '3.20' };
const DUAS_HORAS_MS = 2 * 60 * 60 * 1000;

export function classificarRisco(nivel: number, cotas: Cotas): NivelRisco {
  if (nivel >= Number(cotas.emergencia)) return 'EMERGENCIA';
  if (nivel >= Number(cotas.alerta)) return 'ALERTA';
  if (nivel >= Number(cotas.atencao)) return 'ATENCAO';
  return 'NORMAL';
}

async function estacaoDoProjeto(): Promise<{ estacao: Omit<EstacaoStatus, 'nivel_atual_metros' | 'classificacao_risco' | 'data_hora_leitura' | 'dados_desatualizados'>; apiOnline: boolean }> {
  try {
    const estacoes = await fetchStatusAtual();
    const sesmaria = estacoes.find((e) => /sesmaria/i.test(e.rio)) ?? estacoes[0];
    if (sesmaria) return { estacao: sesmaria, apiOnline: true };
  } catch {
    // Segue com a estação padrão: o nível real continua disponível mesmo sem a API.
  }
  return {
    apiOnline: false,
    estacao: {
      estacao_id: `cemaden-${CEMADEN_ESTACAO.id}`,
      codigo_externo: CEMADEN_ESTACAO.codigo,
      nome: 'Estação Rio Sesmarias',
      rio: 'Rio Sesmaria',
      cotas: COTAS_PADRAO,
    },
  };
}

export interface StatusReal extends EstacaoStatus {
  fonte: string;
  /** false quando a API do projeto não respondeu e as cotas são as padrão. */
  apiOnline: boolean;
}

/** Status atual: mesma forma de GET /estacoes/status-atual, com o nível medido pelo CEMADEN. */
export async function fetchStatusReal(): Promise<StatusReal[]> {
  const [{ estacao, apiOnline }, serie] = await Promise.all([estacaoDoProjeto(), fetchNivelSesmaria(3)]);
  const ultimo = serie[serie.length - 1];
  if (!ultimo) throw new Error('O CEMADEN não retornou leituras recentes da estação do Sesmaria.');

  return [
    {
      ...estacao,
      nome: `Estação CEMADEN ${CEMADEN_ESTACAO.nome}`,
      nivel_atual_metros: ultimo.nivel.toFixed(2),
      classificacao_risco: classificarRisco(ultimo.nivel, estacao.cotas),
      data_hora_leitura: ultimo.dataHora,
      dados_desatualizados: Date.now() - new Date(ultimo.dataHora).getTime() > DUAS_HORAS_MS,
      fonte: `CEMADEN · estação ${CEMADEN_ESTACAO.codigo}`,
      apiOnline,
    },
  ];
}

/** Histórico real no mesmo formato de GET /leituras/historico. */
export async function fetchHistoricoReal(horas: number, cotas: Cotas): Promise<LeituraHistorico[]> {
  const serie = await fetchNivelSesmaria(horas);
  return serie.map((p) => ({
    id: p.dataHora,
    data_hora: p.dataHora,
    nivel_metros: p.nivel.toFixed(2),
    classificacao: classificarRisco(p.nivel, cotas),
  }));
}
