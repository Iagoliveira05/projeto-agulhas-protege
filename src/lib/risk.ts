import type { NivelRisco, StatusOcorrencia } from '@/lib/api';

interface RiskInfo {
  display: string;
  label: string;
  /** Cor sólida, usada em SVG e no ícone/notificação. */
  color: string;
  badgeClass: string;
  textClass: string;
  cardClass: string;
  orientacoes: string[];
}

export const RISK_ORDER: NivelRisco[] = ['NORMAL', 'ATENCAO', 'ALERTA', 'EMERGENCIA'];

export const RISK: Record<NivelRisco, RiskInfo> = {
  NORMAL: {
    display: 'NORMAL',
    label: 'Rio em nível habitual',
    color: '#059669',
    badgeClass: 'bg-risk-normal-light dark:bg-risk-normal-dark/40',
    textClass: 'text-risk-normal-dark dark:text-risk-normal-dark-text',
    cardClass: 'border-risk-normal/40 bg-risk-normal-light/60 dark:bg-risk-normal-dark/20',
    orientacoes: [
      'Nenhuma ação necessária no momento.',
      'Mantenha as notificações ativas para ser avisado de mudanças.',
    ],
  },
  ATENCAO: {
    display: 'ATENÇÃO',
    label: 'Elevação acima do habitual',
    color: '#d97706',
    badgeClass: 'bg-risk-atencao-light dark:bg-risk-atencao-dark/40',
    textClass: 'text-risk-atencao-dark dark:text-risk-atencao-dark-text',
    cardClass: 'border-risk-atencao/40 bg-risk-atencao-light/60 dark:bg-risk-atencao-dark/20',
    orientacoes: [
      'Acompanhe o nível do rio com frequência.',
      'Separe documentos, remédios e itens essenciais em local alto.',
      'Evite áreas próximas às margens do Rio Sesmaria.',
    ],
  },
  ALERTA: {
    display: 'ALERTA',
    label: 'Risco de transbordamento',
    color: '#ea580c',
    badgeClass: 'bg-risk-alerta-light dark:bg-risk-alerta-dark/40',
    textClass: 'text-risk-alerta-dark dark:text-risk-alerta-dark-text',
    cardClass: 'border-risk-alerta/40 bg-risk-alerta-light/60 dark:bg-risk-alerta-dark/20',
    orientacoes: [
      'Prepare-se para deixar o local se morar em área de risco.',
      'Desligue a energia elétrica se a água se aproximar da casa.',
      'Não atravesse ruas ou pontes alagadas.',
      'Em caso de emergência ligue 199 (Defesa Civil) ou 193 (Bombeiros).',
    ],
  },
  EMERGENCIA: {
    display: 'EMERGÊNCIA',
    label: 'Inundação em curso ou iminente',
    color: '#dc2626',
    badgeClass: 'bg-risk-emergencia-light dark:bg-risk-emergencia-dark/40',
    textClass: 'text-risk-emergencia-dark dark:text-risk-emergencia-dark-text',
    cardClass: 'border-risk-emergencia/50 bg-risk-emergencia-light/70 dark:bg-risk-emergencia-dark/30',
    orientacoes: [
      'Saia imediatamente de áreas alagáveis e procure um local alto e seguro.',
      'Siga as orientações da Defesa Civil.',
      'Não tente salvar objetos: priorize a vida.',
      'Ligue 199 (Defesa Civil) ou 193 (Bombeiros).',
    ],
  },
};

export const STATUS_OCORRENCIA: Record<StatusOcorrencia, { label: string; className: string }> = {
  ABERTA: { label: 'Aberta', className: 'bg-risk-alerta-light text-risk-alerta-dark' },
  EM_ANDAMENTO: { label: 'Em andamento', className: 'bg-sky-100 text-brand-dark' },
  ENCERRADA: { label: 'Encerrada', className: 'bg-slate-200 text-slate-700' },
};

export function riskIndex(nivel: NivelRisco): number {
  return RISK_ORDER.indexOf(nivel);
}

export function formatMetros(value: string | number): string {
  return `${Number(value).toFixed(2).replace('.', ',')} m`;
}

export function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativo(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.round(horas / 24)} dia(s)`;
}
