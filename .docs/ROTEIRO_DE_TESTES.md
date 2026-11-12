# Roteiro Completo de Testes — Sistema de Controle Financeiro (FinPro)

Este documento reúne o **passo a passo completo** e os **dados de validação** para você testar todos os módulos do sistema (incluindo o novo **Módulo de Cartão de Crédito com Projeção de Parcelas** e a **Regra de Orçamento 50/30/20**).

> **Dica Rápida (Importação em 1 Clique):**
> Além do teste manual abaixo, deixamos pronto o arquivo [`.docs/massa_teste_transacoes.csv`](./massa_teste_transacoes.csv). Basta ir na aba **Transações → Importar CSV** e selecionar esse arquivo para popular automaticamente receitas, despesas 50/30/20 e compras parceladas no cartão!

---

## 1. Teste de Autenticação e Isolamento Multi-Cliente
1. Acesse a tela inicial e clique em **Criar Conta** (ou faça login com sua conta).
2. Cadastre um usuário de teste:
   - **Nome:** `Teste FinPro`
   - **E-mail:** `teste@finpro.com`
   - **Senha:** `Teste@123`
3. **Resultado esperado:**
   - O sistema cria automaticamente o seu **Espaço Pessoal**, a **Conta Corrente Principal** e as **Categorias Padrão**, salvando tudo no banco **Neon PostgreSQL**.

---

## 2. Teste de Configuração de Salário / Renda Base (Regra 50/30/20)
1. Vá no menu lateral em **Transações** (ou **Neon DB & Config**).
2. No card **"Comprometimento do Salário / Renda no Mês"**, clique em **Definir Salário Mensal** (ou **Editar Salário**).
3. Informe: `10000,00` (R$ 10.000,00) e salve.
4. **Resultado esperado:**
   - O salário base passa a ser **R$ 10.000,00** (persistido no Neon DB).
   - Na aba **Orçamento & Metas**, a **Regra 50/30/20** calculará automaticamente os tetos ideais:
     - **50% Necessidades Essenciais:** Meta ideal de **R$ 5.000,00**
     - **30% Desejos & Estilo de Vida:** Meta ideal de **R$ 3.000,00**
     - **20% Metas & Investimentos:** Meta ideal de **R$ 2.000,00**

---

## 3. Teste de Gestão de Cartões de Crédito e Limite Dinâmico
1. Vá no menu lateral em **Contas & Cartões**.
2. Clique no botão roxo **Novo Cartão** e preencha:
   - **Nome:** `Cartão Nubank Ultravioleta`
   - **Tipo:** `Cartão de Crédito`
   - **Instituição:** `Nubank`
   - **Limite Total:** `10000` (R$ 10.000,00)
   - **Dia de Fechamento:** `28`
   - **Dia de Vencimento:** `5`
3. Clique em **Cadastrar**.
4. **Resultado esperado:**
   - O cartão aparece na listagem com **Limite Total: R$ 10.000,00**, **Limite Disponível: R$ 10.000,00** e ciclo `Fecha dia 28 • Vence dia 5`.

---

## 4. Teste do Motor de Projeção de Parcelas (Antes vs. Depois do Fechamento)

### Cenário 4A — Compra Parcelada ANTES do Dia de Fechamento (Dia 12 < Dia 28)
1. Pressione a tecla **`N`** (ou clique em **+ Nova Transação**).
2. Preencha:
   - **Tipo:** `Despesa`
   - **Valor:** `3600,00`
   - **Descrição:** `Notebook Ultrawide`
   - **Data do Lançamento:** `12/11/2026` (antes do fechamento dia 28)
   - **Conta / Carteira:** `Cartão Nubank Ultravioleta`
   - **Categoria:** `Lazer & Restaurantes`
   - **Pilar 50/30/20:** `Desejos (30%)`
   - **Marque:** `Compra Parcelada (ex: 1/12)?` → **Nº de parcelas:** `6`
3. **Verifique o Preview Roxo no Modal antes de salvar:**
   - Deve exibir: `6x de R$ 600,00`
   - `1ª parcela cai na fatura 2026-12 (venc. 05/12/2026) — Última (6/6) em 2027-05` *(pois a fatura que fecha em 28/11 vence em 05/12)*.
4. Clique em **Salvar Lançamento**.

