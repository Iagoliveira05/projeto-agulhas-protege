import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  atualizarStatusOcorrencia,
  criarOcorrencia,
  excluirOcorrencia,
  fetchOcorrencias,
  type EstacaoStatus,
  type OcorrenciaInput,
  type StatusOcorrencia,
} from '@/lib/api';
import { CEMADEN_MAX_HORAS, fetchChuvaEstacao, fetchNivelSesmaria, fetchUltimaImagem } from '@/lib/cemaden';
import { fetchHistoricoReal, fetchStatusReal } from '@/lib/nivel-real';
import { fetchChuvaBacia } from '@/lib/open-meteo';
import { calcularPrevisao } from '@/lib/previsao';

// O CEMADEN publica uma leitura por hora; 5 min de intervalo pega a nova leitura logo que sai.
const CINCO_MINUTOS = 5 * 60_000;

export const queryKeys = {
  status: ['estacoes', 'status-atual'] as const,
  historico: (horas: number) => ['leituras', 'cemaden', horas] as const,
  chuvaEstacao: ['cemaden', 'chuva'] as const,
  imagem: ['cemaden', 'imagem'] as const,
  previsao: ['previsao', 'real'] as const,
  ocorrencias: ['ocorrencias'] as const,
};

export function useStatusAtual() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: fetchStatusReal,
    refetchInterval: CINCO_MINUTOS,
  });
}

export function useHistorico(cotas: EstacaoStatus['cotas'] | undefined, horas: number) {
  return useQuery({
    queryKey: [...queryKeys.historico(horas), cotas],
    queryFn: () => fetchHistoricoReal(horas, cotas!),
    enabled: Boolean(cotas),
    refetchInterval: CINCO_MINUTOS,
  });
}

export function useChuvaEstacao() {
  return useQuery({ queryKey: queryKeys.chuvaEstacao, queryFn: fetchChuvaEstacao, refetchInterval: CINCO_MINUTOS });
}

export function useImagemEstacao() {
  return useQuery({ queryKey: queryKeys.imagem, queryFn: fetchUltimaImagem, refetchInterval: CINCO_MINUTOS });
}

export function usePrevisaoReal(cotas: EstacaoStatus['cotas'] | undefined) {
  return useQuery({
    queryKey: [...queryKeys.previsao, cotas],
    queryFn: async () => {
      const [serie, chuva, chuvaEstacao] = await Promise.all([
        fetchNivelSesmaria(CEMADEN_MAX_HORAS),
        fetchChuvaBacia(),
        fetchChuvaEstacao().catch(() => null),
      ]);
      return calcularPrevisao(serie, chuva, cotas!, chuvaEstacao?.ultimas24h);
    },
    enabled: Boolean(cotas),
    refetchInterval: 30 * 60_000,
  });
}

export function useOcorrencias() {
  return useQuery({
    queryKey: queryKeys.ocorrencias,
    queryFn: () => fetchOcorrencias(),
    refetchInterval: 60_000,
  });
}

export function useCriarOcorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OcorrenciaInput) => criarOcorrencia(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ocorrencias }),
  });
}

export function useAtualizarStatusOcorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusOcorrencia }) =>
      atualizarStatusOcorrencia(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ocorrencias }),
  });
}

export function useExcluirOcorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirOcorrencia(id),
    // Sem await: a tela de detalhes volta para a lista antes de a lista ser recarregada.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.ocorrencias }),
  });
}
