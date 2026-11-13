/**
 * Dados reais da estação hidrológica do CEMADEN no Rio Sesmaria (Resende-RJ).
 *
 * Estação 8799 / código 330420118H, na ponte sobre o Rio Sesmarias (-22.4805, -44.4701).
 * O sensor é um radar que mede a distância até a água a cada hora; o nível é
 * `offset - valor`, mesma conta feita pelo gráfico oficial do CEMADEN.
 * Endpoints públicos usados por https://resources.cemaden.gov.br/graficos/cemaden/hidro/.
 */

const BASE = 'https://resources.cemaden.gov.br/graficos/cemaden/hidro/resources/json';
const IMG_BASE = 'https://resources.cemaden.gov.br/imghidro/';
const TIMEOUT_MS = 10_000;

export const CEMADEN_ESTACAO = {
  id: 8799,
  codigo: '330420118H',
  nome: 'Rio Sesmarias',
  latitude: -22.4805,
  longitude: -44.4701,
};

/** O CEMADEN guarda no máximo ~4 dias de série horária neste endpoint. */
export const CEMADEN_MAX_HORAS = 96;

export interface PontoNivel {
  /** ISO 8601 em UTC. */
  dataHora: string;
  nivel: number;
}

export interface ChuvaEstacao {
  ultimaHora: number;
  ultimas24h: number;
  dataHora: string | null;
}

export interface ImagemEstacao {
  url: string;
  dataHora: string;
}

async function getJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`CEMADEN respondeu ${response.status}.`);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CEMADEN')) throw error;
    throw new Error('Não foi possível acessar os dados do CEMADEN. Verifique a internet.');
  } finally {
    clearTimeout(timer);
  }
}

/** "2026-11-13 00:00:00" (GMT) → "2026-11-13T00:00:00Z" */
function toIso(datahora: string): string {
  return `${datahora.replace(' ', 'T')}Z`;
}

interface MedidaRaw {
  datahora: string;
  valor: string;
  offset: string | null;
}

/** Série horária real do nível do Rio Sesmaria, da mais antiga para a mais recente. */
export async function fetchNivelSesmaria(horas: number): Promise<PontoNivel[]> {
  const pag = Math.min(Math.max(horas, 1), CEMADEN_MAX_HORAS) + 1;
  const dados = await getJson<MedidaRaw[]>(
    `${BASE}/MedidaResource.php?est=${CEMADEN_ESTACAO.id}&sen=20&pag=${pag}`,
  );
  return dados
    .filter((d) => d.valor !== null && d.valor !== '')
    .map((d) => ({
      dataHora: toIso(d.datahora),
      nivel: Math.round(((d.offset === null ? 0 : parseFloat(d.offset)) - parseFloat(d.valor)) * 100) / 100,
    }))
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
}

interface ResumoPluviometroRaw {
  idestacao: number;
  datahoraUltimovalor: string;
  acc1hr: number | string;
  acc24hr: number | string;
}

/**
 * Chuva medida pelo pluviômetro da própria estação. Usa o resumo estadual do CEMADEN,
 * atualizado a cada 10 min (o endpoint horário só fecha a hora depois que ela termina).
 */
export async function fetchChuvaEstacao(): Promise<ChuvaEstacao> {
  const dados = await getJson<ResumoPluviometroRaw[]>(
    'https://resources.cemaden.gov.br/graficos/interativo/getJson2.php?uf=RJ',
  );
  const estacao = dados.find((d) => d.idestacao === CEMADEN_ESTACAO.id);
  // "-" significa sem dado no período.
  const numero = (valor: number | string | undefined) => (typeof valor === 'number' ? valor : 0);
  // "13/11/26 00:50" (GMT) → ISO
  const dataHora = estacao?.datahoraUltimovalor.replace(
    /^(\d{2})\/(\d{2})\/(\d{2}) (\d{2}:\d{2})$/,
    '20$3-$2-$1T$4:00Z',
  );
  return {
    ultimaHora: numero(estacao?.acc1hr),
    ultimas24h: numero(estacao?.acc24hr),
    dataHora: dataHora ?? null,
  };
}

interface ImagemRaw {
  datahora: string;
  path: string;
}

/** Foto mais recente da câmera da estação (uma por hora). */
export async function fetchUltimaImagem(): Promise<ImagemEstacao | null> {
  const dados = await getJson<ImagemRaw[]>(`${BASE}/ImagemResource.php?est=${CEMADEN_ESTACAO.id}&pag=1`);
  const ultima = dados[0];
  if (!ultima) return null;
  const relativo = ultima.path.split('/sgrp/imghidro/')[1];
  return { url: `${IMG_BASE}${relativo}`, dataHora: toIso(ultima.datahora) };
}
