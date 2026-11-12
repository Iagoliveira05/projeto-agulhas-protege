import { Link, router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { Button, ErrorState, LoadingState, Segmented } from '@/components/ui';
import { useOcorrencias } from '@/hooks/queries';
import type { StatusOcorrencia } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRelativo, STATUS_OCORRENCIA } from '@/lib/risk';

type Filtro = 'TODAS' | StatusOcorrencia;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'ABERTA', label: 'Abertas' },
  { value: 'EM_ANDAMENTO', label: 'Andamento' },
  { value: 'ENCERRADA', label: 'Encerradas' },
];

/** Lista de ocorrências de campo — os mesmos registros exibidos no Dashboard da Defesa Civil do site. */
export default function OcorrenciasScreen() {
  const { isOperador } = useAuth();
  const { data, isPending, isError, error, refetch, isRefetching } = useOcorrencias();
  const [filtro, setFiltro] = useState<Filtro>('TODAS');

  const itens = (data ?? []).filter((o) => filtro === 'TODAS' || o.status === filtro);

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-primary">
      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-3 px-4 pb-28 pt-3"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} colors={['#0284c7']} tintColor="#0284c7" />}
        ListHeaderComponent={
          <View className="gap-3 pb-1">
            {!isOperador ? (
              <Pressable
                onPress={() => router.navigate('/conta')}
                className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950">
                <Text className="text-sm text-brand-dark dark:text-sky-200">
                  🔐 Operador da Defesa Civil? Entre na aba <Text className="font-bold">Conta</Text> para registrar e
                  atualizar ocorrências direto do campo.
                </Text>
              </Pressable>
            ) : null}
            <Segmented options={FILTROS} value={filtro} onChange={setFiltro} />
          </View>
        }
        ListEmptyComponent={
          isPending ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <Text className="py-12 text-center text-slate-500">Nenhuma ocorrência neste filtro.</Text>
          )
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/ocorrencias/[id]', params: { id: item.id } }} asChild>
            <Pressable className="gap-2 rounded-2xl border border-line bg-surface-primary p-4 active:opacity-70 dark:border-line-dark dark:bg-surface-dark-secondary">
              <View className="flex-row items-center justify-between">
                <View className={`rounded-full px-2.5 py-0.5 ${STATUS_OCORRENCIA[item.status].className}`}>
                  <Text className={`text-xs font-bold ${STATUS_OCORRENCIA[item.status].className}`}>
                    {STATUS_OCORRENCIA[item.status].label}
                  </Text>
                </View>
                <Text className="text-xs text-slate-500 dark:text-slate-400">{formatRelativo(item.criado_em)}</Text>
              </View>
              <Text className="text-base font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
                📍 {item.localizacao}
              </Text>
              <Text className="text-sm text-slate-600 dark:text-slate-300" numberOfLines={2}>
                {item.descricao}
              </Text>
              <Text className="text-xs text-slate-400">
                {item.estacao_nome ?? 'Estação'} · {item.usuario_nome ?? 'Defesa Civil'}
              </Text>
            </Pressable>
          </Link>
        )}
      />

      {isOperador ? (
        <View className="absolute bottom-6 left-4 right-4">
          <Button label="Registrar ocorrência" icon="＋" onPress={() => router.push('/ocorrencias/nova')} />
        </View>
      ) : null}
    </View>
  );
}
