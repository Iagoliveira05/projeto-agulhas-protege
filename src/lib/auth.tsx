import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { loginApi, logoutApi, setSessionExpiredHandler, type PerfilUsuario } from '@/lib/api';

/**
 * Sessão do operador da Defesa Civil.
 * Os tokens ficam nos cookies httpOnly emitidos pela API (cookie jar nativo);
 * aqui guardamos apenas nome e perfil para a interface, como o authStore do site.
 */
interface Usuario {
  nome: string;
  perfil: PerfilUsuario;
  email: string;
}

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  isOperador: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SESSION_KEY = 'agulhas:session';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const limparSessao = useCallback(() => {
    setUsuario(null);
    void AsyncStorage.removeItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => raw && setUsuario(JSON.parse(raw)))
      .finally(() => setCarregando(false));
    setSessionExpiredHandler(limparSessao);
    return () => setSessionExpiredHandler(null);
  }, [limparSessao]);

  const login = useCallback(async (email: string, senha: string) => {
    const resposta = await loginApi({ email: email.trim().toLowerCase(), senha });
    const novo = { nome: resposta.nome, perfil: resposta.perfil, email: email.trim().toLowerCase() };
    setUsuario(novo);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(novo));
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      limparSessao();
    }
  }, [limparSessao]);

  return (
    <AuthContext.Provider value={{ usuario, carregando, isOperador: usuario !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return context;
}
