import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Text, View } from 'react-native';

import { Button, Card, ErrorState, LoadingState, Screen, SectionTitle, StatRow } from '@/components/ui';
import { useAtualizarStatusOcorrencia, useExcluirOcorrencia, useOcorrencias } from '@/hooks/queries';
import type { StatusOcorrencia } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDataHora, STATUS_OCORRENCIA } from '@/lib/risk';

const PROXIMOS: Record<StatusOcorrencia, { status: StatusOcorrencia; label: string }[]> = {
  ABERTA: [
    { status: 'EM_ANDAMENTO', label: 'Iniciar atendimento' },
    { status: 'ENCERRADA', label: 'Encerrar' },
  ],
  EM_ANDAMENTO: [{ status: 'ENCERRADA', label: 'Encerrar ocorrência' }],
  ENCERRADA: [{ status: 'ABERTA', label: 'Reabrir' }],
};

export default function OcorrenciaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isOperador } = useAuth();
  const { data, isPending, isError, error, refetch } = useOcorrencias();
  const atualizar = useAtualizarStatusOcorrencia();
  const excluir = useExcluirOcorrencia();
  const ocorrencia = data?.find((o) => o.id === id);

  const mudarStatus = (status: StatusOcorrencia) => {
    Alert.alert('Confirmar', `Alterar status para "${STATUS_OCORRENCIA[status].label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () =>
          atualizar.mutate(
            { id, status },
            {
              onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
              onError: (e) => Alert.alert('Erro', e.message),
            },
          ),
      },
    ]);
  };

  const confirmarExclusao = () => {
    Alert.alert(
      'Excluir ocorrência?',
      'Ela será removida do app e do painel web da Defesa Civil. A exclusão fica registrada na auditoria.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () =>
            excluir.mutate(id, {
              onSuccess: () => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              },
              onError: (e) => Alert.alert('Não foi possível excluir', e.message),
            }),
        },
      ],
    );
  };

  return (
    <Screen withHeader refreshing={false} onRefresh={() => refetch()}>
      <Stack.Screen options={{ title: ocorrencia ? STATUS_OCORRENCIA[ocorrencia.status].label : 'Detalhes' }} />
      {isPending ? <LoadingState /> : null}
      {isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {data && !ocorrencia && !excluir.isSuccess ? <ErrorState error={new Error('Ocorrência não encontrada.')} /> : null}

      {ocorrencia ? (
        <>
          <Card className="gap-2">
            <SectionTitle>Localização</SectionTitle>
            <Text className="text-lg font-semibold text-slate-900 dark:text-white">📍 {ocorrencia.localizacao}</Text>
            <Button
              label="Abrir no mapa"
              icon="🗺️"
              variant="secondary"
              onPress={() =>
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ocorrencia.localizacao)}`)
              }
            />
          </Card>

          <Card className="gap-2">
            <SectionTitle>Descrição</SectionTitle>
            <Text className="text-base leading-6 text-slate-700 dark:text-slate-200">{ocorrencia.descricao}</Text>
          </Card>

          <Card>
            <StatRow label="Status" value={STATUS_OCORRENCIA[ocorrencia.status].label} />
            <StatRow label="Estação" value={ocorrencia.estacao_nome ?? '—'} />
            <StatRow label="Registrado por" value={ocorrencia.usuario_nome ?? '—'} />
            <StatRow label="Criado em" value={formatDataHora(ocorrencia.criado_em)} />
            <StatRow
              label="Atualizado em"
              value={ocorrencia.atualizado_em ? formatDataHora(ocorrencia.atualizado_em) : '—'}
              last
            />
          </Card>

          {isOperador ? (
            <View className="gap-3">
              <SectionTitle>Atualizar atendimento</SectionTitle>
              {PROXIMOS[ocorrencia.status].map((acao, i) => (
                <Button
                  key={acao.status}
                  label={acao.label}
                  variant={i === 0 ? 'primary' : 'secondary'}
                  loading={atualizar.isPending && atualizar.variables?.status === acao.status}
                  onPress={() => mudarStatus(acao.status)}
                />
              ))}
              <Button
                label="Excluir ocorrência"
                icon="🗑️"
                variant="danger"
                loading={excluir.isPending}
                onPress={confirmarExclusao}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
