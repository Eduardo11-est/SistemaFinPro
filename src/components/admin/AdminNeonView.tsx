'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useFinance } from '@/lib/store';
import {
  Database,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Building2,
  Wallet,
  ArrowLeftRight,
  Lock,
} from 'lucide-react';
import { NeonStatus } from '@/lib/neon';

interface AdminOverviewData {
  totals: {
    users: number;
    workspaces: number;
    accounts: number;
    transactions: number;
  };
  users: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    workspacesCount: number;
    isAdmin: boolean;
  }[];
}

export function AdminNeonView() {
  const { currentUser } = useFinance();

  const [neonStatus, setNeonStatus] = useState<NeonStatus | null>(null);
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAdminData = useCallback(async () => {
    if (!currentUser?.id || !currentUser?.isAdmin) return;
    setIsLoading(true);
    try {
      const headers = { 'x-user-id': currentUser.id };
      const [statusRes, overviewRes] = await Promise.all([
        fetch('/api/neon/status', { headers }),
        fetch('/api/admin/overview', { headers }),
      ]);

      if (statusRes.ok) {
        setNeonStatus(await statusRes.json());
      } else {
        const err = await statusRes.json().catch(() => ({}));
        setNeonStatus({
          isConnected: false,
          databaseUrl: 'Acesso negado',
          isConfigured: false,
          error: err.error || 'Acesso restrito a contas de Administrador.',
        });
      }

      if (overviewRes.ok) {
        setOverview(await overviewRes.json());
      }
    } catch {
      setNeonStatus({
        isConnected: false,
        databaseUrl: 'Erro de requisição',
        isConfigured: false,
        error: 'Não foi possível consultar o status do Neon DB.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, currentUser?.isAdmin]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  if (!currentUser?.isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/30 shadow-sm text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Acesso Restrito — Somente Administrador
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Esta área técnica de banco de dados e infraestrutura é visível apenas para contas
          configuradas como Administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho Administrativo */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Painel Administrativo & Neon DB
              </h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                ADM
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoramento do banco Neon PostgreSQL, contas cadastradas e camadas de segurança
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAdminData}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Status</span>
        </button>
      </div>

      {/* SEÇÃO 1: Métricas Globais do Sistema */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Usuários Cadastrados</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {overview.totals.users}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Perfis / Empresas</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {overview.totals.workspaces}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Contas & Cartões</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {overview.totals.accounts}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Transações no Banco</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {overview.totals.transactions}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 2: Painel do Neon PostgreSQL Serverless */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Neon PostgreSQL Serverless</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Prisma ORM v6
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Banco de dados relacional em nuvem com auto-scaling e connection pooler
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchAdminData}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Testar Conexão</span>
          </button>
        </div>

        {/* Card de Status do Banco */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  neonStatus?.isConnected
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {neonStatus?.isConnected
                  ? 'Conexão Estabelecida com o Neon DB'
                  : 'Modo Local Ativo com Suporte ao Neon Configurado'}
              </span>
            </div>

            {neonStatus?.latencyMs !== undefined && (
              <span className="text-[11px] font-mono text-emerald-500 font-semibold">
                Latência: {neonStatus.latencyMs}ms
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">
                String de Conexão (.env):
              </span>
              <span className="text-slate-700 dark:text-slate-300 truncate block">
                {neonStatus?.databaseUrl ||
                  'postgresql://neondb_owner:••••••••@ep-sample-pooler...'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">
                Schema & Entidades Mapeadas:
              </span>
              <span className="text-slate-700 dark:text-slate-300 block font-sans font-semibold">
                11 Entidades (Users, Workspaces, Accounts, Transactions, etc.)
              </span>
            </div>
          </div>

          {neonStatus?.error && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <strong>Aviso de Configuração:</strong> {neonStatus.error}
              </div>
            </div>
          )}
        </div>

        {/* Guia Rápido de Configuração do Neon */}
        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-2">
          <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Como plugar sua base de produção no Neon (neon.tech)
            </span>
            <a
              href="https://neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] underline flex items-center gap-1 text-indigo-500 hover:text-indigo-400"
            >
              <span>Abrir Neon Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
            <li>
              Crie ou selecione seu projeto gratuito no <strong>neon.tech</strong>.
            </li>
            <li>Copie a string de conexão (Connection String Pooled) no Dashboard do Neon.</li>
            <li>
              Cole a URL no arquivo <code>.env</code> (ou nas variáveis do Render) em{' '}
              <code>DATABASE_URL</code>.
            </li>
            <li>
              Execute:{' '}
              <code className="bg-slate-800 px-1 py-0.5 rounded text-white">
                npx prisma db push
              </code>{' '}
              para sincronizar as 11 tabelas.
            </li>
          </ol>
        </div>
      </div>

      {/* SEÇÃO 3: Contas de Usuários Cadastradas */}
      {overview && overview.users.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <span>Contas Cadastradas ({overview.users.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Para conceder ou remover acesso de Administrador, configure a variável{' '}
              <code className="font-mono">ADMIN_EMAILS</code> no ambiente.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">E-mail</th>
                  <th className="py-2.5 px-3">Perfil</th>
                  <th className="py-2.5 px-3 text-center">Workspaces</th>
                  <th className="py-2.5 px-3 text-right">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {overview.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {u.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                      {u.email}
                    </td>
                    <td className="py-2.5 px-3">
                      {u.isAdmin ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          ADM
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Usuário
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                      {u.workspacesCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEÇÃO 4: Segurança & Logs de Auditoria */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span>Camadas de Segurança Ativas & Auditoria</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Criptografia PBKDF2-SHA512, cookies de sessão assinados (HttpOnly), Rate Limiting e
            isolamento estrito de contexto
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
              Criptografia PBKDF2-SHA512
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              100.000 iterações com salt aleatório por senha e comparação timing-safe
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
              Sessão Assinada & Rate Limit
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Token HMAC em Cookie HttpOnly e proteção contra força bruta por IP
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
              Headers & Sanitização XSS
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              HSTS, X-Frame-Options DENY, nosniff e higienização de inputs nas APIs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
