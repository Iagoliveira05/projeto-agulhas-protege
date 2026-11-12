import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { useCriarOcorrencia, useStatusAtual } from '@/hooks/queries';
import { useAuth } from '@/lib/auth';

const INPUT =
  'min-h-12 rounded-xl border border-line bg-surface-primary px-4 py-3 text-base text-slate-900 dark:border-line-dark dark:bg-surface-dark-secondary dark:text-white';

/**
 * Registro de ocorrência em campo (POST /ocorrencias).
 * Diferencial mobile: o GPS do aparelho preenche o endereço automaticamente.
 */
export default function NovaOcorrenciaScreen() {
  const { isOperador } = useAuth();
  const { data: estacoes } = useStatusAtual();
  const criar = useCriarOcorrencia();

  const [estacaoId, setEstacaoId] = useState<string>();
  const [localizacao, setLocalizacao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [buscandoGps, setBuscandoGps] = useState(false);

  const estacaoSelecionada = estacaoId ?? estacoes?.[0]?.estacao_id;
  const localValido = localizacao.trim().length >= 5;
  const descricaoValida = descricao.trim().length >= 10;

  const usarGps = async () => {
    setBuscandoGps(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        Alert.alert('Permissão negada', 'Permita o acesso à localização para preencher o endereço automaticamente.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coordenadas = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
      let endereco = '';
      try {
        const [lugar] = await Location.reverseGeocodeAsync(coords);
        if (lugar) {
          endereco = [
            [lugar.street, lugar.streetNumber].filter(Boolean).join(', '),
            lugar.district,
            lugar.city ?? lugar.subregion,
          ]
            .filter(Boolean)
            .join(' - ');
        }
      } catch {
        // Sem geocodificação reversa (offline): usa só as coordenadas.
      }
      setLocalizacao((endereco ? `${endereco} (${coordenadas})` : `GPS ${coordenadas}`).slice(0, 300));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('GPS indisponível', 'Não foi possível obter a localização. Verifique se o GPS está ativado.');
    } finally {
      setBuscandoGps(false);
    }
  };

  const enviar = () => {
    if (!estacaoSelecionada) return;
    criar.mutate(
      { estacao_id: estacaoSelecionada, localizacao: localizacao.trim(), descricao: descricao.trim() },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (error) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Não foi possível registrar', error.message);
        },
      },
    );
  };

  if (!isOperador) {
    return (
      <Screen withHeader>
        <Card className="gap-3">
          <Text className="text-base text-slate-700 dark:text-slate-200">
            Somente operadores autenticados da Defesa Civil podem registrar ocorrências.
          </Text>
          <Button label="Ir para login" onPress={() => router.navigate('/conta')} />
        </Card>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen withHeader>
        <View>
          <SectionTitle>Estação</SectionTitle>
          <View className="flex-row flex-wrap gap-2">
            {estacoes?.map((e) => {
              const ativa = e.estacao_id === estacaoSelecionada;
              return (
                <Pressable
                  key={e.estacao_id}
                  onPress={() => setEstacaoId(e.estacao_id)}
                  className={`min-h-11 justify-center rounded-xl border px-4 ${ativa ? 'border-brand bg-sky-50 dark:bg-sky-950' : 'border-line bg-surface-primary dark:border-line-dark dark:bg-surface-dark-secondary'}`}>
                  <Text className={`text-sm font-semibold ${ativa ? 'text-brand-dark dark:text-sky-200' : 'text-slate-600 dark:text-slate-300'}`}>
                    {e.nome}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <SectionTitle>Localização</SectionTitle>
          <TextInput
            className={INPUT}
            value={localizacao}
            onChangeText={setLocalizacao}
            placeholder="Rua, número, bairro ou ponto de referência"
            placeholderTextColor="#94a3b8"
            maxLength={300}
            multiline
          />
          <Button
            label={buscandoGps ? 'Obtendo localização...' : 'Usar minha localização (GPS)'}
            icon="📍"
            variant="secondary"
            loading={buscandoGps}
            onPress={usarGps}
          />
          {localizacao.length > 0 && !localValido ? (
            <Text className="text-xs text-risk-emergencia">Mínimo de 5 caracteres.</Text>
          ) : null}
        </View>

        <View className="gap-2">
          <SectionTitle>Descrição</SectionTitle>
          <TextInput
            className={`${INPUT} min-h-32`}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="O que está acontecendo? Ex.: água atingiu a calçada, rua interditada..."
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
            multiline
          />
          <Text className={`text-xs ${descricao.length > 0 && !descricaoValida ? 'text-risk-emergencia' : 'text-slate-400'}`}>
            {descricao.trim().length}/10 caracteres mínimos
          </Text>
        </View>

        <Button
          label="Registrar ocorrência"
          onPress={enviar}
          loading={criar.isPending}
          disabled={!estacaoSelecionada || !localValido || !descricaoValida}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
