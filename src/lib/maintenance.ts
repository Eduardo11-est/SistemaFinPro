export type ManageableViewId =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'payables'
  | 'budgets'
  | 'reports'
  | 'settings';

export interface ManageableViewMeta {
  id: ManageableViewId;
  label: string;
  description: string;
}

export const MANAGEABLE_VIEWS: ManageableViewMeta[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Painel principal com KPIs, gráficos e resumo financeiro',
  },
  {
    id: 'transactions',
    label: 'Transações',
    description: 'Lançamentos, filtros mensais, salário e importação CSV',
  },
  {
    id: 'accounts',
    label: 'Contas & Cartões',
    description: 'Saldos bancários, limites e faturas mês a mês',
  },
  {
    id: 'payables',
    label: 'A Pagar & Receber',
    description: 'Calendário de vencimentos, liquidação e juros',
  },
  {
    id: 'budgets',
    label: 'Orçamento & Metas',
    description: 'Regra 50/30/20, limites por categoria e metas',
  },
  {
    id: 'reports',
    label: 'Relatórios & Fluxo / DRE',
    description: 'Análises consolidadas e demonstrativos financeiros',
  },
  {
    id: 'settings',
    label: 'Cadastros & Config',
    description: 'Salário mensal, categorias e perfis PF / PJ',
  },
];

export const VALID_MANAGEABLE_VIEW_IDS = new Set<string>(
  MANAGEABLE_VIEWS.map((v) => v.id)
);

export interface MaintenanceConfig {
  disabledViews: ManageableViewId[];
  message: string;
  updatedAt?: string;
}

export const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  disabledViews: [],
  message: '',
};

export const MAINTENANCE_AUDIT_ACTION = '__MAINTENANCE_CONFIG__';
export const MAINTENANCE_AUDIT_ENTITY = 'SYSTEM_CONFIG';

export function getViewLabel(viewId: string): string {
  return MANAGEABLE_VIEWS.find((v) => v.id === viewId)?.label || viewId;
}

export function sanitizeMaintenanceConfig(raw: unknown): MaintenanceConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_MAINTENANCE_CONFIG;
  }
  const obj = raw as Record<string, unknown>;
  const disabledViews = Array.isArray(obj.disabledViews)
    ? Array.from(
        new Set(
          obj.disabledViews.filter(
            (v): v is ManageableViewId =>
              typeof v === 'string' && VALID_MANAGEABLE_VIEW_IDS.has(v)
          )
        )
      )
    : [];

  const message =
    typeof obj.message === 'string' ? obj.message.trim().slice(0, 500) : '';
  const updatedAt =
    typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined;

  return { disabledViews, message, updatedAt };
}

export function formatDefaultMaintenanceMessage(disabledViews: ManageableViewId[]): string {
  if (disabledViews.length === 0) return '';
  const labels = disabledViews.map(getViewLabel);
  if (labels.length === 1) {
    return `A tela ${labels[0]} está temporariamente indisponível para manutenção. Estamos trabalhando para restabelecê-la em breve.`;
  }
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1).join(', ');
  return `As seguintes telas estão temporariamente indisponíveis para manutenção: ${rest} e ${last}. Estamos trabalhando para restabelecê-las em breve.`;
}
