import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL_KEY = 'agulhas:api-url';

export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

let apiUrl = DEFAULT_API_URL;

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

/** Carrega a URL salva pelo usuário (aba Conta). Chamado na inicialização e na tarefa em segundo plano. */
export async function loadApiUrl(): Promise<string> {
  const saved = await AsyncStorage.getItem(API_URL_KEY);
  if (saved) apiUrl = saved;
  return apiUrl;
}

export async function saveApiUrl(url: string): Promise<string> {
  apiUrl = normalize(url) || DEFAULT_API_URL;
  await AsyncStorage.setItem(API_URL_KEY, apiUrl);
  return apiUrl;
}

export function getApiUrl(): string {
  return apiUrl;
}
