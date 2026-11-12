import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Switch, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { disableAlerts, enableAlerts, isAlertsEnabled } from '@/lib/alert-monitor';
import { checkHealth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getApiUrl, saveApiUrl } from '@/lib/config';

const INPUT =
  'min-h-12 rounded-xl border border-line bg-surface-primary px-4 text-base text-slate-900 dark:border-line-dark dark:bg-surface-dark-secondary dark:text-white';

const PERFIL_LABEL = {
  ADMINISTRADOR: 'Administrador',
  OPERADOR_DEFESA_CIVIL: 'Operador da Defesa Civil',
};

export default function ContaScreen() {
  const { usuario, login, logout } = useAuth();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [alertas, setAlertas] = useState(false);
  const [apiUrl, setApiUrl] = useState(getApiUrl());
  const [testando, setTestando] = useState(false);

  useEffect(() => {
    void isAlertsEnabled().then(setAlertas);
  }, []);

  const entrar = async () => {
    setEntrando(true);
    try {
      await login(email, senha);
      setSenha('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries();
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Falha no login', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setEntrando(false);
    }
  };

  const alternarAlertas = async (ativar: boolean) => {
    if (!ativar) {
      await disableAlerts();
      setAlertas(false);
      return;
    }
    const ok = await enableAlerts();
    setAlertas(ok);
    if (!ok) Alert.alert('Notificações bloqueadas', 'Ative as notificações do Agulhas Protege nas configurações do celular.');
  };

  const salvarServidor = async () => {
    setTestando(true);
    const url = await saveApiUrl(apiUrl);
    setApiUrl(url);
    const online = await checkHealth(url);
    setTestando(false);
    void queryClient.invalidateQueries();
    Alert.alert(online ? 'Conectado ✅' : 'Sem resposta ❌', online ? `API respondendo em ${url}` : `Não foi possível acessar ${url}/health`);
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Conta" subtitle="Acesso de operadores e preferências">
        {usuario ? (
          <Card className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-brand">
                <Text className="text-2xl font-bold text-white">{usuario.nome.charAt(0)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-900 dark:text-white">{usuario.nome}</Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400">{PERFIL_LABEL[usuario.perfil]}</Text>
                <Text className="text-xs text-slate-400">{usuario.email}</Text>
              </View>
            </View>
            <Button label="Sair" variant="secondary" onPress={() => void logout()} />
          </Card>
        ) : (
          <Card className="gap-3">
            <SectionTitle>Login de operador</SectionTitle>
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              Use as mesmas credenciais do painel web da Defesa Civil.
            </Text>
            <TextInput
              className={INPUT}
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <TextInput
              className={INPUT}
              value={senha}
              onChangeText={setSenha}
              placeholder="Senha"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={entrar}
            />
            <Button label="Entrar" onPress={entrar} loading={entrando} disabled={!email || senha.length < 6} />
          </Card>
        )}

        <Card className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-900 dark:text-white">🔔 Alertas de cheia</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              Receba uma notificação quando o risco do rio mudar, mesmo com o app fechado.
            </Text>
          </View>
          <Switch value={alertas} onValueChange={alternarAlertas} trackColor={{ true: '#0284c7' }} />
        </Card>

        <Card className="gap-3">
          <SectionTitle>Servidor da API</SectionTitle>
          <TextInput
            className={INPUT}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://192.168.0.10:8000"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Button label="Salvar e testar conexão" variant="secondary" loading={testando} onPress={salvarServidor} />
          <Text className="text-xs text-slate-400">
            O app consome a mesma API FastAPI e o mesmo banco PostgreSQL do sistema web Agulhas Protege.
          </Text>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
