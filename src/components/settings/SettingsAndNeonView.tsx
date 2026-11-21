'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/lib/store';
import {
  CheckCircle2,
  Building2,
  User,
  Plus,
  Wallet,
  Tag,
  Trash2,
  Settings,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { Workspace, WorkspaceType } from '@/types/finance';

function parseBRLNumber(raw: string): number {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return 0;
  if (trimmed.includes(',')) {
    return parseFloat(trimmed.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (/^-?\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    return parseFloat(trimmed.replace(/\./g, '')) || 0;
  }
  return parseFloat(trimmed) || 0;
}

export function SettingsAndNeonView() {
  const {
    workspaces,
    addWorkspace,
    updateWorkspace,
    currentWorkspace,
    setCurrentWorkspaceId,
    monthlySalary,
    setMonthlySalary,
    formatMoney,
    categories,
    addCategory,
    deleteCategory,
  } = useFinance();

  // Salário / Renda Mensal form
  const [salaryStr, setSalaryStr] = useState('');
  const [salarySavedFeedback, setSalarySavedFeedback] = useState(false);

  // Nova Categoria form & filtro
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newCatColor, setNewCatColor] = useState('#10b981');
  const [catFilter, setCatFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  // Novo Cadastro de Perfil (PF ou Empresa PJ)
  const [newProfileType, setNewProfileType] = useState<WorkspaceType>('CORPORATE');
  const [profileName, setProfileName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [documentStr, setDocumentStr] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  // Edição rápida de perfil existente
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editWsName, setEditWsName] = useState('');
  const [editWsLegalName, setEditWsLegalName] = useState('');
  const [editWsDocument, setEditWsDocument] = useState('');

  useEffect(() => {
    setSalaryStr(monthlySalary > 0 ? String(monthlySalary).replace('.', ',') : '');
  }, [monthlySalary, currentWorkspace.id]);

  const filteredCategories = useMemo(() => {
    if (catFilter === 'ALL') return categories;
    return categories.filter((c) => c.type === catFilter);
  }, [categories, catFilter]);

  const handleSaveSalarySettings = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.max(0, parseBRLNumber(salaryStr));
    setMonthlySalary(val);
    setSalarySavedFeedback(true);
    setTimeout(() => setSalarySavedFeedback(false), 2500);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await addCategory({
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: 'Tag',
      workspaceId: currentWorkspace.id,
    });
    setNewCatName('');
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    const isPersonal = newProfileType === 'PERSONAL';
    addWorkspace({
      name: profileName.trim(),
      type: newProfileType,
      legalName: !isPersonal && legalName.trim() ? legalName.trim() : undefined,
      document: documentStr.trim() || undefined,
      defaultCurrency: 'BRL',
      colorTheme: isPersonal ? '#10b981' : '#6366f1',
    });

    setProfileName('');
    setLegalName('');
    setDocumentStr('');
    setProfileFeedback(
      isPersonal
        ? 'Perfil de Pessoa Física (PF) cadastrado e ativado com sucesso!'
        : 'Empresa (PJ) cadastrada e ativada com contexto 100% isolado!'
    );
    setTimeout(() => setProfileFeedback(null), 3500);
  };

  const startEditWorkspace = (ws: Workspace) => {
    setEditingWsId(ws.id);
    setEditWsName(ws.name);
    setEditWsLegalName(ws.legalName || '');
    setEditWsDocument(ws.document || '');
  };

  const handleSaveEditWorkspace = (e: React.FormEvent, ws: Workspace) => {
    e.preventDefault();
    if (!editWsName.trim()) return;
    updateWorkspace(ws.id, {
      name: editWsName.trim(),
      legalName: ws.type === 'CORPORATE' ? editWsLegalName.trim() || undefined : undefined,
      document: editWsDocument.trim() || undefined,
    });
    setEditingWsId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho da Tela de Controle de Cadastros */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Controle de Cadastros & Configurações
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gerencie sua renda mensal, categorias financeiras e perfis de Pessoa Física (PF) e Empresas (PJ)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={`px-3 py-1.5 rounded-xl font-semibold border flex items-center gap-1.5 ${
              currentWorkspace.type === 'PERSONAL'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
            }`}
          >
            {currentWorkspace.type === 'PERSONAL' ? (
              <User className="w-3.5 h-3.5" />
            ) : (
              <Building2 className="w-3.5 h-3.5" />
            )}
            <span>Ativo: {currentWorkspace.name}</span>
          </span>
        </div>
      </div>

      {/* SEÇÃO 1: Configuração de Salário / Renda Mensal & Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Configuração de Salário / Renda Mensal */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Salário / Renda Base Mensal
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Base de cálculo para o saldo restante e orçamento em{' '}
                  <strong>{currentWorkspace.name}</strong>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Salário / Renda Configurada:</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {monthlySalary > 0 ? formatMoney(monthlySalary) : 'Não definido'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveSalarySettings} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor do Salário / Renda Mensal (R$)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ex: 5.000,00"
                  value={salaryStr}
                  onChange={(e) => setSalaryStr(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  Salvar Salário
                </button>
              </div>
            </div>

            {salarySavedFeedback && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salário mensal atualizado com sucesso!</span>
              </p>
            )}
          </form>
        </div>

        {/* Card: Gestão de Categorias Ativas */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Categorias ({categories.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Disponíveis ao criar ou editar transações neste perfil
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
              {(['ALL', 'EXPENSE', 'INCOME'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCatFilter(f)}
                  className={`px-2 py-1 rounded-md transition-all ${
                    catFilter === f
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  {f === 'ALL' ? 'Todas' : f === 'EXPENSE' ? 'Despesas' : 'Receitas'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateCategory} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Nova categoria..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as 'EXPENSE' | 'INCOME')}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            >
              <option value="EXPENSE">Despesa (-)</option>
              <option value="INCOME">Receita (+)</option>
            </select>
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
              title="Cor da Categoria"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </form>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 pr-1">
            {filteredCategories.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Nenhuma categoria encontrada neste filtro.
              </p>
            ) : (
              filteredCategories.map((cat) => (
                <div key={cat.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#10b981' }}
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {cat.name}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                        cat.type === 'INCOME'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {cat.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja remover a categoria "${cat.name}"?`)) {
                        deleteCategory(cat.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                    title="Remover Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: Cadastros de Perfis (Pessoa Física PF & Empresas PJ) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />
            <span>Cadastros de Pessoa Física (PF) & Empresas (PJ)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Crie e gerencie perfis separados para manter contas, transações, salários e relatórios 100% isolados
          </p>
        </div>

        {/* Lista de Perfis PF e PJ Cadastrados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {workspaces.map((ws) => {
            const isWsPersonal = ws.type === 'PERSONAL';
            const isActive = ws.id === currentWorkspace.id;
            const isEditingThis = editingWsId === ws.id;

            return (
              <div
                key={ws.id}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                {isEditingThis ? (
                  <form
                    onSubmit={(e) => handleSaveEditWorkspace(e, ws)}
                    className="space-y-2 text-xs"
                  >
                    <input
                      type="text"
                      required
                      value={editWsName}
                      onChange={(e) => setEditWsName(e.target.value)}
                      placeholder={isWsPersonal ? 'Nome do perfil' : 'Nome fantasia'}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                    {!isWsPersonal && (
                      <input
                        type="text"
                        value={editWsLegalName}
                        onChange={(e) => setEditWsLegalName(e.target.value)}
                        placeholder="Razão Social (opcional)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    )}
                    <input
                      type="text"
                      value={editWsDocument}
                      onChange={(e) => setEditWsDocument(e.target.value)}
                      placeholder={isWsPersonal ? 'CPF (opcional)' : 'CNPJ (opcional)'}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingWsId(null)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isWsPersonal
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-indigo-500/10 text-indigo-500'
                          }`}
                        >
                          {isWsPersonal ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block truncate">
                            {ws.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {ws.document || (isWsPersonal ? 'Pessoa Física (PF)' : 'Empresa (PJ)')}
                          </span>
                        </div>
                      </div>

                      {isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white shrink-0">
                          ATIVO
                        </span>
                      )}
                    </div>

                    {ws.legalName && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {ws.legalName}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCurrentWorkspaceId(ws.id)}
                        disabled={isActive}
                        className={`text-[11px] font-semibold transition-colors ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400 cursor-default'
                            : 'text-indigo-600 dark:text-indigo-400 hover:underline'
                        }`}
                      >
                        {isActive ? 'Contexto em uso' : 'Ativar perfil →'}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditWorkspace(ws)}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                        title="Editar dados do cadastro"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Formulário de Novo Cadastro (PF ou Empresa PJ) */}
        <form
          onSubmit={handleCreateProfile}
          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Novo Cadastro de Perfil
            </span>

            {/* Seletor PF vs PJ */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 text-xs">
              <button
                type="button"
                onClick={() => setNewProfileType('PERSONAL')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  newProfileType === 'PERSONAL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Pessoa Física (PF)</span>
              </button>
              <button
                type="button"
                onClick={() => setNewProfileType('CORPORATE')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  newProfileType === 'CORPORATE'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Empresa (PJ)</span>
              </button>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 ${
              newProfileType === 'PERSONAL' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
            } gap-3`}
          >
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                {newProfileType === 'PERSONAL' ? 'Nome do Perfil (PF)' : 'Nome Fantasia'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  newProfileType === 'PERSONAL'
                    ? 'Ex: Pessoal, Família, Casal...'
                    : 'Ex: Alfa Logística Ltda.'
                }
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {newProfileType === 'CORPORATE' && (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Razão Social</label>
                <input
                  type="text"
                  placeholder="Ex: Alfa Transportes e Logística Ltda."
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                {newProfileType === 'PERSONAL' ? 'CPF (opcional)' : 'CNPJ (opcional)'}
              </label>
              <input
                type="text"
                placeholder={
                  newProfileType === 'PERSONAL' ? '000.000.000-00' : '00.000.000/0001-00'
                }
                value={documentStr}
                onChange={(e) => setDocumentStr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {profileFeedback ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{profileFeedback}</span>
              </p>
            ) : (
              <span />
            )}

            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                newProfileType === 'PERSONAL'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {newProfileType === 'PERSONAL' ? 'Cadastrar Pessoa Física' : 'Cadastrar Empresa'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
