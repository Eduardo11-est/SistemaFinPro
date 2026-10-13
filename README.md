# 💎 FinPro | Sistema Integrado de Controle Financeiro (Pessoal & Corporativo)

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Neon Database](https://img.shields.io/badge/Neon-PostgreSQL_Serverless-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

O **FinPro** é uma plataforma moderna e completa de **Controle Financeiro Unificado**, projetada para resolver a dor de profissionais, empreendedores e empresas que precisam gerenciar simultaneamente a vida financeira pessoal e múltiplas operações corporativas (múltiplos CNPJs), superando plataformas tradicionais de mercado (como Procfy.io, Organizze e Conta Azul).

---

## 🎯 1. A "Regra de Ouro": Separação Rigorosa de Contextos

- **Isolamento Total:** Lançamentos, contas bancárias, cartões, relatórios, orçamentos e DREs do perfil **"Pessoal"** **NUNCA** se misturam com as operações das empresas corporativas (**"TechCorp Inovações Ltda."** e **"Studio Criativo Digital"**).
- **Alternância Instantânea:** O seletor de topo permite trocar de contexto em 1 clique, com recalculo imediato de todos os balanços e indicadores.
- **Operações Inter-Contexto Controladas:** Transações explícitas de **Pró-Labore**, **Distribuição de Lucros** ou **Aporte do Sócio** contam com criação automática de transação espelhada com referência mútua contábil (`linkedTransactionId`), registrando a saída na PJ e a entrada na PF sem violar os balanços contábeis.

---

## 🧩 2. Módulos do Sistema e Funcionalidades

### 📊 Módulo 1: Dashboard Principal e KPIs em Tempo Real
- **Indicadores do Topo:** Saldo Consolidado do contexto ativo, Entradas do Mês, Saídas do Mês, Resultado Líquido e Projeção para os próximos 30 dias.
- **Gráficos Dinâmicos:** Fluxo de caixa histórico e realizado (barras e linha) e gráfico de rosca (Donut) com distribuição percentual por categoria.
- **Alerta Proativo de Rombo no Caixa:** Identifica e alerta antecipadamente caso a projeção dos próximos 30 dias fique negativa com base nos compromissos agendados.
- **Próximos Vencimentos & Extrato Recente:** Acesso rápido a contas a vencer e últimas movimentações.

### 💳 Módulo 2: Gestão Multiconta e Multiempresa
- **Tipos de Contas:** Conta Corrente, Conta Poupança, Cartões de Crédito, Carteira Física, Contas de Investimento e Gateways de Pagamento (Stripe, Asaas, Mercado Pago).
- **Cartões de Crédito:** Controle de limite total, percentual utilizado, fatura aberta e dias de corte/vencimento.
- **Multimoeda:** Suporte a movimentações em **BRL (R$)**, **USD ($)** e **EUR (€)** com conversão automática de cotação.

### 📝 Módulo 3: Gestão de Transações
- **Tipos de Lançamento:** Receitas, Despesas e Transferências entre contas.
- **Parcelamentos e Recorrências:** Divisão em parcelas (ex: 1/10) e repetição automática (mensal, semanal, anual).
- **Centros de Custo e Projetos (PJ):** Alocação de receitas e despesas por projeto ou departamento para apuração individual de margens de lucro.
- **Tags e Comprovantes:** Tags personalizáveis e suporte a anexos (PDF, PNG, JPG).
- **Atalho Rápido:** Pressione a tecla **`N`** em qualquer tela para abrir a criação de transação.
- **Exportação:** Exportação instantânea do extrato filtrado em arquivo **CSV**.

### 📅 Módulo 4: Contas a Pagar e a Receber (Inadimplência)
- **Calendário Financeiro:** Visão clara de vencimentos futuros.
- **Gestão de Inadimplência:** Indicadores visuais de títulos em atraso com cálculo automático e dinâmico de **multa percentual** e **juros diários**.
- **Liquidação em 1 Clique:** Botão *"Baixar Título"* que efetiva a liquidação e debita/credita na conta selecionada.

### 🏦 Módulo 5: Conciliação Bancária Inteligente
- **Formatos Aceitos:** Importação de extratos bancários nos formatos **OFX**, **CSV** e **PDF**.
- **Correspondência Preditiva:** Algoritmo que detecta semelhança de valores e descrições com lançamentos pendentes.
- **Regras Automáticas:** Criação de regras de classificação automática por palavras-chave (ex: *"AWS"*, *"UBER"*, *"SHELL"*, *"ASAAS"*).

### 🎯 Módulo 6: Planejamento, Orçamento e Metas
- **Orçamento por Categoria (Budgeting):** Tetos mensais de gastos com indicadores e alertas visuais automáticos:
  - 🟢 **Normal:** Até 79% do limite.
  - 🟡 **Atenção:** Ao atingir 80% do limite.
  - 🔴 **Estourado:** Ao atingir ou ultrapassar 100% do limite.
- **Metas Pessoais:** Acompanhamento de objetivos (Reserva de Emergência, Viagem, Compra de Ativos) com barra de progresso percentual e modal para aportes adicionais.
- **Projeção de Caixa PJ:** Previsão estratégica para **30, 60, 90 dias e 12 meses**.

### 📈 Módulo 7: DRE Gerencial & Relatórios Contábeis
- **DRE Gerencial Completa:**
  - Alternância entre regime de **Competência** e regime de **Caixa**.
  - Receita Operacional Bruta
  - (-) Deduções e Impostos (Simples Nacional, DAS, ISS)
  - (=) Receita Líquida
  - (-) Custos Operacionais
  - (=) Lucro Bruto / Margem de Contribuição
  - (-) Despesas com Pessoal, TI/Cloud e Marketing/Vendas
  - (=) **EBITDA (LAJIDA)** com margem percentual
  - (=) **Lucro Líquido do Exercício**
- **Análise de Pareto (Regra 80/20):** Ranking ordenado dos maiores ofensores de custo e percentual acumulado.
- **Exportação e Impressão:** Botão de impressão formatada e geração de PDF.

### 🐘 Módulo 8: Banco de Dados Neon PostgreSQL Serverless
- Conectado diretamente à nuvem **Neon PostgreSQL** via pooler de alta performance em São Paulo (`sa-east-1`).
- Painel de controle no sistema com medição de latência em tempo real (~65ms) e contagem de tabelas do schema Prisma.

---

## 🛠️ 3. Estrutura do Projeto

```
SistemaControleFinanceiro/
├── prisma/
│   └── schema.prisma        # Modelagem completa do PostgreSQL (11 entidades)
├── scripts/
│   └── seed.mjs             # Script de população do banco de dados Neon
├── src/
│   ├── app/
│   │   ├── api/             # Rotas REST conectadas ao Prisma / Neon
│   │   │   ├── accounts/
│   │   │   ├── neon/status/
│   │   │   ├── payables/
│   │   │   ├── transactions/
│   │   │   └── workspaces/
│   │   ├── globals.css      # Design system, dark mode e tokens Tailwind v4
│   │   ├── layout.tsx       # Root layout com context provider
│   │   └── page.tsx         # Dashboard e views interativas
│   ├── components/
│   │   ├── accounts/        # Gestão multiconta e cartões
│   │   ├── budgets/         # Orçamento 80%/100% e metas
│   │   ├── dashboard/       # KPIs, gráficos Recharts e alertas
│   │   ├── layout/          # Navbar, context switcher e sidebar
│   │   ├── payables/        # Títulos a pagar/receber e inadimplência
│   │   ├── reconciliation/  # Conciliação bancária OFX/CSV
│   │   ├── reports/         # DRE Gerencial e Pareto 80/20
│   │   ├── settings/        # Painel do banco Neon e multiempresa
│   │   └── transactions/    # Tabela de transações e modal
│   ├── lib/
│   │   ├── neon.ts          # Utilitários de conectividade Neon
│   │   ├── prisma.ts        # Cliente singleton do Prisma
│   │   ├── store.tsx        # Gerenciador de estado reativo
│   │   └── mock-data.ts     # Dados estruturados de base
│   └── types/
│       └── finance.ts       # Tipagens TypeScript completas
├── .env.example             # Exemplo de configuração de variáveis
├── package.json
├── render.yaml              # Blueprint para deploy automático no Render
└── tsconfig.json
```

---

## 💻 4. Como Executar Localmente

### Pré-requisitos
- **Node.js** v20 ou superior (recomendado v22 ou v24)
- **npm** v10 ou superior
- **Git**

### Passo a Passo

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/Eduardo11-est/SistemaFinPro.git
   cd SistemaFinPro
   ```

2. **Instalar Dependências:**
   ```bash
   npm install
   ```

3. **Configurar as Variáveis de Ambiente:**
   Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   Abra o `.env` e configure sua string de conexão do Neon PostgreSQL:
   ```env
   DATABASE_URL="postgresql://neondb_owner:SENHA@ep-sparkling-heart-b65vca90-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

4. **Sincronizar o Banco de Dados com o Prisma:**
   ```bash
   # Gera o cliente Prisma com os tipos
   npx prisma generate

   # Aplica o schema no banco Neon
   npx prisma db push
   ```

5. **Popular com os Dados Iniciais (Seed):**
   ```bash
   node scripts/seed.mjs
   ```

6. **Iniciar o Servidor Local:**
   ```bash
   npm run dev
   ```
   Acesse **http://localhost:3000** no navegador.

---

## 🚀 5. Como Fazer o Deploy no Render (`render.com`)

O projeto está otimizado para deploy simples e rápido no **Render**.

### Opção A: Deploy Manual como Web Service

1. Acesse o seu painel em [render.com](https://dashboard.render.com/) e clique em **New +** > **Web Service**.
2. Conecte o repositório GitHub: `https://github.com/Eduardo11-est/SistemaFinPro.git`.
3. Preencha as configurações do serviço:
   - **Name:** `finpro-sistema-financeiro` (ou o nome que preferir)
   - **Region:** `Frankfurt` ou `Ohio` (ou a mais próxima)
   - **Branch:** `main`
   - **Root Directory:** deixe em branco
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command:**
     ```bash
     npm run start
     ```
   - **Plan Type:** `Free` (ou superior)

4. **Adicionar as Variáveis de Ambiente (Environment Variables):**
   Clique na aba **Environment** e adicione:
   | Key | Value |
   | :--- | :--- |
   | `DATABASE_URL` | `postgresql://neondb_owner:npg_4uDwOySHdG7M@ep-sparkling-heart-b65vca90-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require` |
   | `NODE_ENV` | `production` |
   | `NEXT_PUBLIC_APP_NAME` | `FinPro - Controle Financeiro Unificado` |
   | `NEXT_PUBLIC_DEFAULT_CURRENCY` | `BRL` |

5. Clique em **Deploy Web Service**. Em poucos minutos seu sistema estará no ar com HTTPS gratuito!

---

### Opção B: Deploy via Blueprint (`render.yaml`)

Como o repositório já inclui o arquivo [render.yaml](render.yaml):
1. No Render, clique em **New +** > **Blueprint**.
2. Selecione o repositório `SistemaFinPro`.
3. O Render detectará automaticamente as configurações de build e start.
4. Quando solicitado o valor de `DATABASE_URL`, cole a sua string de conexão do Neon.
5. Clique em **Apply** e o deploy será iniciado automaticamente.

---

## ⌨️ 6. Atalhos de Teclado e Dicas de Uso

| Ação | Como Utilizar |
| :--- | :--- |
| **+ Nova Transação** | Pressione a tecla **`N`** em qualquer tela. |
| **Trocar de Contexto** | Clique no botão no canto superior esquerdo com o nome do Workspace ativo. |
| **Mudar Tema** | Clique no ícone de Sol/Lua no topo direito para alternar entre Dark e Light mode. |
| **Trocar Moeda** | Clique no seletor de moeda no topo para ver os valores convertidos em BRL, USD ou EUR. |
| **Prisma Studio (Local)** | Execute `npm run db:studio` no terminal para visualizar e editar o banco graficamente. |

---

## 📄 Licença

Projeto desenvolvido sob a licença MIT. Sinta-se livre para usar e customizar.
