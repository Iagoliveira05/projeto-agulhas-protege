import { Stack } from 'expo-router';

export default function OcorrenciasLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: '#0284c7', headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'Ocorrências', headerLargeTitle: true }} />
      <Stack.Screen name="nova" options={{ title: 'Nova ocorrência', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalhes' }} />
    </Stack>
  );
}
