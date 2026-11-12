import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  atualizarStatusOcorrencia,
  criarOcorrencia,
  fetchHistorico,
  fetchOcorrencias,
  fetchSesmariaDashboard,
  fetchStatusAtual,
  type OcorrenciaInput,
  type StatusOcorrencia,
} from '@/lib/api';

// Mesmas chaves e intervalos de atualização usados pelos hooks do site (React Query).
export const queryKeys = {
  status: ['estacoes', 'status-atual'] as const,
  historico: (estacaoId: string, horas: number) => ['leituras', estacaoId, horas] as const,
  ocorrencias: ['ocorrencias'] as const,
  sesmaria: ['sesmaria', 'dashboard-ia'] as const,
};

export function useStatusAtual() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: fetchStatusAtual,
    refetchInterval: 60_000,
  });
}

export function useHistorico(estacaoId: string | undefined, horas: number) {
  return useQuery({
    queryKey: queryKeys.historico(estacaoId ?? '', horas),
    queryFn: () => fetchHistorico(estacaoId!, horas),
    enabled: Boolean(estacaoId),
    refetchInterval: 5 * 60_000,
  });
}

export function useSesmariaDashboard() {
  return useQuery({
    queryKey: queryKeys.sesmaria,
    queryFn: fetchSesmariaDashboard,
    refetchInterval: 5 * 60_000,
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
