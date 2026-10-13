'use client';

import React, { useState, useEffect } from 'react';
import { useFinance } from '@/lib/store';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Building,
  Plus,
  Shield,
  Key,
  Terminal,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { NeonStatus } from '@/lib/neon';

export function SettingsAndNeonView() {
  const { workspaces, addWorkspace, currentWorkspace } = useFinance();

  const [neonStatus, setNeonStatus] = useState<NeonStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // New company form
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [documentCNPJ, setDocumentCNPJ] = useState('');

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/neon/status');
      const data = await res.json();
      setNeonStatus(data);
    } catch {
      setNeonStatus({
        isConnected: false,
        databaseUrl: 'Erro de requisição',
        isConfigured: false,
        error: 'Não foi possível consultar a rota /api/neon/status',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    addWorkspace({
      name: companyName,
      type: 'CORPORATE',
      legalName: legalName || undefined,
      document: documentCNPJ || undefined,
      defaultCurrency: 'BRL',
      colorTheme: '#6366f1',
    });

    setCompanyName('');
    setLegalName('');
    setDocumentCNPJ('');
    alert('Nova empresa/CNPJ cadastrada com sucesso com contexto 100% isolado!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* SEÇÃO 1: Painel do Neon PostgreSQL */}
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
            onClick={fetchStatus}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Testar Conexão</span>
          </button>
        </div>

        {/* Card de Status do Banco */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-850 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  neonStatus?.isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {neonStatus?.isConnected
                  ? 'Conexão Estabelecida com o Neon DB'
                  : 'Modo Local Ativo com Suporte ao Neon Configurado'}
              </span>
            </div>

            {neonStatus?.latencyMs && (
              <span className="text-[11px] font-mono text-emerald-500 font-semibold">
                Latência: {neonStatus.latencyMs}ms
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">String de Conexão (.env):</span>
              <span className="text-slate-700 dark:text-slate-300 truncate block">
                {neonStatus?.databaseUrl || 'postgresql://neondb_owner:••••••••@ep-sample-pooler...'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Schema & Entidades Mapeadas:</span>
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
            <li>Crie ou selecione seu projeto gratuito no <strong>neon.tech</strong>.</li>
            <li>Copie a string de conexão (Connection String Pooled) no Dashboard do Neon.</li>
            <li>Cole a URL no arquivo <code>.env</code> na variável <code>DATABASE_URL</code> deste projeto.</li>
            <li>
              Execute no terminal do projeto: <code className="bg-slate-800 px-1 py-0.5 rounded text-white">npx prisma db push</code> para criar todas as 11 tabelas instantaneamente!
            </li>
          </ol>
        </div>
      </div>

      {/* SEÇÃO 2: Gestão Multiempresa (Cadastro de novos CNPJs) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-500" />
            <span>Multiempresa & CNPJs Cadastrados</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre novas empresas para manter contas, transações e relatórios 100% isolados
          </p>
        </div>

        {/* Lista de Empresas Cadastradas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className={`p-3.5 rounded-xl border ${
                ws.id === currentWorkspace.id
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {ws.name}
                </span>
                {ws.id === currentWorkspace.id && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-white">
                    ATIVO
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">
                {ws.document || (ws.type === 'PERSONAL' ? 'Pessoa Física' : 'CNPJ')}
              </span>
            </div>
          ))}
        </div>

        {/* Formulário de Cadastro de Nova Empresa */}
        <form onSubmit={handleCreateCompany} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-3 pt-3">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            Cadastrar Nova Empresa / Contexto
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Nome Fantasia</label>
              <input
                type="text"
                required
                placeholder="Ex: Alfa Logística Ltda."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Razão Social</label>
              <input
                type="text"
                placeholder="Ex: Alfa Transportes e Logística Ltda."
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">CNPJ</label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={documentCNPJ}
                onChange={(e) => setDocumentCNPJ(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
            >
              + Adicionar Empresa
            </button>
          </div>
        </form>
      </div>

      {/* SEÇÃO 3: Segurança & Logs de Auditoria */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          <span>Segurança & Logs de Auditoria</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Autenticação de dois fatores (2FA), criptografia em repouso e rastreamento de alterações financeiras
        </p>

        <div className="space-y-2 pt-2">
          {[
            { action: 'TRANSACTION_CREATE', text: 'Lançamento de Pró-Labore Rogério sincronizado com espelho PF', time: 'Hoje às 14:32' },
            { action: 'RECONCILIATION_MATCH', text: 'Extrato OFX Itaú importado com 5 correspondências validadas', time: 'Hoje às 11:15' },
            { action: 'BUDGET_ALERT', text: 'Alerta disparado: Categoria Alimentação atingiu 91% do teto', time: 'Ontem às 19:40' },
          ].map((log, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {log.action}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-sans">{log.text}</span>
              </div>
              <span className="text-slate-400 text-[10px] whitespace-nowrap">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