### Cenário 4B — Compra Parcelada APÓS o Dia de Fechamento ("Melhor Dia de Compra" — Dia 29 >= Dia 28)
1. Abra novamente **+ Nova Transação (`N`)**.
2. Preencha:
   - **Tipo:** `Despesa`
   - **Valor:** `2400,00`
   - **Descrição:** `Passagem Aérea Férias`
   - **Data do Lançamento:** `29/11/2026` (após o dia 28 de fechamento!)
   - **Conta / Carteira:** `Cartão Nubank Ultravioleta`
   - **Pilar 50/30/20:** `Desejos (30%)`
   - **Marque:** `Compra Parcelada` → **Nº de parcelas:** `4`
3. **Verifique o Preview Roxo no Modal:**
   - Como a compra foi feita no dia 29 (após o fechamento do dia 28), o motor joga a **1ª parcela para a fatura seguinte (`2027-01`, vencimento `05/01/2027`)** e a última (`4/4`) para `2027-04`!
4. Clique em **Salvar Lançamento**.

---

## 5. Teste da Visão de Faturas Mês a Mês e Liquidação de Fatura
1. Vá em **Contas & Cartões**.
2. Observe o card do **Cartão Nubank Ultravioleta**:
   - **Comprometido (Fatura + Parcelas):** `R$ 6.000,00` (R$ 3.600 + R$ 2.400)
   - **Limite Disponível:** `R$ 4.000,00` (calculado dinamicamente sobre o limite de R$ 10.000,00!)
   - Barra de uso em **60% tomado**.
3. Clique em **Ver Faturas Mês a Mês** (ou na aba superior **Faturas Mês a Mês**):
   - Navegue pelos meses no carrossel (`Dez/2026`, `Jan/2027`, `Fev/2027`, `Mar/2027`...):
     - Em **Dez/2026**: está a parcela `1/6` do Notebook (`R$ 600,00`).
     - Em **Jan/2027**: estão a parcela `2/6` do Notebook (`R$ 600,00`) + parcela `1/4` da Passagem (`R$ 600,00`) = **Total da Fatura: R$ 1.200,00**.
4. **Teste de Pagamento de Fatura:**
   - Selecione a fatura de **Dez/2026** e clique no botão verde **Pagar / Liquidar Fatura**.
   - Escolha a `Conta Corrente Principal` e confirme.
   - **Resultado esperado:**
     - O status da fatura de Dez/2026 muda para **Paga / Realizada**.
     - O **Limite Disponível** do cartão sobe imediatamente de `R$ 4.000,00` para `R$ 4.600,00`!

---

## 6. Teste de Integração com o Orçamento 50/30/20, Metas e Dashboard
1. Vá em **Orçamento & Metas**:
   - Confira o painel **"Regra de Orçamento 50/30/20 & Integração com Fatura de Cartão"** no topo.
   - Veja quanto cada pilar (`50% Necessidades`, `30% Desejos`, `20% Metas`) consumiu no mês e quanto veio especificamente do Cartão de Crédito.
   - Clique em **+ Nova Meta**, crie a meta `Reserva de Emergência` com valor alvo `R$ 30.000,00` e teste o botão **+ Fazer Aporte Rápido**.
2. Vá em **Dashboard**:
   - Verifique os 5 KPIs principais no topo e a barra consolidada exibindo a **Fatura de Cartão Consolidada** do mês e o resumo **50/30/20**.

---

## 7. Teste de Contexto Corporativo (PJ) e Regra de Ouro (Pró-Labore PJ → PF)
1. Vá em **Neon DB & Config** → seção **Multiempresa & CNPJs Cadastrados**.
2. Cadastre uma empresa: `Minha Empresa Tech Ltda` (CNPJ `12.345.678/0001-99`).
3. O sistema mudará automaticamente para o **Modo Gestão Corporativa (PJ)** (totalmente isolado do PF).
4. Abra **+ Nova Transação (`N`)**, crie uma despesa de `R$ 8.000,00` com descrição `Pró-Labore Sócio`, marque a opção **"Operação Inter-Contexto (Pró-Labore / Distribuição de Lucros)"** e salve.
5. Troque o seletor no topo da tela de volta para **Meu Espaço Pessoal (PF)**:
   - Você verá que a receita espelhada `Pró-Labore Recebido (Minha Empresa Tech Ltda)` de `+R$ 8.000,00` foi criada automaticamente na sua conta pessoal!
