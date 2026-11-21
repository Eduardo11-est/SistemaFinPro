export type ManageableViewId =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'payables'
  | 'budgets'
  | 'investments'
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
    id: 'investments',
    label: 'Investimentos',
    description: 'Carteira de ativos, alocação, rentabilidade e renda passiva',
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
  initializedDefaults?: string[];
}

export const DEFAULT_LOCKED_NEW_VIEWS: ManageableViewId[] = ['investments'];

export const DEFAULT_NEW_VIEW_MAINTENANCE_MESSAGE =
  'Nova tela em desenvolvimento — a tela Investimentos estará disponível em breve.';

export const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  disabledViews: [...DEFAULT_LOCKED_NEW_VIEWS],
  message: DEFAULT_NEW_VIEW_MAINTENANCE_MESSAGE,
  initializedDefaults: [...DEFAULT_LOCKED_NEW_VIEWS],
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
  const initializedDefaults = Array.isArray(obj.initializedDefaults)
    ? obj.initializedDefaults.filter((v): v is string => typeof v === 'string')
    : undefined;

  return { disabledViews, message, updatedAt, initializedDefaults };
}

/**
 * Aplica bloqueios padrão para novas telas em desenvolvimento caso o ADM ainda não tenha
 * configurado explicitamente aquela tela no banco.
 */
export function applyDefaultNewViewLocks(config: MaintenanceConfig): MaintenanceConfig {
  const initialized = new Set(config.initializedDefaults || []);
  const pendingDefaults = DEFAULT_LOCKED_NEW_VIEWS.filter((v) => !initialized.has(v));
  if (pendingDefaults.length === 0) {
    return config;
  }

  const mergedDisabled = Array.from(
    new Set([...config.disabledViews, ...pendingDefaults])
  );
  const mergedMessage = config.message || DEFAULT_NEW_VIEW_MAINTENANCE_MESSAGE;

  return {
    ...config,
    disabledViews: mergedDisabled,
    message: mergedMessage,
    initializedDefaults: Array.from(new Set([...initialized, ...pendingDefaults])),
  };
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
