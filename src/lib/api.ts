/**
 * Cliente da API FastAPI do Agulhas Protege (mesmo backend do site web).
 *
 * Contrato espelhado de frontend/src/services/api.ts do projeto web. A autenticação
 * usa os mesmos cookies httpOnly (access_token / refresh_token): no Android e no iOS
 * o cookie jar nativo do fetch guarda e reenvia os cookies automaticamente.
 */
import { getApiUrl } from '@/lib/config';

export type NivelRisco = 'NORMAL' | 'ATENCAO' | 'ALERTA' | 'EMERGENCIA';
export type StatusOcorrencia = 'ABERTA' | 'EM_ANDAMENTO' | 'ENCERRADA';
export type PerfilUsuario = 'ADMINISTRADOR' | 'OPERADOR_DEFESA_CIVIL';

const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

let onSessionExpired: (() => void) | null = null;

/** Registrado pelo AuthProvider para limpar a sessão local quando o refresh falha. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet ou o endereço da API na aba Conta.');
  } finally {
    clearTimeout(timer);
  }
}

function createRequestOptions(options: RequestInit): RequestInit {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  return { ...options, credentials: 'include', headers };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const content = await response.text();
  if (!content) return undefined as T;
  try {
    return JSON.parse(content) as T;
  } catch {
    return content as T;
  }
}

function getErrorDetail(body: unknown): string {
  if (typeof body !== 'object' || body === null) return 'Erro desconhecido.';
  const data = body as Record<string, unknown>;
  if (typeof data.detail === 'string') return data.detail;
  // Erros de validação do Pydantic chegam como lista em `detail`.
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0] as { msg?: string };
    if (first.msg) return first.msg.replace(/^Value error, /, '');
  }
  if (typeof data.erro === 'string') return data.erro;
  if (typeof data.error === 'string') return data.error;
  return 'Erro desconhecido.';
}

async function throwApiError(response: Response): Promise<never> {
  const detail = getErrorDetail(await parseResponse<unknown>(response));
  const messages: Record<number, string> = {
    400: `Dados inválidos: ${detail}`,
    403: 'Você não tem permissão para esta ação.',
    404: 'Recurso não encontrado.',
    422: `Erro de validação: ${detail}`,
    429: 'Muitas requisições. Tente novamente em alguns segundos.',
    500: 'Erro interno do servidor. Contate o suporte.',
  };
  throw new ApiError(response.status, messages[response.status] ?? detail);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = `${getApiUrl()}/api/v1`;
  const requestOptions = createRequestOptions(options);
  let response = await fetchWithTimeout(`${base}${path}`, requestOptions);

  // Mesma estratégia do site: tenta renovar a sessão uma vez (refresh token rotation).
  if (response.status === 401 && !path.startsWith('/auth/')) {
    const refreshResponse = await fetchWithTimeout(`${base}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!refreshResponse.ok) {
      onSessionExpired?.();
      throw new ApiError(401, 'Sessão expirada. Faça login novamente na aba Conta.');
    }
    response = await fetchWithTimeout(`${base}${path}`, requestOptions);
  }

  if (!response.ok) await throwApiError(response);
  return parseResponse<T>(response);
}

// ── Tipos (valores Decimal chegam como string, igual ao site) ─────────────

export interface EstacaoStatus {
  estacao_id: string;
  codigo_externo: string;
  nome: string;
  rio: string;
  nivel_atual_metros: string;
  classificacao_risco: NivelRisco;
  data_hora_leitura: string;
  dados_desatualizados: boolean;
  cotas: { atencao: string; alerta: string; emergencia: string };
}

export interface LeituraHistorico {
  id: string;
  data_hora: string;
  nivel_metros: string;
  classificacao: NivelRisco;
}

export interface OcorrenciaInput {
  estacao_id: string;
  alerta_id?: string;
  localizacao: string;
  descricao: string;
}

export interface Ocorrencia {
  id: string;
  estacao_id: string;
  estacao_nome?: string | null;
  usuario_nome?: string | null;
  alerta_id?: string | null;
  localizacao: string;
  descricao: string;
  status: StatusOcorrencia;
  criado_em: string;
  atualizado_em?: string | null;
}

export interface LoginResponse {
  nome: string;
  perfil: PerfilUsuario;
  mensagem: string;
}

export interface PrevisaoNivelDia {
  dia_offset: number;
  rotulo: string;
  data_alvo: string;
  chuva_prevista_mm: string;
  vazao_funil_esperada_m3s: string;
  nivel_estimado_metros: string;
  probabilidade_alerta: number;
  probabilidade_emergencia: number;
  classificacao_risco: NivelRisco;
  confiabilidade_percentual: number;
}

export interface RecomendacaoFunil {
  vazao_atual_m3s: string;
  vazao_maxima_sugerida_m3s: string;
  tempo_transito_medio: string;
  situacao_remanso: 'FAVORAVEL' | 'ALERTA_REMANSO' | 'REMANSO_CRITICO';
  acao_preventiva: string;
  impacto_estimado_leito_cm: number;
}

export interface TelemetriaBacia {
  chuva_sjb_acumulada_12h_mm: string;
  chuva_sjb_acumulada_24h_mm: string;
  chuva_sjb_acumulada_48h_mm: string;
  saturacao_solo_sjb_percent: number;
  chuva_resende_acumulada_24h_mm: string;
  vazao_funil_atual_m3s: string;
}

export interface SesmariaDashboard {
  estacao_id: string;
  nome: string;
  rio: string;
  municipio: string;
  nivel_atual_metros: string;
  classificacao_risco: NivelRisco;
  data_hora_leitura: string;
  cota_atencao: string;
  cota_alerta: string;
  cota_emergencia: string;
  telemetria: TelemetriaBacia;
  previsoes: PrevisaoNivelDia[];
  recomendacao_funil: RecomendacaoFunil;
  mensagem_alerta_whatsapp: string;
}

// ── Endpoints ─────────────────────────────────────────────────────────────

export const fetchStatusAtual = () => request<EstacaoStatus[]>('/estacoes/status-atual');

export const fetchHistorico = (estacaoId: string, horas: number) =>
  request<LeituraHistorico[]>(
    `/leituras/historico?estacao_id=${encodeURIComponent(estacaoId)}&horas=${horas}`,
  );

export const fetchOcorrencias = (estacaoId?: string) =>
  request<Ocorrencia[]>(
    `/ocorrencias${estacaoId ? `?estacao_id=${encodeURIComponent(estacaoId)}` : ''}`,
  );

export const criarOcorrencia = (data: OcorrenciaInput) =>
  request<Ocorrencia>('/ocorrencias', { method: 'POST', body: JSON.stringify(data) });

export const atualizarStatusOcorrencia = (id: string, status: StatusOcorrencia) =>
  request<Ocorrencia>(`/ocorrencias/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const fetchSesmariaDashboard = () => request<SesmariaDashboard>('/sesmaria/dashboard-ia');

export const loginApi = (data: { email: string; senha: string }) =>
  request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) });

export const logoutApi = () => request<void>('/auth/logout', { method: 'POST' });

export async function checkHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/health`, {});
    return response.ok;
  } catch {
    return false;
  }
}
